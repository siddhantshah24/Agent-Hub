# Agent Lab Optimization Backlog

This document lists implementation optimizations discovered during a full repository scan.

## Priority 1 (high impact, low-medium effort)

### 1) Make `agentlab ui` resilient to port conflicts

- **Current behavior:** if port `8000` is occupied, FastAPI fails while Next.js still starts, and UI appears stuck on loading.
- **Optimization:** pre-check ports before spawning subprocesses and fail fast with a clear message, or auto-select fallback ports.
- **Suggested implementation:**
  - Add a small `is_port_free(port)` utility in `agent_lab_core/cli.py`
  - If occupied, either:
    - raise actionable error, or
    - increment and retry (`8001`, `8002`, ...)

### 2) Use explicit FK enforcement in SQLite

- **Current behavior:** schema defines FK constraints, but SQLite requires `PRAGMA foreign_keys=ON` for enforcement.
- **Optimization:** enable foreign keys at connection open.
- **Suggested implementation:** update `_connect()` in `agent_lab_core/db.py`:
  - execute `PRAGMA foreign_keys=ON` after connection.

### 3) Normalize env var naming (`LANGFUSE_HOST` vs older names)

- **Current behavior:** code expects `LANGFUSE_HOST`; users may provide `LANGFUSE_BASE_URL`.
- **Optimization:** support both env vars with one canonical internal value and log a deprecation warning.
- **Suggested implementation:** in `agent_lab_core/cli.py` and `agent_lab_core/server.py`, resolve:
  - `LANGFUSE_HOST` first
  - fallback to `LANGFUSE_BASE_URL`

### 4) Improve trace lookup performance in `/api/traces/{tag}`

- **Current behavior:** API scans paginated traces and filters by run-name prefix.
- **Optimization:** prefer storing and using `langfuse_trace_id` from `run_samples` first, then fetch only exact IDs.
- **Suggested implementation:** in `agent_lab_core/server.py`:
  - query sample rows for `langfuse_trace_id`
  - call Langfuse trace get by ID
  - fallback to name-scan only when IDs are missing

## Priority 2 (medium impact)

### 5) Add backend request timeouts and surfaced UI errors

- **Current behavior:** if API endpoint hangs/errors, UI can remain in loading states without clear root cause.
- **Optimization:** timeout fetch calls and show compact inline diagnostics with retry action.
- **Suggested implementation:** `agent_lab_ui/app/page.tsx`, `app/diff/page.tsx`, `app/run/[tag]/page.tsx`:
  - shared `fetchWithTimeout()`
  - structured error state and message panels.

### 6) Make cost model/provider mapping configurable

- **Current behavior:** token pricing is hardcoded in `_TokenCostTracker`.
- **Optimization:** load price map from config file/env for easier updates and provider additions.
- **Suggested implementation:** keep defaults in code, allow override from JSON/YAML path in env.

### 7) Stream large dataset evaluation instead of full JSONL load

- **Current behavior:** `_load_jsonl()` loads all rows into memory.
- **Optimization:** add iterator mode for large datasets, preserving `--limit` semantics.
- **Suggested implementation:** convert dataset loader to generator and compute totals as needed.

## Priority 3 (larger initiatives)

### 8) Add automated integration smoke tests

- **Current behavior:** primary validation is manual CLI/UI testing.
- **Optimization:** add CI smoke tests for:
  - `agentlab eval --limit 1`
  - API `/health` and `/api/projects`
  - snapshot creation assertions
- **Suggested implementation:** add `tests/` with pytest + fixture target project.

### 9) Add migration/version table for DB schema management

- **Current behavior:** migrations are implicit `ALTER TABLE` attempts.
- **Optimization:** introduce schema version table and deterministic migration order.
- **Suggested implementation:** add `schema_migrations` table and idempotent migration runner.

### 10) Multi-provider AI summary abstraction

- **Current behavior:** diff summary currently Groq-only.
- **Optimization:** provider interface supporting Groq/OpenAI via env selection.
- **Suggested implementation:** extract summary generation service with provider adapters.

