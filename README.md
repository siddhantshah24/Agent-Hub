# Agent Lab

> Local version control, CI/CD observability, and evaluation platform for LangGraph agents.  
> "Vercel for Agents" — runs entirely on your machine.

## Quick Start

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- Langfuse running on `localhost:3000`
- OpenAI API key

### 2. Install the CLI

```bash
pip install -e agent_lab/
```

### 3. Set up environment

```bash
cp multiverse_project/.env.example multiverse_project/.env
# Fill in your keys in .env
```

### 4. Run your first evaluation

```bash
cd multiverse_project
agentlab eval --tag v1
```

### 5. Change the agent, run again

Edit `multiverse_project/src/graph.py` (e.g. tweak `SYSTEM_PROMPT`), then:

```bash
agentlab eval --tag v2
```

### 6. Launch the dashboard

```bash
agentlab ui
# Dashboard: http://localhost:3001
# API:       http://localhost:8000
```

### 7. Rollback to a previous version

```bash
agentlab rollback --tag v1
```

---

## Commands

| Command | Description |
|---|---|
| `agentlab init` | Scaffold `agent-eval.yml` in current directory |
| `agentlab eval --tag <v>` | Run evaluation, save metrics + traces |
| `agentlab rollback --tag <v>` | Restore agent file from snapshot |
| `agentlab ui` | Start FastAPI + Next.js dashboard |

## Architecture

```
agent_lab/                    # The MLOps platform
├── agent_lab_core/
│   ├── cli.py                # Typer CLI
│   ├── parser.py             # agent-eval.yml parser
│   ├── runner.py             # Evaluation engine (importlib + Langfuse)
│   ├── db.py                 # SQLite interface
│   └── server.py             # FastAPI backend
└── agent_lab_ui/             # Next.js dashboard

multiverse_project/           # Demo: LangGraph math agent
├── agent-eval.yml
├── datasets/math_evals.jsonl
└── src/graph.py
```

## How drift detection works

Every `agentlab eval --tag <v>` run:
1. Loads your agent dynamically via `importlib`
2. Injects a `LangfuseCallbackHandler(tags=["version:<v>"])` — all traces are tagged in Langfuse
3. Compares each answer to the golden dataset
4. Stores per-sample results in SQLite (`run_samples` table)

On the diff page (`/diff?v1=v1&v2=v2`):
- Metric deltas (success rate, latency, cost)
- Sample-level flip table (which exact questions regressed or improved)
- GPT-4o-mini behavioral summary of what changed
