# Agent Lab — Setup Guide

> Local MLOps platform for evaluating LangGraph agents.  
> Track agent behaviour, detect drift, compare versions, and roll back — all from your terminal.

---

## What you'll need

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10 + | Check: `python --version` |
| Node.js | 18 + | Check: `node --version` |
| npm | 9 + | Comes with Node |
| OpenAI API key | — | For running agents + AI diff summaries |
| Langfuse (self-hosted) | — | For trace observability. See step 2 below. |

---

## Step 1 — Clone the repo

```bash
git clone git@github.com:siddhantshah24/Agent-Hub.git
cd Agent-Hub
git checkout agent-lab
```

---

## Step 2 — Start Langfuse (one-time)

Langfuse is the observability backend. It stores execution traces, tool call chains, and latency data.

```bash
# Make sure Docker Desktop is running first, then:
git clone https://github.com/langfuse/langfuse.git langfuse-local
cd langfuse-local
docker compose up -d
```

Open **http://localhost:3000** — create an account (local, no email verification needed).  
Then go to **Settings → API Keys** and create a key pair. You'll need these in Step 4.

> If Langfuse is already running in your team, just get the public/secret key pair from whoever set it up.

---

## Step 3 — Create a Python virtual environment

```bash
# From the repo root
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
```

---

## Step 4 — Create the `.env` file

Create a `.env` file at the **repo root** (next to `README.md`):

```bash
touch .env
```

Open it and add your keys:

```env
OPENAI_API_KEY=sk-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=http://localhost:3000
```

> **Never commit this file.** It is already in `.gitignore`.

---

## Step 5 — Install the Agent Lab CLI

```bash
# Make sure your venv is active
pip install -e agent_lab/
```

This installs the `agentlab` command. Verify it works:

```bash
agentlab --help
```

Expected output:
```
Usage: agentlab [OPTIONS] COMMAND [ARGS]...

  Agent Lab — local MLOps for LangGraph agents

Commands:
  eval      Run evaluation against the golden dataset
  init      Scaffold agent-eval.yml in the current directory
  rollback  Restore the agent source file from a snapshot
  ui        Launch the FastAPI backend and Next.js dashboard
```

---

## Step 6 — Install the dashboard dependencies

```bash
cd agent_lab/agent_lab_ui
npm install
cd ../..
```

---

## Step 7 — Run your first evaluation

There are three demo agents in `target_projects/`. Start with the Math agent:

```bash
cd target_projects/01_math_multiverse

# Auto-versioning: tag is optional — a content hash is computed automatically
agentlab eval

# Or supply your own label
agentlab eval --tag v1
```

**How versioning works:**

- Every run computes a **content hash** (SHA-256 over all `src/*.py` files, first 8 chars).
- If you don't pass `--tag`, the tag is auto-generated as `run-001-<hash>`.
- If you run with the same code twice, you'll see a warning: *"Agent code unchanged"*.
- Use `--force` to overwrite an existing tag: `agentlab eval --tag v1 --force`.

You'll see a live progress bar. When it finishes:

```
┌──────────────┬───────────────┐
│ Metric       │         Value │
├──────────────┼───────────────┤
│ Total Cases  │            20 │
│ Passed       │            18 │
│ Success Rate │         90.0% │
│ Avg Latency  │      1423 ms  │
│ Avg Cost     │    $0.000312  │
│ Content Hash │      ab3f1c2e │
└──────────────┴───────────────┘
```

Agent Lab also captures a rich **snapshot** of the agent into `.agentlab/snapshots/<tag>/`:
- All `src/*.py` files copied verbatim
- `snapshot.json` — structured metadata: system prompt(s), model name/temperature, tool definitions

---

## Step 8 — Launch the dashboard

From any `target_projects/` subfolder (or the repo root):

```bash
agentlab ui
```

- **Dashboard** → http://localhost:3001  
- **API** → http://localhost:8000  
- **Langfuse traces** → http://localhost:3000

> The dashboard auto-discovers all three demo projects via the dropdown in the top-left corner.

---

## Step 9 — Create a second version to compare

Edit the agent's system prompt to see drift detection in action.

**Example — Math agent:**

```bash
# Open the file
open target_projects/01_math_multiverse/src/graph.py
```

Find line `SYSTEM_PROMPT = SYSTEM_PROMPT_V1` and change it to `SYSTEM_PROMPT_V2`, then run:

```bash
cd target_projects/01_math_multiverse
agentlab eval --tag v2
```

Because the code changed, a **new content hash** is computed and the snapshot captures the new system prompt automatically.

Now go to the dashboard, select both `v1` and `v2` rows, and click **Compare**.

You'll see:
- **Split Compare** tab — side-by-side per-sample outputs with full Langfuse execution chains
- **Metrics** tab — success rate / latency / cost deltas
- **Code Diff** tab:
  - System prompt comparison (read from `snapshot.json` — fast, reliable, no Langfuse dependency)
  - Model configuration comparison (class, model name, temperature)
  - Line-by-line code diff

> **Single-run details:** Click any row → **Details** for a dedicated page with 4 tabs: Sample Results, System Prompt, Model & Tools, and Agent Code.

---

## The three demo agents

| Folder | Agent | What it tests |
|---|---|---|
| `01_math_multiverse` | Multiverse Math | Strict tool compliance, prompt drift |
| `02_enterprise_sql` | Enterprise SQL | Multi-hop SQL reasoning with JOINs |
| `03_stress_typewriter` | Typewriter (26 tools) | Sequential tool call accuracy |

