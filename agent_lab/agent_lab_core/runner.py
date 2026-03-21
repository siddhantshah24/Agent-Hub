"""
Runner: the core evaluation engine.

For each eval run:
  1. Snapshots the agent source file for rollback support.
  2. Dynamically loads the agent callable via importlib.
  3. Iterates the JSONL dataset, injecting a LangfuseCallbackHandler per invocation.
  4. Compares outputs to expected answers (exact + fuzzy numeric).
  5. Saves per-sample results and aggregated metrics to SQLite.
"""

import importlib
import json
import shutil
import sys
import time
from pathlib import Path
from typing import Callable, Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

from langchain_core.callbacks.base import BaseCallbackHandler

from .db import init_db, insert_run, insert_samples
from .parser import EvalConfig

console = Console()


class _TokenCostTracker(BaseCallbackHandler):
    """
    Captures token usage from every LLM call in the chain and converts to USD cost.
    Works without any Langfuse API calls — runs fully locally.

    Pricing (gpt-4o-mini, per token):
      Input:  $0.150 / 1M tokens
      Output: $0.600 / 1M tokens
    """
    _COSTS = {
        "gpt-4o-mini":           (0.150 / 1_000_000, 0.600 / 1_000_000),
        "gpt-4o":                (2.50  / 1_000_000, 10.0  / 1_000_000),
        "gpt-4-turbo":           (10.0  / 1_000_000, 30.0  / 1_000_000),
        "gpt-3.5-turbo":         (0.50  / 1_000_000,  1.50 / 1_000_000),
    }
    _DEFAULT_COST = (0.150 / 1_000_000, 0.600 / 1_000_000)

    def __init__(self):
        super().__init__()
        self.total_cost_usd = 0.0
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    def on_llm_end(self, response, **kwargs) -> None:
        try:
            model = ""
            if hasattr(response, "llm_output") and response.llm_output:
                usage = response.llm_output.get("token_usage", {})
                model = response.llm_output.get("model_name", "")
            else:
                usage = {}

            # Newer langchain versions embed usage in generation_info
            if not usage and hasattr(response, "generations"):
                for gen_list in response.generations:
                    for gen in gen_list:
                        gi = getattr(gen, "generation_info", None) or {}
                        usage = gi.get("usage", gi.get("token_usage", usage))

            prompt_tok = int(usage.get("prompt_tokens", usage.get("input_tokens", 0)))
            comp_tok   = int(usage.get("completion_tokens", usage.get("output_tokens", 0)))

            # Match model name prefix for pricing
            in_cost, out_cost = self._DEFAULT_COST
            for key, prices in self._COSTS.items():
                if key in model.lower():
                    in_cost, out_cost = prices
                    break

            self.total_prompt_tokens += prompt_tok
            self.total_completion_tokens += comp_tok
            self.total_cost_usd += prompt_tok * in_cost + comp_tok * out_cost
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Snapshot helpers
# ---------------------------------------------------------------------------

def _snapshot_entrypoint(config: EvalConfig, tag: str, project_root: Path) -> Optional[str]:
    """
    Copy the agent's source file to .agentlab/snapshots/<tag>/.
    Returns the snapshot path string, or None if the file can't be located.
    """
    module_path, _ = config.entrypoint.rsplit(":", 1)
    # Convert "src.graph" → "src/graph.py"
    rel_file = Path(*module_path.split(".")).with_suffix(".py")
    source_file = (project_root / rel_file).resolve()

    if not source_file.exists():
        console.print(f"[yellow]Warning:[/] Could not snapshot {source_file} (file not found).")
        return None

    snapshot_dir = project_root / ".agentlab" / "snapshots" / tag
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    dest = snapshot_dir / source_file.name
    shutil.copy2(source_file, dest)
    console.print(f"[dim]Snapshotted agent → {dest.relative_to(project_root)}[/dim]")
    return str(dest)


