"""
FastAPI backend — the bridge between SQLite/Langfuse and the Next.js dashboard.

Endpoints:
  GET /api/versions                → all run history from SQLite
  GET /api/samples/{tag}           → per-sample results for a version
  GET /api/diff/{v1}/{v2}          → metric deltas + LLM behavioral summary
  GET /api/snapshot-diff/{v1}/{v2} → line-by-line code diff of agent snapshots
  GET /api/samples-compare/{v1}/{v2} → merged sample table for both versions
"""

import difflib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

from .db import get_all_runs, get_run_by_tag, get_samples_for_tag

app = FastAPI(title="Agent Lab API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _db_path() -> Path:
    env_path = os.environ.get("AGENTLAB_DB")
    if env_path:
        return Path(env_path)
    return Path.cwd() / ".agentlab.db"


def _openai_client() -> OpenAI:
    return OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/versions")
def get_versions():
    db = _db_path()
    if not db.exists():
        return []
    return get_all_runs(db)


@app.get("/api/samples/{tag}")
def get_samples(tag: str):
    db = _db_path()
    if not db.exists():
        raise HTTPException(404, "No database found.")
    samples = get_samples_for_tag(db, tag)
    if not samples:
        raise HTTPException(404, f"No samples found for tag '{tag}'.")
    return samples


@app.get("/api/diff/{v1}/{v2}")
def get_diff(v1: str, v2: str):
    """Metric deltas + sample regressions + GPT-4o-mini behavioral summary."""
    db = _db_path()
    if not db.exists():
        raise HTTPException(404, "No database found.")

    run1 = get_run_by_tag(db, v1)
    run2 = get_run_by_tag(db, v2)
    if not run1:
        raise HTTPException(404, f"Version '{v1}' not found.")
    if not run2:
        raise HTTPException(404, f"Version '{v2}' not found.")

    deltas = {
        "success_rate": round(run2["success_rate"] - run1["success_rate"], 2),
        "avg_latency_ms": round(run2["avg_latency_ms"] - run1["avg_latency_ms"], 2),
        "avg_cost_usd": round(run2["avg_cost_usd"] - run1["avg_cost_usd"], 6),
    }

    samples1 = {s["sample_idx"]: s for s in get_samples_for_tag(db, v1)}
    samples2 = {s["sample_idx"]: s for s in get_samples_for_tag(db, v2)}

    regressions: list[dict] = []
    improvements: list[dict] = []

    for idx in set(samples1) | set(samples2):
        s1 = samples1.get(idx)
        s2 = samples2.get(idx)
        if s1 and s2:
            p1, p2 = bool(s1["passed"]), bool(s2["passed"])
            if p1 and not p2:
                regressions.append({
                    "sample_idx": idx,
                    "input": s1["input"],
                    "expected": s1["expected"],
                    f"{v1}_got": s1["got"],
                    f"{v2}_got": s2["got"],
                    "flip": "pass→fail",
                })
            elif not p1 and p2:
                improvements.append({
                    "sample_idx": idx,
                    "input": s1["input"],
                    "expected": s1["expected"],
                    f"{v1}_got": s1["got"],
                    f"{v2}_got": s2["got"],
                    "flip": "fail→pass",
                })

    llm_summary = _generate_summary(v1, v2, run1, run2, deltas, regressions, improvements)

    return {
        "v1": run1,
        "v2": run2,
        "deltas": deltas,
        "regressions": regressions,
        "improvements": improvements,
        "llm_summary": llm_summary,
    }


@app.get("/api/snapshot-diff/{v1}/{v2}")
def get_snapshot_diff(v1: str, v2: str):
    """
    Line-by-line code diff of the agent snapshot files for two versions.
    Snapshots are captured automatically by the runner at eval time.
    """
    db = _db_path()
    run1 = get_run_by_tag(db, v1)
    run2 = get_run_by_tag(db, v2)

    if not run1:
        raise HTTPException(404, f"Version '{v1}' not found.")
    if not run2:
        raise HTTPException(404, f"Version '{v2}' not found.")

    def _read(path: Optional[str]) -> Optional[str]:
        if path and Path(path).exists():
            return Path(path).read_text()
        return None

    v1_content = _read(run1.get("snapshot_path"))
    v2_content = _read(run2.get("snapshot_path"))

    if not v1_content and not v2_content:
        return {
            "available": False,
            "reason": "No snapshot files found. Snapshots are captured during `agentlab eval`.",
        }

    v1_lines = (v1_content or "").splitlines()
    v2_lines = (v2_content or "").splitlines()

    matcher = difflib.SequenceMatcher(None, v1_lines, v2_lines)
    diff_lines: list[dict] = []

    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            for i, j in zip(range(i1, i2), range(j1, j2)):
                diff_lines.append({"type": "equal", "content": v1_lines[i], "v1_no": i + 1, "v2_no": j + 1})
        if op in ("replace", "delete"):
            for i in range(i1, i2):
                diff_lines.append({"type": "delete", "content": v1_lines[i], "v1_no": i + 1, "v2_no": None})
        if op in ("replace", "insert"):
            for j in range(j1, j2):
                diff_lines.append({"type": "insert", "content": v2_lines[j], "v1_no": None, "v2_no": j + 1})

    added = sum(1 for l in diff_lines if l["type"] == "insert")
    removed = sum(1 for l in diff_lines if l["type"] == "delete")

    return {
        "available": True,
        "v1_path": run1.get("snapshot_path"),
        "v2_path": run2.get("snapshot_path"),
        "filename": Path(run1.get("snapshot_path", "graph.py")).name,
        "diff_lines": diff_lines,
        "stats": {
            "added": added,
            "removed": removed,
            "unchanged": sum(1 for l in diff_lines if l["type"] == "equal"),
            "has_changes": added > 0 or removed > 0,
        },
    }


@app.get("/api/samples-compare/{v1}/{v2}")
def get_samples_compare(v1: str, v2: str):
    """Full side-by-side sample table for both versions."""
    db = _db_path()
    samples1 = {s["sample_idx"]: s for s in get_samples_for_tag(db, v1)}
    samples2 = {s["sample_idx"]: s for s in get_samples_for_tag(db, v2)}

    all_idx = sorted(set(samples1) | set(samples2))
    rows = []
    for idx in all_idx:
        s1 = samples1.get(idx, {})
        s2 = samples2.get(idx, {})
        rows.append({
            "sample_idx": idx,
            "input": s1.get("input") or s2.get("input", ""),
            "expected": s1.get("expected") or s2.get("expected", ""),
            f"{v1}_got": s1.get("got", "—"),
            f"{v1}_passed": bool(s1.get("passed")),
            f"{v1}_latency_ms": s1.get("latency_ms"),
            f"{v2}_got": s2.get("got", "—"),
            f"{v2}_passed": bool(s2.get("passed")),
            f"{v2}_latency_ms": s2.get("latency_ms"),
            "flipped": (bool(s1.get("passed")) != bool(s2.get("passed"))) if s1 and s2 else False,
        })
    return rows


def _generate_summary(v1, v2, run1, run2, deltas, regressions, improvements) -> str:
    try:
        client = _openai_client()
        reg_lines = "\n".join(
            f"  - Q: {r['input']!r}  expected: {r['expected']!r}  "
            f"{v1}→{r.get(v1+'_got','?')!r}  {v2}→{r.get(v2+'_got','?')!r}"
            for r in regressions[:5]
        ) or "  None"
        imp_lines = "\n".join(
            f"  - Q: {r['input']!r}  expected: {r['expected']!r}  "
            f"{v1}→{r.get(v1+'_got','?')!r}  {v2}→{r.get(v2+'_got','?')!r}"
            for r in improvements[:5]
        ) or "  None"

        prompt = f"""You are an AI/MLOps analyst reviewing two versions of a LangGraph agent.
Version comparison: {v1} → {v2}

Metrics:
  Success rate: {run1['success_rate']}% → {run2['success_rate']}% (Δ {deltas['success_rate']:+.2f}%)
  Avg latency:  {run1['avg_latency_ms']} ms → {run2['avg_latency_ms']} ms (Δ {deltas['avg_latency_ms']:+.2f} ms)
  Avg cost:     ${run1['avg_cost_usd']:.6f} → ${run2['avg_cost_usd']:.6f}

Regressions (pass→fail in {v2}):
{reg_lines}

Improvements (fail→pass in {v2}):
{imp_lines}

Write 2-3 concise sentences analyzing what behaviorally changed. Be specific and actionable."""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"LLM summary unavailable: {e}"


@app.get("/api/traces/{tag}")
def get_traces_for_tag(tag: str, count: int = 20):
    """
    Fetch full Langfuse trace data for every sample of a version tag.
    Uses lf.api.trace.get() to retrieve GENERATION + TOOL observations.
    Returns: system_prompt, ordered tool_calls, llm_steps, latency, cost, Langfuse URL.
    """
    # Load .env from cwd or parent so Langfuse keys are available when server is called
    from dotenv import load_dotenv
    load_dotenv(find_dotenv(usecwd=True), override=False)

    try:
        from langfuse import get_client
        lf = get_client()
    except Exception as e:
        return {"error": str(e), "traces": [], "tag": tag}

    # Collect trace stubs (name → trace) by paging through the trace list
    trace_map: dict[int, object] = {}
    page = 1
    while len(trace_map) < count:
        try:
            resp = lf.api.trace.list(limit=100, page=page)
        except Exception as e:
            return {"error": f"trace.list failed: {e}", "traces": [], "tag": tag}

        if not getattr(resp, "data", None):
            break

        prefix = f"agentlab/{tag}/sample-"
        for t in resp.data:
            if t.name and t.name.startswith(prefix):
                try:
                    idx = int(t.name.rsplit("-", 1)[-1])
                    if idx not in trace_map:
                        trace_map[idx] = t
                except ValueError:
                    pass

        if len(resp.data) < 100:
            break
        page += 1

    langfuse_host = os.environ.get("LANGFUSE_HOST", "http://localhost:3000")
    results: list[dict] = []

    for idx in range(count):
        stub = trace_map.get(idx)
        if stub is None:
            results.append({"sample_idx": idx, "found": False})
            continue

        try:
            full = lf.api.trace.get(stub.id)
        except Exception as e:
            results.append({"sample_idx": idx, "found": False, "error": str(e)})
            continue

        system_prompt: Optional[str] = None
        tool_calls: list[dict] = []
        llm_steps: list[dict] = []
        # Full interleaved execution chain: alternating LLM and TOOL steps
        execution_chain: list[dict] = []

        obs_sorted = sorted(
            full.observations or [],
            key=lambda o: getattr(o, "start_time", None) or datetime.min,
        )

        for obs in obs_sorted:
            obs_type = str(getattr(obs, "type", ""))
            obs_name = getattr(obs, "name", "") or ""
            obs_input = getattr(obs, "input", None)
            obs_output = getattr(obs, "output", None)

            if obs_type == "GENERATION":
                messages = obs_input if isinstance(obs_input, list) else []
                for msg in messages:
                    if isinstance(msg, dict) and msg.get("role") == "system" and not system_prompt:
                        system_prompt = msg.get("content", "")

                # Requested tool calls from this LLM turn
                requested_tools: list[dict] = []
                final_content = ""
                if isinstance(obs_output, dict):
                    for tc in obs_output.get("tool_calls", []):
                        name = tc.get("name", "?")
                        args = tc.get("args", {})
                        args_str = ", ".join(f"{k}={repr(v)}" for k, v in args.items())
                        requested_tools.append({"name": name, "args": args, "display": f"{name}({args_str})"})
                    final_content = obs_output.get("content", "")

                # Add to chain
                chain_entry: dict = {
                    "type": "llm",
                    "model": getattr(obs, "model", ""),
                    "tools_requested": requested_tools,
                    "content": final_content,
                    "is_final": len(requested_tools) == 0 and bool(final_content),
                }
                execution_chain.append(chain_entry)

                # Legacy flat lists for backward compat
                tool_names = [t["display"] for t in requested_tools]
                llm_steps.append({
                    "model": getattr(obs, "model", ""),
                    "tools_called": tool_names,
                    "response": final_content,
                })

            elif obs_type == "TOOL":
                # Unwrap LangChain ToolMessage kwargs for the output
                out_text = ""
                if isinstance(obs_output, dict):
                    out_text = obs_output.get("kwargs", {}).get("content",
                               json.dumps(obs_output, default=str)[:300])
                elif obs_output is not None:
                    out_text = str(obs_output)[:300]

                in_text = json.dumps(obs_input, default=str) if obs_input else "{}"

                execution_chain.append({
                    "type": "tool",
                    "name": obs_name,
                    "input": in_text,
                    "output": out_text,
                })
                tool_calls.append({"name": obs_name, "input": in_text, "output": out_text})

        results.append({
            "sample_idx": idx,
            "found": True,
            "trace_id": full.id,
            "system_prompt": system_prompt,
            "tool_calls": tool_calls,
            "llm_steps": llm_steps,
            "execution_chain": execution_chain,
            "latency_s": getattr(full, "latency", None),
            "total_cost": getattr(full, "total_cost", None),
            "langfuse_url": f"{langfuse_host}/trace/{full.id}",
        })

    return {"traces": results, "tag": tag, "found": len(trace_map)}


def find_dotenv(usecwd=False):
    """Simple .env locator — checks cwd then parents."""
    from pathlib import Path
    start = Path.cwd() if usecwd else Path(__file__).parent
    for parent in [start, *start.parents]:
        candidate = parent / ".env"
        if candidate.exists():
            return str(candidate)
    return ""


@app.get("/health")
def health():
    return {"status": "ok"}