Each one has its own `agent-eval.yml`, `datasets/`, and `src/graph.py`. They share the same `.env` at the repo root.

---

## CLI reference

```bash
# Run evaluation (tag is OPTIONAL — auto-generated from content hash if omitted)
agentlab eval
agentlab eval --tag v1
agentlab eval --tag v1 --force        # overwrite an existing tag

# Launch dashboard (auto-discovers all projects)
agentlab ui

# View a single run in the dashboard → click row → "Details"
# Compare two runs → select two rows → "Compare"

# Roll back agent code to a previous snapshot
agentlab rollback --tag <name>

# Scaffold a new project
agentlab init
```

### What `agentlab eval` captures

Every evaluation run writes a **structured snapshot** to `.agentlab/snapshots/<tag>/`:

```
.agentlab/
  snapshots/
    v1/
      graph.py          ← exact copy of src/graph.py at eval time
      database.py       ← other src/ files included too
      snapshot.json     ← structured metadata (see below)
```

`snapshot.json` structure:
```json
{
  "tag": "run-001-ab3f1c2e",
  "content_hash": "ab3f1c2e",
  "files": ["graph.py", "database.py"],
  "system_prompts": {
    "SYSTEM_PROMPT_V1": "You are operating in an alternate universe...",
    "_active": "SYSTEM_PROMPT_V1"
  },
  "model": { "class": "ChatOpenAI", "model": "gpt-4o-mini", "temperature": 0 },
  "tools": [
    { "name": "multiply", "description": "...", "source": "external", "schema": {} },
    { "name": "list_tables", "description": "...", "source": "inline", "schema": {} }
  ]
}
```

The dashboard's **System Prompt**, **Model & Tools**, and **Code Diff** tabs all read from this file — no Langfuse API call needed.

---

## Adding your own agent

1. Create a new folder under `target_projects/`:

```bash
mkdir -p target_projects/my_agent/src
mkdir target_projects/my_agent/datasets
cd target_projects/my_agent
agentlab init
```

2. Edit `agent-eval.yml`:

```yaml
entrypoint: src.graph:run_agent
dataset: datasets/evals.jsonl
input_key: question
expected_output_key: answer
```

3. Write `src/graph.py` — your agent must expose a function with this signature:

```python
def run_agent(input: dict, config: dict | None = None) -> dict:
    # input["question"] is the question from the dataset
    # return {"answer": "your answer string"}
    ...
```

**Snapshot auto-extraction** happens automatically from your source files:
- Variables named `*PROMPT*` or `*SYSTEM*` (string constants) → captured as system prompts
- `ChatOpenAI(...)` calls → model name, temperature captured
- `@tool`-decorated functions → captured with docstrings as inline tools

**Optional: explicit metadata hook** — add this function to override auto-extraction:

```python
def get_agent_metadata() -> dict:
    """Agent Lab reads this if present — override any auto-detected values."""
    return {
        "system_prompt": SYSTEM_PROMPT,          # active prompt text
        "model": "gpt-4o-mini",                  # model name string
        "tools": [{"name": t.name, "description": t.description} for t in MY_TOOLS],
    }
```

If `get_agent_metadata()` exists in your module, its output takes **priority** over AST parsing. Use this when the AST parser can't see your setup (e.g., prompts built dynamically, model loaded from config file).

4. Create `datasets/evals.jsonl` — one JSON object per line:

```jsonl
{"question": "What is 2+2?", "answer": "4"}
{"question": "Capital of France?", "answer": "Paris"}
```

5. Run it:

```bash
agentlab eval             # auto-generates tag like run-001-ab3f1c2e
agentlab eval --tag v1    # or use your own label
agentlab ui
```

---

## Troubleshooting

**`agentlab: command not found`**  
Your venv may not be active. Run `source venv/bin/activate` and try again.

**`0% pass rate, 30–50 ms latency`**  
The agent is crashing before calling the LLM. Check the error lines printed above the progress bar — the first 3 failures show a full traceback.

**`Langfuse tracing active` but no traces visible in dashboard**  
The traces take a few seconds to appear. Refresh Langfuse at http://localhost:3000. If still missing, check `LANGFUSE_HOST` in your `.env` matches where Langfuse is running.

**`LLM summary unavailable`**  
The AI diff summary requires `OPENAI_API_KEY` to be set. All other dashboard features work without it.

**`ModuleNotFoundError` when running an agent**  
Make sure you activated the venv (`source venv/bin/activate`) that has `agent-lab` installed.

**Dashboard shows no projects in the dropdown**  
Run `agentlab ui` from inside one of the `target_projects/` subfolders (or from the repo root if `target_projects/` is a direct child directory).

---

## Architecture overview

```
Agent-Hub/
├── .env                          ← your API keys (not committed)
├── agent_lab/
│   ├── agent_lab_core/
│   │   ├── cli.py                ← agentlab CLI commands
│   │   ├── runner.py             ← evaluation engine
│   │   ├── db.py                 ← SQLite (metrics + sample history)
│   │   └── server.py             ← FastAPI backend for dashboard
│   └── agent_lab_ui/             ← Next.js dashboard
└── target_projects/
    ├── 01_math_multiverse/       ← demo: math tool compliance
    ├── 02_enterprise_sql/        ← demo: SQL reasoning
    └── 03_stress_typewriter/     ← demo: sequential tool calls
```

Each project folder gets its own `.agentlab.db` (per-project version history) and `.agentlab/snapshots/` (agent code at each eval).