def rollback_to_tag(tag: str, project_root: Path, db_path: Path) -> None:
    """
    Restore the agent source file from the snapshot for the given tag.
    Called by the CLI `agentlab rollback --tag <tag>`.
    """
    from .db import get_run_by_tag

    run = get_run_by_tag(db_path, tag)
    if not run or not run.get("snapshot_path"):
        raise ValueError(f"No snapshot found for tag '{tag}'.")

    snapshot_file = Path(run["snapshot_path"])
    if not snapshot_file.exists():
        raise FileNotFoundError(f"Snapshot file missing: {snapshot_file}")

    # Determine original destination by re-deriving from the run's entrypoint.
    # We stored just the file; put it back relative to its name in the module path.
    # We need the config for this — look for agent-eval.yml in project_root.
    from .parser import parse_config
    config = parse_config(project_root / "agent-eval.yml")
    module_path, _ = config.entrypoint.rsplit(":", 1)
    rel_file = Path(*module_path.split(".")).with_suffix(".py")
    dest = (project_root / rel_file).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(snapshot_file, dest)
    console.print(f"[green]Rolled back[/] {dest.relative_to(project_root)} ← snapshot/{tag}/{snapshot_file.name}")


# ---------------------------------------------------------------------------
# Agent loading
# ---------------------------------------------------------------------------

def _load_agent(entrypoint: str, project_root: Path) -> Callable:
    """
    Dynamically import the agent callable.
    entrypoint format: "module.path:function_name"
    """
    module_str, func_str = entrypoint.rsplit(":", 1)

    # Add project root so "src.graph" resolves
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    # Also add the module's own directory (e.g. "src/") so that sibling files
    # like database.py can be imported with a plain `from database import ...`
    parts = module_str.split(".")
    if len(parts) > 1:
        module_dir = project_root.joinpath(*parts[:-1])
        if module_dir.exists() and str(module_dir) not in sys.path:
            sys.path.insert(0, str(module_dir))

    # Force a fresh load so stale cached modules don't mask file changes
    if module_str in sys.modules:
        del sys.modules[module_str]
    # Also evict sibling modules that may have been cached under the same package
    stale = [k for k in sys.modules if k.startswith(module_str.rsplit(".", 1)[0] + ".")]
    for k in stale:
        del sys.modules[k]

    module = importlib.import_module(module_str)
    fn = getattr(module, func_str)
    return fn


# ---------------------------------------------------------------------------
# Answer comparison
# ---------------------------------------------------------------------------

def _answers_match(got: str, expected: str) -> bool:
    """
    Exact string match (case-insensitive, stripped) OR numeric equality
    with a small tolerance for float answers.
    """
    got_clean = got.strip().lower()
    exp_clean = expected.strip().lower()
    if got_clean == exp_clean:
        return True
    # Try numeric fuzzy match
    try:
        return abs(float(got_clean) - float(exp_clean)) < 1e-6
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------------

def _load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


# ---------------------------------------------------------------------------
# Main run function
# ---------------------------------------------------------------------------

