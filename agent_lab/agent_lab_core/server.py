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
from pydantic import BaseModel
from groq import Groq
from openai import OpenAI

from .db import (
    get_all_runs, get_run_by_tag, get_samples_for_tag, update_run_notes,
    upsert_feedback, get_feedback_for_run, get_all_feedback_for_export,
    init_db,
)

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


def _get_all_dbs() -> dict[str, Path]:
    """Discover all project DBs under AGENTLAB_PROJECTS_ROOT."""
    projects_root = os.environ.get("AGENTLAB_PROJECTS_ROOT")
    if projects_root:
        root = Path(projects_root)
        dbs: dict[str, Path] = {}
        for db in sorted(root.glob("*/.agentlab.db")):
            name = db.parent.name
            dbs[name] = db
        if dbs:
            return dbs
    # Single-project fallback
    db = _db_path()
    return {"default": db}


def _db_for_project(project: Optional[str]) -> Path:
    if not project or project == "default":
        db = _db_path()
    else:
        all_dbs = _get_all_dbs()
        db = all_dbs.get(project, _db_path())
    # Always ensure schema is up-to-date (idempotent — safe to call on every request)
    if db.exists():
        init_db(db)
    return db


def _groq_client() -> Groq:
    return Groq(api_key=os.environ.get("GROQ_API_KEY", ""))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/projects")
def get_projects():
    """List all available projects/agents discovered from AGENTLAB_PROJECTS_ROOT."""
    all_dbs = _get_all_dbs()
    result = []
    for name, db_path in all_dbs.items():
        runs = get_all_runs(db_path) if db_path.exists() else []
        # Turn "01_math_multiverse" → "Math Multiverse"
        parts = name.split("_", 1)
        display = parts[-1].replace("_", " ").title() if len(parts) > 1 else name.replace("_", " ").title()
        result.append({
            "name": name,
            "display_name": display,
            "run_count": len(runs),
            "latest_success_rate": runs[-1]["success_rate"] if runs else None,
        })
    return result


@app.get("/api/versions")
def get_versions(project: Optional[str] = None):
    db = _db_for_project(project)
    if not db.exists():
        return []
    return get_all_runs(db)


@app.get("/api/samples/{tag}")
def get_samples(tag: str, project: Optional[str] = None):
    db = _db_for_project(project)
    if not db.exists():
        raise HTTPException(404, "No database found.")
    samples = get_samples_for_tag(db, tag)
    if not samples:
        raise HTTPException(404, f"No samples found for tag '{tag}'.")
    return samples


class NotesUpdate(BaseModel):
    notes: str


@app.patch("/api/runs/{tag}/notes")
def patch_run_notes(tag: str, body: NotesUpdate, project: Optional[str] = None):
    """Update the human-readable notes for a run."""
    db = _db_for_project(project)
    if not db.exists():
        raise HTTPException(404, "No database found.")
    updated = update_run_notes(db, tag, body.notes)
    if not updated:
        raise HTTPException(404, f"Version '{tag}' not found.")
    return {"tag": tag, "notes": body.notes, "updated": True}


@app.get("/api/snapshot/{tag}")
def get_snapshot(tag: str, project: Optional[str] = None):
    """
    Return structured snapshot data for a single version.
    Includes:
      - metadata from snapshot.json (system_prompts, model, tools)
      - raw source code of the main graph file (for Code tab)
      - list of all snapshotted files
    """
    db = _db_for_project(project)
    run = get_run_by_tag(db, tag)
    if not run:
        raise HTTPException(404, f"Version '{tag}' not found.")

    snapshot_path = run.get("snapshot_path")
    if not snapshot_path:
        return {"available": False, "reason": "No snapshot captured for this version."}

    snap_dir = Path(snapshot_path)

    # Support old single-file snapshots (snapshot_path pointed to graph.py)
    if snap_dir.suffix == ".py":
        snap_dir = snap_dir.parent

    if not snap_dir.exists():
        return {"available": False, "reason": "Snapshot directory not found on disk."}

    # Read structured metadata
    meta: dict = {}
    meta_file = snap_dir / "snapshot.json"
    if meta_file.exists():
        try:
            meta = json.loads(meta_file.read_text())
        except Exception:
            pass

    # Raw source: prefer graph.py, fall back to first .py file
    raw_content: Optional[str] = None
    raw_filename: Optional[str] = None
    for candidate in ["graph.py", "agent.py"]:
        f = snap_dir / candidate
        if f.exists():
            raw_content = f.read_text()
            raw_filename = candidate
            break
    if raw_content is None:
        py_files = sorted(snap_dir.glob("*.py"))
        if py_files:
            raw_content = py_files[0].read_text()
            raw_filename = py_files[0].name

    all_files = [f.name for f in sorted(snap_dir.glob("*.py"))]

    return {
        "available": True,
        "tag": tag,
        "filename": raw_filename,
        "content": raw_content,
        "files": all_files,
        # Structured fields from snapshot.json
        "system_prompts": meta.get("system_prompts", {}),
        "model": meta.get("model", {}),
        "tools": meta.get("tools", []),
        "content_hash": meta.get("content_hash") or run.get("content_hash"),
    }


