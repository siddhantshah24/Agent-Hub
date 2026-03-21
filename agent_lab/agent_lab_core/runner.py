"""
Runner: the core evaluation engine.

For each eval run:
  1. Computes a content hash of the src/ directory for auto-versioning.
  2. Snapshots ALL src/*.py files + writes structured snapshot.json.
  3. Dynamically loads the agent callable via importlib.
  4. Iterates the JSONL dataset, injecting a LangfuseCallbackHandler per invocation.
  5. Compares outputs to expected answers (exact + fuzzy numeric).
  6. Saves per-sample results and aggregated metrics to SQLite.
"""

import ast
import hashlib
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

from .db import init_db, insert_run, insert_samples, tag_exists, get_run_count
from .parser import EvalConfig

console = Console()


class _TokenCostTracker(BaseCallbackHandler):
    """
    Captures token usage from every LLM call in the chain and converts to USD cost.
    Works without any Langfuse API calls — runs fully locally.
    """
    _COSTS = {
        "gpt-4o-mini":   (0.150 / 1_000_000, 0.600 / 1_000_000),
        "gpt-4o":        (2.50  / 1_000_000, 10.0  / 1_000_000),
        "gpt-4-turbo":   (10.0  / 1_000_000, 30.0  / 1_000_000),
        "gpt-3.5-turbo": (0.50  / 1_000_000,  1.50 / 1_000_000),
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
            if not usage and hasattr(response, "generations"):
                for gen_list in response.generations:
                    for gen in gen_list:
                        gi = getattr(gen, "generation_info", None) or {}
                        usage = gi.get("usage", gi.get("token_usage", usage))
            prompt_tok = int(usage.get("prompt_tokens", usage.get("input_tokens", 0)))
            comp_tok   = int(usage.get("completion_tokens", usage.get("output_tokens", 0)))
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
# Content hash
# ---------------------------------------------------------------------------

def _compute_content_hash(src_dir: Path) -> str:
    """SHA-256 of all .py files in src/ (sorted by name). Returns first 8 hex chars."""
    h = hashlib.sha256()
    for f in sorted(src_dir.rglob("*.py")):
        h.update(f.name.encode())
        h.update(f.read_bytes())
    return h.hexdigest()[:8]


def _auto_generate_tag(db_path: Path, content_hash: str) -> str:
    n = get_run_count(db_path) + 1
    return f"run-{n:03d}-{content_hash}"


# ---------------------------------------------------------------------------
# AST extraction
# ---------------------------------------------------------------------------

def _extract_from_ast(source_path: Path) -> dict:
    """
    Parse graph.py with Python's AST to extract:
      - system_prompts: all module-level string assignments matching *prompt* or *system*
      - _active: which variable SYSTEM_PROMPT is assigned to (if it's an alias)
      - model: ChatOpenAI / ChatAnthropic kwargs found in the file
      - inline_tool_names: names of @tool-decorated functions
    """
    source = source_path.read_text(encoding="utf-8")
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return {}

    system_prompts: dict[str, str] = {}
    active_prompt_var: Optional[str] = None
    model_config: dict = {}
    inline_tool_names: set[str] = set()

    # Module-level assignments only
    for node in tree.body:
        # String constant assignments: SYSTEM_PROMPT_V1 = "..."
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if not isinstance(target, ast.Name):
                    continue
                name = target.id
                name_lower = name.lower()
                # Capture prompt/system string constants
                if ("prompt" in name_lower or "system" in name_lower):
                    if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                        system_prompts[name] = node.value.value
                    # Detect alias: SYSTEM_PROMPT = SYSTEM_PROMPT_V1
                    elif isinstance(node.value, ast.Name) and name == "SYSTEM_PROMPT":
                        active_prompt_var = node.value.id

    # Walk entire tree for LLM instantiation and @tool decorators
    for node in ast.walk(tree):
        # Find ChatOpenAI(...) / ChatAnthropic(...)
        if isinstance(node, ast.Call):
            func_name = ""
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                func_name = node.func.attr
            if any(x in func_name for x in ("ChatOpenAI", "ChatAnthropic", "AzureChatOpenAI")):
                if not model_config:  # take first occurrence
                    model_config["class"] = func_name
                    for kw in node.keywords:
                        if isinstance(kw.value, ast.Constant):
                            model_config[kw.arg] = kw.value.value

        # Find @tool decorated functions
        if isinstance(node, ast.FunctionDef):
            for decorator in node.decorator_list:
                dec_name = ""
                if isinstance(decorator, ast.Name):
                    dec_name = decorator.id
                elif isinstance(decorator, ast.Attribute):
                    dec_name = decorator.attr
                if dec_name == "tool":
                    inline_tool_names.add(node.name)

    return {
        "system_prompts": system_prompts,
        "_active_alias": active_prompt_var,
        "model": model_config,
        "inline_tool_names": list(inline_tool_names),
    }


# ---------------------------------------------------------------------------
# Runtime metadata extraction
# ---------------------------------------------------------------------------

def _is_tool_object(obj) -> bool:
    """Return True if obj looks like a LangChain tool (has .name and .description)."""
    return (
        hasattr(obj, "name") and hasattr(obj, "description")
        and isinstance(getattr(obj, "name", None), str)
        and callable(getattr(obj, "invoke", None) if hasattr(obj, "invoke") else getattr(obj, "run", None))
    )


def _extract_runtime_metadata(module, inline_tool_names: list[str]) -> list[dict]:
    """
    After the module is imported, extract tool metadata from live tool objects.

    Priority order:
    1. get_agent_metadata() hook on the module (explicit override)
    2. @tool-decorated functions accessible by name on the module (from AST inline_tool_names)
    3. Any module-level list/tuple of tool objects (any attribute name ending in TOOLS)
    4. Common fixed attribute names: SQL_TOOLS, tools, TOOLS, _TOOLS
    5. langchain-benchmarks _TASK registry → create_environment().tools
    """
    # 1. Explicit metadata hook takes priority
    if hasattr(module, "get_agent_metadata"):
        try:
            meta = module.get_agent_metadata()
            if isinstance(meta, dict) and "tools" in meta:
                return meta["tools"]
        except Exception:
            pass

    raw_tools: list = []

    # 2. Directly look up @tool-decorated functions by name found in AST
    if inline_tool_names:
        direct = []
        for name in inline_tool_names:
            obj = getattr(module, name, None)
            if obj is not None and _is_tool_object(obj):
                direct.append(obj)
        if direct:
            raw_tools = direct

    # 3. Broad scan: any module-level list whose name contains "TOOL" and holds tool objects
    if not raw_tools:
        for attr_name in dir(module):
            if "TOOL" not in attr_name.upper():
                continue
            val = getattr(module, attr_name, None)
            if isinstance(val, (list, tuple)) and val and _is_tool_object(val[0]):
                raw_tools = list(val)
                break

    # 4. Common fixed names
    if not raw_tools:
        for attr in ("SQL_TOOLS", "tools", "TOOLS", "_TOOLS"):
            val = getattr(module, attr, None)
            if isinstance(val, (list, tuple)) and val:
                raw_tools = list(val)
                break

    # 5. langchain-benchmarks _TASK fallback (for agents that still use the registry)
    if not raw_tools:
        task = getattr(module, "_TASK", None)
        if task is not None:
            try:
                env = task.create_environment()
                raw_tools = list(env.tools)
            except Exception:
                pass

    extracted: list[dict] = []
    seen: set[str] = set()
    for t in raw_tools:
        name = getattr(t, "name", str(t))
        if name in seen:
            continue
        seen.add(name)
        desc = getattr(t, "description", "")
        schema: dict = {}
        try:
            args_schema = getattr(t, "args_schema", None)
            if args_schema:
                schema = args_schema.schema() if callable(getattr(args_schema, "schema", None)) else {}
        except Exception:
            pass
        source = "inline" if name in inline_tool_names else "external"
        extracted.append({"name": name, "description": desc, "source": source, "schema": schema})

    return extracted


# ---------------------------------------------------------------------------
# Snapshot
# ---------------------------------------------------------------------------

def _snapshot_entrypoint(
    config: EvalConfig,
    tag: str,
    project_root: Path,
    content_hash: str,
    module=None,
) -> Optional[str]:
    """
    1. Copy all .py files from src/ into .agentlab/snapshots/<tag>/src/
    2. Extract metadata via AST + runtime module inspection
    3. Write snapshot.json
    Returns the snapshot directory path as a string (stored in DB).
    """
    module_path, _ = config.entrypoint.rsplit(":", 1)
    parts = module_path.split(".")
    src_dir = project_root.joinpath(*parts[:-1]) if len(parts) > 1 else project_root
    main_file = src_dir / (parts[-1] + ".py")

    if not main_file.exists():
        console.print(f"[yellow]Warning:[/] Could not snapshot {main_file} (file not found).")
        return None

    snapshot_dir = project_root / ".agentlab" / "snapshots" / tag
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    # Copy all Python files in src/
    copied_files: list[str] = []
    for py_file in sorted(src_dir.glob("*.py")):
        dest = snapshot_dir / py_file.name
        shutil.copy2(py_file, dest)
        copied_files.append(py_file.name)

    console.print(f"[dim]Snapshotted {len(copied_files)} file(s) → .agentlab/snapshots/{tag}/[/dim]")

    # AST extraction from main graph file
    ast_data = _extract_from_ast(main_file)
    system_prompts = ast_data.get("system_prompts", {})
    active_alias = ast_data.get("_active_alias")
    model_config = ast_data.get("model", {})
    inline_tool_names = ast_data.get("inline_tool_names", [])

    # Determine active prompt
    active_prompt_name = active_alias if active_alias and active_alias in system_prompts else None
    if not active_prompt_name and "SYSTEM_PROMPT" in system_prompts:
        active_prompt_name = "SYSTEM_PROMPT"
    if active_prompt_name:
        system_prompts["_active"] = active_prompt_name

    # Runtime tool extraction
    tools: list[dict] = []
    if module is not None:
        try:
            tools = _extract_runtime_metadata(module, inline_tool_names)
        except Exception:
            pass

    # Build and write snapshot.json
    snapshot_meta = {
        "tag": tag,
        "content_hash": content_hash,
        "files": copied_files,
        "system_prompts": system_prompts,
        "model": model_config,
        "tools": tools,
    }
    (snapshot_dir / "snapshot.json").write_text(
        json.dumps(snapshot_meta, indent=2, ensure_ascii=False)
    )

    return str(snapshot_dir)


def rollback_to_tag(tag: str, project_root: Path, db_path: Path) -> None:
    """
    Restore the agent source files from the snapshot for the given tag.
    Copies all .py files from .agentlab/snapshots/<tag>/ back to src/.
    """
    from .db import get_run_by_tag
    from .parser import parse_config

    run = get_run_by_tag(db_path, tag)
    if not run or not run.get("snapshot_path"):
        raise ValueError(f"No snapshot found for tag '{tag}'.")

    snapshot_dir = Path(run["snapshot_path"])
    if not snapshot_dir.exists():
        raise FileNotFoundError(f"Snapshot directory missing: {snapshot_dir}")

    config = parse_config(project_root / "agent-eval.yml")
    module_path, _ = config.entrypoint.rsplit(":", 1)
    parts = module_path.split(".")
    src_dir = project_root.joinpath(*parts[:-1]) if len(parts) > 1 else project_root
    src_dir.mkdir(parents=True, exist_ok=True)

    restored = []
    for py_file in sorted(snapshot_dir.glob("*.py")):
        dest = src_dir / py_file.name
        shutil.copy2(py_file, dest)
        restored.append(py_file.name)

    console.print(
        f"[green]Rolled back[/] {len(restored)} file(s) to {src_dir.relative_to(project_root)} "
        f"← snapshot/{tag}/"
    )


# ---------------------------------------------------------------------------
# Agent loading
# ---------------------------------------------------------------------------

def _load_agent(entrypoint: str, project_root: Path) -> tuple[Callable, object]:
    """
    Dynamically import the agent callable.
    Returns (callable, module) so the module can be inspected for metadata.
    """
    module_str, func_str = entrypoint.rsplit(":", 1)

    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    parts = module_str.split(".")
    if len(parts) > 1:
        module_dir = project_root.joinpath(*parts[:-1])
        if module_dir.exists() and str(module_dir) not in sys.path:
            sys.path.insert(0, str(module_dir))

    if module_str in sys.modules:
        del sys.modules[module_str]
    stale = [k for k in sys.modules if k.startswith(module_str.rsplit(".", 1)[0] + ".")]
    for k in stale:
        del sys.modules[k]

    module = importlib.import_module(module_str)
    fn = getattr(module, func_str)
    return fn, module


# ---------------------------------------------------------------------------
# Answer comparison
# ---------------------------------------------------------------------------

def _answers_match(got: str, expected: str) -> bool:
    got_clean = got.strip().lower()
    exp_clean = expected.strip().lower()
    if got_clean == exp_clean:
        return True
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
    tag: Optional[str],
    project_root: Path,
    db_path: Path,
    langfuse_public_key: str,
    langfuse_secret_key: str,
    langfuse_host: str = "http://localhost:3000",
    force: bool = False,
    limit: Optional[int] = None,
) -> dict:
    """
    Execute a full evaluation run.

    tag:   version label. If None, auto-generated as run-NNN-<hash>.
    force: if True, overwrite an existing tag. Otherwise raise on collision.
    limit: if set, only evaluate the first N samples (useful for quick smoke tests).
    """
    init_db(db_path)

    # --- Content hash & auto-tag ----------------------------------------
    module_path, _ = config.entrypoint.rsplit(":", 1)
    parts = module_path.split(".")
    src_dir = project_root.joinpath(*parts[:-1]) if len(parts) > 1 else project_root
    content_hash = _compute_content_hash(src_dir)

    if tag is None:
        tag = _auto_generate_tag(db_path, content_hash)
        console.print(f"[dim]Auto-generated tag: [bold]{tag}[/bold][/dim]")
    elif tag_exists(db_path, tag) and not force:
        raise ValueError(
            f"Tag '{tag}' already exists. Use --force to overwrite, "
            f"or choose a different tag."
        )

    # Warn if code is unchanged vs a previous run
    from .db import get_all_runs
    prev_runs = get_all_runs(db_path)
    prev_hashes = [r.get("content_hash") for r in prev_runs if r.get("content_hash")]
    if prev_hashes and content_hash in prev_hashes:
        prev_tag = next(r["version_tag"] for r in reversed(prev_runs) if r.get("content_hash") == content_hash)
        console.print(
            f"[yellow]⚠ Agent code unchanged[/] (same hash as [bold]{prev_tag}[/bold]). "
            "Results may be identical."
        )

    console.print(f"[dim]Content hash: {content_hash}[/dim]")

    # --- Load agent (get module for runtime metadata) --------------------
    agent_fn, module = _load_agent(config.entrypoint, project_root)

    # --- Snapshot (pass module for runtime tool extraction) -------------
    snapshot_path = _snapshot_entrypoint(config, tag, project_root, content_hash, module)

    # --- Langfuse callback ----------------------------------------------
    langfuse_handler = None
    try:
        from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
        langfuse_handler = LangfuseCallbackHandler()
    except ImportError:
        try:
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

    # --- Dataset & eval loop --------------------------------------------
    full_dataset = _load_jsonl(config.dataset_path)
    if limit is not None and limit > 0:
        dataset = full_dataset[:limit]
        console.print(f"[dim]--limit {limit}: running {limit} of {len(full_dataset)} samples[/dim]")
    else:
        dataset = full_dataset
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
                if isinstance(result, dict):
                    got = str(result.get("answer", result.get("output", result)))
                else:
                    got = str(result)
            except Exception as exc:
                got = f"ERROR: {exc}"
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

    # --- Flush Langfuse -------------------------------------------------
    if langfuse_handler:
        try:
            from langfuse import get_client
            get_client().flush()
        except Exception:
            try:
                langfuse_handler.flush()
            except Exception:
                pass

    # --- Aggregate metrics ----------------------------------------------
    passed_count = sum(1 for s in samples if s["passed"])
    success_rate = round(passed_count / total * 100, 2) if total else 0.0
    avg_latency  = round(sum(latencies) / total, 2) if total else 0.0
    total_cost   = cost_tracker.total_cost_usd
    avg_cost_usd = round(total_cost / total, 6) if total else 0.0

    console.print(
        f"[dim]Token usage — "
        f"prompt: {cost_tracker.total_prompt_tokens:,} · "
        f"completion: {cost_tracker.total_completion_tokens:,} · "
        f"total cost: ${total_cost:.4f}[/dim]"
    )

    # --- Save to SQLite -------------------------------------------------
    run_id = insert_run(
        db_path=db_path,
        version_tag=tag,
        success_rate=success_rate,
        avg_latency_ms=avg_latency,
        avg_cost_usd=avg_cost_usd,
        total_cases=total,
        snapshot_path=snapshot_path,
        content_hash=content_hash,
    )
    insert_samples(db_path, run_id, samples)

    # --- Summary table --------------------------------------------------
    table = Table(title=f"Eval Results — {tag}", show_header=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")
    table.add_row("Total Cases", str(total))
    table.add_row("Passed", f"[green]{passed_count}[/]")
    table.add_row("Failed", f"[red]{total - passed_count}[/]")
    table.add_row("Success Rate", f"[bold]{success_rate}%[/]")
    table.add_row("Avg Latency", f"{avg_latency} ms")
    table.add_row("Avg Cost", f"${avg_cost_usd:.6f}")
    table.add_row("Content Hash", content_hash)
    console.print(table)

    return {
        "tag": tag,
        "success_rate": success_rate,
        "avg_latency_ms": avg_latency,
        "avg_cost_usd": avg_cost_usd,
        "total_cases": total,
        "passed": passed_count,
        "content_hash": content_hash,
    }