def run_evaluation(
    config: EvalConfig,
    tag: str,
    project_root: Path,
    db_path: Path,
    langfuse_public_key: str,
    langfuse_secret_key: str,
    langfuse_host: str = "http://localhost:3000",
) -> dict:
    """
    Execute a full evaluation run.
    Returns a summary dict with success_rate, avg_latency_ms, avg_cost_usd.
    """
    init_db(db_path)

    # 1. Snapshot the agent file
    snapshot_path = _snapshot_entrypoint(config, tag, project_root)

    # 2. Load the Langfuse callback
    # Langfuse v4 reads LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_HOST
    # from env vars automatically; the CallbackHandler no longer takes those as args.
    langfuse_handler = None
    try:
        # v4 import path
        from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
        langfuse_handler = LangfuseCallbackHandler()
    except ImportError:
        try:
            # fallback: pre-v3 import path
            from langfuse.callback import CallbackHandler as LangfuseCallbackHandler
            langfuse_handler = LangfuseCallbackHandler(
                public_key=langfuse_public_key,
                secret_key=langfuse_secret_key,
                host=langfuse_host,
                tags=[f"version:{tag}"],
                session_id=f"agentlab-eval-{tag}",
            )
        except Exception as e:
            console.print(f"[yellow]Warning:[/] Langfuse init failed ({e}). Running without tracing.")

    if langfuse_handler:
        console.print(f"[dim]Langfuse tracing active → {langfuse_host} (version:{tag})[/dim]")

    # 3. Load agent and dataset
    agent_fn = _load_agent(config.entrypoint, project_root)
    dataset = _load_jsonl(config.dataset_path)
    total = len(dataset)

    console.print(f"\n[bold cyan]Agent Lab[/] — evaluating [bold]{tag}[/] on {total} samples\n")

    samples: list[dict] = []
    latencies: list[float] = []
    cost_tracker = _TokenCostTracker()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task(f"Running {tag}...", total=total)

        for idx, row in enumerate(dataset):
            question = row[config.input_key]
            expected = str(row[config.expected_output_key])

            # Build invocation config: Langfuse tracing + local cost tracking
            callbacks = [cost_tracker]
            if langfuse_handler:
                callbacks.append(langfuse_handler)

            invoke_config: dict = {
                "callbacks": callbacks,
                "run_name": f"agentlab/{tag}/sample-{idx:03d}",
                "metadata": {
                    "agentlab_version": tag,
                    "agentlab_sample_idx": str(idx),
                },
            }

            t0 = time.perf_counter()
            try:
                result = agent_fn({"question": question}, invoke_config)
                # Expect the agent to return a dict with an "answer" key,
                # or fall back to str(result)
                if isinstance(result, dict):
                    got = str(result.get("answer", result.get("output", result)))
                else:
                    got = str(result)
            except Exception as exc:
                got = f"ERROR: {exc}"
                # Print first few errors so problems are visible
                if idx < 3:
                    import traceback
                    console.print(f"\n[red bold]Sample {idx} error:[/] {exc}")
                    console.print(f"[dim]{traceback.format_exc()}[/dim]")

            elapsed_ms = (time.perf_counter() - t0) * 1000
            passed = _answers_match(got, expected)
            latencies.append(elapsed_ms)

            samples.append({
                "sample_idx": idx,
                "input": question,
                "expected": expected,
                "got": got,
                "passed": passed,
                "latency_ms": round(elapsed_ms, 2),
            })

            status = "[green]✓[/]" if passed else "[red]✗[/]"
            progress.update(task, advance=1, description=f"{status} [{idx+1}/{total}] {question[:50]}")

    # 4. Flush Langfuse traces
    if langfuse_handler:
        try:
            # v4: flush via the global client
            from langfuse import get_client
            get_client().flush()
        except Exception:
            try:
                langfuse_handler.flush()
            except Exception:
                pass

    # 5. Aggregate metrics
    passed_count = sum(1 for s in samples if s["passed"])
    success_rate = round(passed_count / total * 100, 2) if total else 0.0
    avg_latency = round(sum(latencies) / total, 2) if total else 0.0

    # Cost: computed locally from token usage captured during the run
    total_cost = cost_tracker.total_cost_usd
    avg_cost_usd = round(total_cost / total, 6) if total else 0.0
    console.print(
        f"[dim]Token usage — "
        f"prompt: {cost_tracker.total_prompt_tokens:,} · "
        f"completion: {cost_tracker.total_completion_tokens:,} · "
        f"total cost: ${total_cost:.4f}[/dim]"
    )

    # 6. Save to SQLite
    run_id = insert_run(
        db_path=db_path,
        version_tag=tag,
        success_rate=success_rate,
        avg_latency_ms=avg_latency,
        avg_cost_usd=avg_cost_usd,
        total_cases=total,
        snapshot_path=snapshot_path,
    )
    insert_samples(db_path, run_id, samples)

    # 7. Print summary table
    table = Table(title=f"Eval Results — {tag}", show_header=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")
    table.add_row("Total Cases", str(total))
    table.add_row("Passed", f"[green]{passed_count}[/]")
    table.add_row("Failed", f"[red]{total - passed_count}[/]")
    table.add_row("Success Rate", f"[bold]{success_rate}%[/]")
    table.add_row("Avg Latency", f"{avg_latency} ms")
    table.add_row("Avg Cost", f"${avg_cost_usd:.6f}")
    console.print(table)

    return {
        "tag": tag,
        "success_rate": success_rate,
        "avg_latency_ms": avg_latency,
        "avg_cost_usd": avg_cost_usd,
        "total_cases": total,
        "passed": passed_count,
    }