@app.get("/api/diff/{v1}/{v2}")
def get_diff(v1: str, v2: str, project: Optional[str] = None):
    """Metric deltas + sample regressions + GPT-4o-mini behavioral summary."""
    db = _db_for_project(project)
    if not db.exists():
        raise HTTPException(404, "No database found.")

    run1 = get_run_by_tag(db, v1)
    run2 = get_run_by_tag(db, v2)
    if not run1:
        raise HTTPException(404, f"Version '{v1}' not found.")
    if not run2:
        raise HTTPException(404, f"Version '{v2}' not found.")

    def _delta(key: str, decimals: int = 2) -> Optional[float]:
        v1_val = run1.get(key)
        v2_val = run2.get(key)
        if v1_val is not None and v2_val is not None:
            return round(v2_val - v1_val, decimals)
        return None

    deltas = {
        "success_rate": round(run2["success_rate"] - run1["success_rate"], 2),
        "avg_latency_ms": round(run2["avg_latency_ms"] - run1["avg_latency_ms"], 2),
        "avg_cost_usd": round(run2["avg_cost_usd"] - run1["avg_cost_usd"], 6),
        "avg_ragas_faithfulness": _delta("avg_ragas_faithfulness", 4),
        "avg_ragas_relevancy":    _delta("avg_ragas_relevancy", 4),
        "avg_ragas_precision":    _delta("avg_ragas_precision", 4),
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
def get_snapshot_diff(v1: str, v2: str, project: Optional[str] = None):
    """
    Line-by-line code diff of the agent snapshot files for two versions.
    Handles both old (single .py file) and new (directory + snapshot.json) formats.
    """
    db = _db_for_project(project)
    run1 = get_run_by_tag(db, v1)
    run2 = get_run_by_tag(db, v2)

    if not run1:
        raise HTTPException(404, f"Version '{v1}' not found.")
    if not run2:
        raise HTTPException(404, f"Version '{v2}' not found.")

    def _read_snapshot_content(raw_path: Optional[str]) -> tuple[Optional[str], str]:
        """
        Returns (content, filename).
        Handles:
          - old format: snapshot_path points to a .py file
          - new format: snapshot_path points to a directory containing graph.py
        """
        if not raw_path:
            return None, "graph.py"
        p = Path(raw_path)
        if not p.exists():
            return None, "graph.py"
        if p.is_file():
            return p.read_text(), p.name
        if p.is_dir():
            # New format — prefer graph.py, fall back to first .py file
            for candidate in ["graph.py", "agent.py"]:
                f = p / candidate
                if f.exists():
                    return f.read_text(), candidate
            py_files = sorted(p.glob("*.py"))
            if py_files:
                return py_files[0].read_text(), py_files[0].name
        return None, "graph.py"

    v1_content, v1_filename = _read_snapshot_content(run1.get("snapshot_path"))
    v2_content, v2_filename = _read_snapshot_content(run2.get("snapshot_path"))
    filename = v1_filename or v2_filename or "graph.py"

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

    added   = sum(1 for ln in diff_lines if ln["type"] == "insert")
    removed = sum(1 for ln in diff_lines if ln["type"] == "delete")

    return {
        "available": True,
        "v1_path": run1.get("snapshot_path"),
        "v2_path": run2.get("snapshot_path"),
        "filename": filename,
        "diff_lines": diff_lines,
        "stats": {
            "added": added,
            "removed": removed,
            "unchanged": sum(1 for ln in diff_lines if ln["type"] == "equal"),
            "has_changes": added > 0 or removed > 0,
        },
    }


@app.get("/api/samples-compare/{v1}/{v2}")
def get_samples_compare(v1: str, v2: str, project: Optional[str] = None):
    """Full side-by-side sample table for both versions."""
    db = _db_for_project(project)
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
        client = _groq_client()
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
            model="llama-3.3-70b-versatile",
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
    Returns gracefully if Langfuse is not reachable (does not 500 or hang).
    """
    # Load .env from cwd or parent so Langfuse keys are available when server is called
    from dotenv import load_dotenv
    load_dotenv(find_dotenv(usecwd=True), override=False)

    try:
        from langfuse import get_client
        lf = get_client()
    except Exception as e:
        return {"traces": [], "tag": tag, "langfuse_available": False, "error": str(e)}

    # Collect trace stubs (name → trace) by paging through the trace list
    trace_map: dict[int, object] = {}
    page = 1
    while len(trace_map) < count:
        try:
            resp = lf.api.trace.list(limit=100, page=page)
        except Exception as e:
            # Langfuse is running but trace list failed — still return gracefully
            return {"traces": [], "tag": tag, "langfuse_available": False, "error": f"trace.list failed: {e}"}

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


# ---------------------------------------------------------------------------
# Feedback endpoints
# ---------------------------------------------------------------------------

class FeedbackBody(BaseModel):
    tag: str
    sample_idx: int
    score: int          # +1 or -1
    comment: str = ""
    project: Optional[str] = None


@app.post("/api/feedback")
def post_feedback(body: FeedbackBody):
    """Save (or update) human feedback for a single sample."""
    db = _db_for_project(body.project)
    if not db.exists():
        raise HTTPException(404, "No database found.")
    run = get_run_by_tag(db, body.tag)
    if not run:
        raise HTTPException(404, f"Version '{body.tag}' not found.")
    if body.score not in (1, -1):
        raise HTTPException(400, "score must be +1 or -1.")
    upsert_feedback(db, run["id"], body.sample_idx, body.score, body.comment)
    return {"ok": True, "tag": body.tag, "sample_idx": body.sample_idx, "score": body.score}


@app.get("/api/feedback/{tag}")
def get_feedback(tag: str, project: Optional[str] = None):
    """Return all human feedback for a run."""
    db = _db_for_project(project)
    run = get_run_by_tag(db, tag)
    if not run:
        raise HTTPException(404, f"Version '{tag}' not found.")
    return get_feedback_for_run(db, run["id"])


# ---------------------------------------------------------------------------
# LLM suggestion engine
# ---------------------------------------------------------------------------

@app.post("/api/suggest/{tag}")
def suggest_improvements(tag: str, project: Optional[str] = None):
    """
    Given the current agent snapshot + eval results + human feedback,
    ask GPT-4o-mini to suggest concrete improvements.
    """
    db = _db_for_project(project)
    run = get_run_by_tag(db, tag)
    if not run:
        raise HTTPException(404, f"Version '{tag}' not found.")

    # Load snapshot metadata
    snap_meta: dict = {}
    snap_path = run.get("snapshot_path")
    if snap_path:
        snap_dir = Path(snap_path)
        if snap_dir.suffix == ".py":
            snap_dir = snap_dir.parent
        meta_file = snap_dir / "snapshot.json"
        if meta_file.exists():
            try:
                snap_meta = json.loads(meta_file.read_text())
            except Exception:
                pass

    system_prompts = snap_meta.get("system_prompts", {})
    active_prompt_key = system_prompts.get("_active", "")
    active_prompt = system_prompts.get(active_prompt_key, "")
    if not active_prompt:
        # fallback: first non-_active key
        active_prompt = next((v for k, v in system_prompts.items() if not k.startswith("_")), "")

    model_cfg = snap_meta.get("model", {})
    tools = snap_meta.get("tools", [])

    # Load samples + feedback
    samples = get_samples_for_tag(db, tag)
    feedback_rows = get_feedback_for_run(db, run["id"])
    fb_by_idx = {f["sample_idx"]: f for f in feedback_rows}

    total = len(samples)
    passed = sum(1 for s in samples if s["passed"])

    # Build sample summary (cap at 30 for prompt length)
    sample_lines = []
    for s in samples[:30]:
        fb = fb_by_idx.get(s["sample_idx"])
        fb_str = ""
        if fb:
            icon = "👍" if fb["score"] == 1 else "👎"
            fb_str = f" | Human: {icon}"
            if fb.get("comment"):
                fb_str += f' "{fb["comment"]}"'
        status = "PASS" if s["passed"] else "FAIL"
        sample_lines.append(
            f"  [{status}] Sample {s['sample_idx']}: Q=\"{s['input'][:80]}\" → Got=\"{s['got'][:60]}\"{fb_str}"
        )

    tool_summary = ", ".join(f"{t['name']} ({t['description'][:60]})" for t in tools[:10]) or "none"
    model_str = f"{model_cfg.get('class', 'ChatOpenAI')} model={model_cfg.get('model', 'unknown')}, temperature={model_cfg.get('temperature', 0)}"

    prompt_text = f"""You are an expert AI agent improvement assistant. Analyze the agent evaluation results and suggest specific, actionable improvements.

CURRENT AGENT CONFIG:
System prompt: {active_prompt[:600] or '(not captured)'}

Model: {model_str}
Tools: {tool_summary}

EVALUATION RESULTS ({total} samples, {passed}/{total} passed = {round(passed/total*100) if total else 0}%):
{chr(10).join(sample_lines)}

Human feedback: {sum(1 for f in feedback_rows if f['score']==1)} thumbs up, {sum(1 for f in feedback_rows if f['score']==-1)} thumbs down

Based on the failing samples and human feedback, suggest up to 4 specific improvements. For EACH suggestion return a JSON object with exactly these fields:
- "type": one of "system_prompt", "model_config", "tool_config"
- "reason": 1-2 sentences explaining why (reference specific sample numbers if possible)
- "current_value": the current value as a string
- "suggested_value": the new proposed value as a string

Return ONLY a JSON array of suggestion objects, no other text."""

    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt_text}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        # Accept both {"suggestions": [...]} and [...]
        suggestions = parsed if isinstance(parsed, list) else parsed.get("suggestions", [])
    except Exception as e:
        raise HTTPException(500, f"LLM suggestion failed: {e}")

    return {"tag": tag, "suggestions": suggestions}


# ---------------------------------------------------------------------------
# Apply suggestion — patches graph.py in-place
# ---------------------------------------------------------------------------

class ApplySuggestionBody(BaseModel):
    type: str           # "system_prompt" | "model_config"
    suggested_value: str
    project: Optional[str] = None


@app.post("/api/apply-suggestion/{tag}")
def apply_suggestion(tag: str, body: ApplySuggestionBody):
    """
    Apply a suggested change directly to the live graph.py.
    Only system_prompt and model_config types are auto-applied.
    tool_config returns instructions instead.
    """
    db = _db_for_project(body.project)
    run = get_run_by_tag(db, tag)
    if not run:
        raise HTTPException(404, f"Version '{tag}' not found.")

    if body.type == "tool_config":
        return {
            "applied": False,
            "message": "Tool config changes require manual editing of graph.py. "
                       "The suggested value has been shown above — please copy it into the relevant @tool function.",
        }

    # Find graph.py in the project root (walk up from snapshot path)
    snap_path = run.get("snapshot_path")
    if not snap_path:
        raise HTTPException(400, "No snapshot path recorded — cannot locate graph.py.")

    snap_dir = Path(snap_path)
    if snap_dir.suffix == ".py":
        snap_dir = snap_dir.parent

    # Project root is typically .agentlab/snapshots/<tag> → project_root is 3 levels up
    project_root = snap_dir.parent.parent.parent
    graph_file = project_root / "src" / "graph.py"
    if not graph_file.exists():
        # Try agent.py fallback
        graph_file = project_root / "src" / "agent.py"
    if not graph_file.exists():
        raise HTTPException(400, f"Could not locate src/graph.py under {project_root}")

    source = graph_file.read_text(encoding="utf-8")
    new_value = body.suggested_value

    if body.type == "system_prompt":
        import re
        # Find the active SYSTEM_PROMPT string assignment (handle triple-quoted and single-quoted)
        # Pattern: SYSTEM_PROMPT = "..." or SYSTEM_PROMPT = (...)
        # We replace the content of whichever SYSTEM_PROMPT_V* is active, or SYSTEM_PROMPT directly
        # Strategy: find SYSTEM_PROMPT = SYSTEM_PROMPT_Vx alias first
        alias_match = re.search(r'SYSTEM_PROMPT\s*=\s*(SYSTEM_PROMPT_V\w+)', source)
        if alias_match:
            target_var = alias_match.group(1)
        else:
            target_var = "SYSTEM_PROMPT"

        # Now replace the string value of target_var
        # Handle multi-line parenthesised strings: VAR = (\n    "..."\n    "..."\n)
        paren_pat = re.compile(
            rf'^{re.escape(target_var)}\s*=\s*\(([^)]+)\)',
            re.MULTILINE | re.DOTALL,
        )
        quote_pat = re.compile(
            rf'^{re.escape(target_var)}\s*=\s*"([^"]*)"',
            re.MULTILINE,
        )
        triple_pat = re.compile(
            rf'^{re.escape(target_var)}\s*=\s*"""([^"]*)"""',
            re.MULTILINE | re.DOTALL,
        )
        escaped = new_value.replace('\\', '\\\\').replace('"', '\\"')
        replacement = f'{target_var} = "{escaped}"'
        if triple_pat.search(source):
            source = triple_pat.sub(replacement, source, count=1)
        elif paren_pat.search(source):
            source = paren_pat.sub(replacement, source, count=1)
        elif quote_pat.search(source):
            source = quote_pat.sub(replacement, source, count=1)
        else:
            raise HTTPException(400, f"Could not locate '{target_var}' assignment in graph.py.")

    elif body.type == "model_config":
        import re
        # Replace model= and temperature= inside ChatOpenAI(...) call
        # Extract model and temperature from suggested_value if JSON, else treat as model name
        try:
            cfg = json.loads(new_value) if new_value.strip().startswith("{") else {}
        except Exception:
            cfg = {}
        model_name = cfg.get("model", new_value.strip())
        temperature = cfg.get("temperature", None)

        def replace_model(m: re.Match) -> str:
            inner = m.group(1)
            inner = re.sub(r'model\s*=\s*["\'][^"\']*["\']', f'model="{model_name}"', inner)
            if temperature is not None:
                inner = re.sub(r'temperature\s*=\s*[\d.]+', f'temperature={temperature}', inner)
            return f"ChatOpenAI({inner})"

        source, n = re.subn(r'ChatOpenAI\(([^)]*)\)', replace_model, source)
        if n == 0:
            raise HTTPException(400, "Could not locate ChatOpenAI(...) in graph.py.")

    graph_file.write_text(source, encoding="utf-8")
    return {"applied": True, "file": str(graph_file), "type": body.type}


# ---------------------------------------------------------------------------
# RLHF dataset export
# ---------------------------------------------------------------------------

@app.get("/api/export-rlhf/{tag}")
def export_rlhf(tag: str, project: Optional[str] = None):
    """
    Export human feedback + sample results as a DPO-compatible JSONL.
    Returns as an inline JSON response (frontend triggers download via blob URL).
    """
    from fastapi.responses import Response

    db = _db_for_project(project)
    run = get_run_by_tag(db, tag)
    if not run:
        raise HTTPException(404, f"Version '{tag}' not found.")

    # Load snapshot to get system prompt
    snap_meta: dict = {}
    snap_path = run.get("snapshot_path")
    if snap_path:
        snap_dir = Path(snap_path)
        if snap_dir.suffix == ".py":
            snap_dir = snap_dir.parent
        meta_file = snap_dir / "snapshot.json"
        if meta_file.exists():
            try:
                snap_meta = json.loads(meta_file.read_text())
            except Exception:
                pass

    system_prompts = snap_meta.get("system_prompts", {})
    active_key = system_prompts.get("_active", "")
    system_prompt = system_prompts.get(active_key, "")
    if not system_prompt:
        system_prompt = next((v for k, v in system_prompts.items() if not k.startswith("_")), "")

    rows = get_all_feedback_for_export(db, tag)

    # Also load ALL samples for the run (not just those with feedback)
    all_samples = get_samples_for_tag(db, tag)
    fb_by_idx = {r["sample_idx"]: r for r in rows}

    lines = []
    for s in all_samples:
        fb = fb_by_idx.get(s["sample_idx"], {})
        human_score = fb.get("human_score")
        human_comment = fb.get("human_comment", "")

        input_messages = []
        if system_prompt:
            input_messages.append({"role": "system", "content": system_prompt})
        input_messages.append({"role": "user", "content": s["input"]})

        # For DPO: passing answers are "preferred", failing are "non_preferred"
        record: dict = {
            "input": {"messages": input_messages},
            "preferred_output": None,
            "non_preferred_output": None,
            "label": int(s["passed"]),
            "human_score": human_score,
            "comment": human_comment,
            "run_tag": tag,
            "sample_idx": s["sample_idx"],
            "expected": s["expected"],
            "got": s["got"],
        }

        if s["passed"]:
            record["preferred_output"] = [{"role": "assistant", "content": s["got"]}]
        else:
            record["non_preferred_output"] = [{"role": "assistant", "content": s["got"]}]

        # If human explicitly downvoted a passing answer, demote it
        if human_score == -1 and s["passed"]:
            record["preferred_output"] = None
            record["non_preferred_output"] = [{"role": "assistant", "content": s["got"]}]

        lines.append(json.dumps(record, ensure_ascii=False))

    content = "\n".join(lines)
    filename = f"rlhf_{tag}.jsonl"
    return Response(
        content=content,
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/health")
def health():
    return {"status": "ok"}
