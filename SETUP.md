# Agent Lab Setup and Test Guide

This guide is written for a first-time user who wants to run Agent Lab locally and test one or more target projects end to end.

## What you are setting up

Agent Lab has three parts:

1. Python CLI (`agentlab`) for eval/versioning/rollback
2. FastAPI backend for project/run APIs
3. Next.js dashboard UI for comparison and traces

The target projects live in `target_projects/` and each has its own:

- `agent-eval.yml`
- `src/` agent code
- `datasets/` dataset
- `.agentlab.db` run history (local runtime artifact)

## Prerequisites

- Python `3.10+`
- Node.js `18+` and npm
- Docker running (for local Langfuse)
- API keys:
  - Groq key (default demos are Groq-backed)
  - Langfuse public + secret keys

## Step 1: Clone and enter the repo

```bash
git clone git@github.com:siddhantshah24/Agent-Hub.git
cd Agent-Hub
```

## Step 2: Start Langfuse locally

```bash
git clone https://github.com/langfuse/langfuse.git langfuse-local
cd langfuse-local
docker compose up -d
```

Then open `http://localhost:3000`, create a local account, and generate API keys.

Return to this repo after that.

## Step 3: Create and activate Python environment

```bash
cd /path/to/Agent-Hub
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
```

## Step 4: Install backend and UI dependencies

```bash
pip install -e agent_lab/
pip install langchain-groq

cd agent_lab/agent_lab_ui
npm install
cd ../..
```

## Step 5: Configure environment variables

Copy and edit the example:

```bash
cp .env.example .env
```

Set at least:

```env
GROQ_API_KEY=gsk-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=http://localhost:3000
```

`LANGFUSE_HOST` is the variable read by the code.

### OpenAI usage notes (optional provider swap)

The current demo projects use `ChatGroq` in their `src/graph.py`.

If you want to run with OpenAI instead:

- Add `OPENAI_API_KEY=sk-...` to `.env`
- Replace `ChatGroq(...)` with `ChatOpenAI(...)` in the target project's `src/graph.py`
- Ensure `langchain-openai` is installed (it is already in `agent_lab/pyproject.toml`)

This keeps Agent Lab behavior the same, only the model provider changes.

## Step 6: Verify CLI installation

```bash
agentlab --help
```

Expected commands: `init`, `eval`, `rollback`, `ui`.

## Step 7: Run a first smoke evaluation

Use math project first:

```bash
cd target_projects/01_math_multiverse
agentlab eval --limit 3
```

Expected:

- Progress bar completes
- Results table appears
- Snapshot created at `.agentlab/snapshots/<tag>/`

## Step 8: Run full evaluation and create two versions

```bash
cd target_projects/01_math_multiverse
agentlab eval --tag v1
```

Now edit `src/graph.py` (for example switch active prompt), then:

```bash
agentlab eval --tag v2
```

## Step 9: Start dashboard and API

From repo root or from a target project directory:

```bash
agentlab ui
```

Default:

- API: `http://localhost:8000`
- Dashboard: `http://localhost:3001`

If port `8000` is occupied:

```bash
agentlab ui --api-port 8001 --ui-port 3002
```

## Step 10: Validate API endpoints

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/projects
curl "http://localhost:8000/api/versions?project=01_math_multiverse"
```

The health endpoint should return `{"status":"ok"}`.

## Step 11: Validate dashboard behavior

Open the dashboard and verify:

1. project dropdown loads
2. run history table loads (not stuck on loading)
3. compare (`v1` vs `v2`) opens diff view
4. metrics/code diff/sample compare render
5. run details page opens and shows traces/snapshot

## Running other target projects

### Enterprise SQL

```bash
cd target_projects/02_enterprise_sql
agentlab eval --tag sql-v1
```

### Stress Typewriter

```bash
cd target_projects/03_stress_typewriter
agentlab eval --tag typew-v1
```

Then use `agentlab ui` to compare runs per project from the dropdown.

## Rollback workflow

```bash
cd target_projects/01_math_multiverse
agentlab rollback --tag v1
agentlab eval --tag rollback-check
```

## Common troubleshooting

### `agentlab: command not found`

Activate the same virtualenv where you installed `agent-lab`.

### UI stuck on "Loading runs..."

Usually API did not start (port conflict). Start on different ports:

```bash
agentlab ui --api-port 8001 --ui-port 3002
```

### Langfuse traces missing

- Check keys in `.env`
- Ensure `LANGFUSE_HOST` points to running Langfuse
- Confirm eval output says tracing is active

### AI summary unavailable

Set valid `GROQ_API_KEY` (or update server implementation if you want summary from OpenAI instead).

### `ModuleNotFoundError: langchain_groq`

Install dependency:

```bash
pip install langchain-groq
```
