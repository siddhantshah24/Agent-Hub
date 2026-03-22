# Agent Lab

Local evaluation, versioning, and observability platform for LangGraph-style agents.

Agent Lab helps you:

- run golden-dataset evaluations from CLI
- track per-run metrics and per-sample outcomes
- compare two versions side-by-side in a dashboard
- inspect trace/tool behavior with Langfuse
- rollback agent code to a prior snapshot

## Repository structure

```text
Agent-Hub/
├── agent_lab/
│   ├── agent_lab_core/        # CLI, runner, DB, API server
│   └── agent_lab_ui/          # Next.js dashboard
├── target_projects/
│   ├── 01_math_multiverse/
│   ├── 02_enterprise_sql/
│   └── 03_stress_typewriter/
├── SETUP.md                   # Full setup + testing guide
└── .env.example               # Environment variable template
```

## Target projects

- `01_math_multiverse`: altered-math tool-use compliance
- `02_enterprise_sql`: SQL multi-hop reasoning over SQLite
- `03_stress_typewriter`: long tool-call sequence stress test

Each target project has its own config/dataset/source and local run DB.

## Quick start (minimal)

```bash
# from repo root
python3 -m venv venv
source venv/bin/activate
pip install -e agent_lab/
pip install langchain-groq

cd agent_lab/agent_lab_ui
npm install
cd ../..

cp .env.example .env
# fill keys in .env (Groq + Langfuse)
```

Run a smoke evaluation:

```bash
cd target_projects/01_math_multiverse
agentlab eval --limit 3
```

Launch API + dashboard:

```bash
agentlab ui
```

- Dashboard: `http://localhost:3001`
- API: `http://localhost:8000`

If ports are in use:

```bash
agentlab ui --api-port 8001 --ui-port 3002
```

## Commands

| Command | Purpose |
|---|---|
| `agentlab init` | Scaffold `agent-eval.yml` in current folder |
| `agentlab eval [--tag ...] [--limit N]` | Run evaluation and store run/sample data |
| `agentlab rollback --tag <tag>` | Restore source from a snapshot |
| `agentlab ui` | Start FastAPI + Next.js locally |

## Provider notes

Current demo agents use Groq (`ChatGroq`), but Agent Lab is provider-agnostic.

To use OpenAI for a target agent:

1. set `OPENAI_API_KEY` in `.env`
2. switch that target project from `ChatGroq` to `ChatOpenAI`
3. re-run `agentlab eval`

## Full instructions

For full setup, troubleshooting, and test workflows, use [`SETUP.md`](SETUP.md).
