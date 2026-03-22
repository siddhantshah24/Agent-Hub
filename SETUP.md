# AgentLab setup guide

**How developers use AgentLab.** Clone this repository and run the **entire stack on your machine** (**CLI**, **API**, and **dashboard** / Next.js). There is no separate hosted app you can rely on for day-to-day work. The dashboard is the `agent_lab_ui` package in this repo, started together with the API via `agentlab ui`.

This guide walks through clone, install, `.env`, evals, and **`agentlab ui`** (API + dashboard).

For product context, see **[README.md](README.md)**.

---

## What you are installing

AgentLab has three runtime parts, **all from this repo** when you develop locally.

1. **Python CLI** (`agentlab`) for evals, snapshots, and rollback  
2. **FastAPI backend** for projects, runs, diff APIs (LLM-backed summaries when a key is configured)  
3. **Next.js dashboard** for run history, diff viewer, project pages, landing (build with `npm install` under `agent_lab/agent_lab_ui`, optional **Spline** hero asset)

Target agents live under `target_projects/`. Each project has its own

- `agent-eval.yml`  
- `src/` (agent graph code)  
- `datasets/`  
- Local `.agentlab.db` and `.agentlab/snapshots/` created when you run evals

---

## Prerequisites


| Requirement                 | Notes                                        |
| --------------------------- | -------------------------------------------- |
| **Python 3.10+**            | Used for CLI and API                         |
| **Node.js 18+** and **npm** | For `agent_lab_ui`                           |
| **Docker**                  | Recommended for **local Langfuse** (tracing) |
| **Git**                     | Clone this repository                        |


### API keys and services

Configure these in `.env` (see below). `.env.example` lists the exact variable names. Names may match your **LLM provider** for chat completions used by the API (diff summaries and suggestions).


| Variable                                                      | Purpose                                                                                                                                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LLM_API_KEY`                                                 | Required for Diff Viewer behavioral summaries and improvement suggestions (FastAPI). In `.env.example` this appears under the key used by the bundled server for the configured chat **LLM model**. |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` | Recommended for trace URLs and observability during evals.                                                                                                                                         |


Copy from the template.

```bash
cp .env.example .env
```

Edit `.env` and set real values. Start from `.env.example`, which names the **LLM** key and optional model override for summaries and suggestions, plus any tracing keys you use.

```env
# Paste from .env.example after copying (includes the LLM API key line for the server)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=http://localhost:3000
```

Optional model override for those API calls (if supported by your provider) is documented in **`.env.example`**.

---

# Local running

This is the **standard developer path**. Clone the repo, install dependencies, and run **everything on your computer**, including the **dashboard** next to the API.

---

## Step 1 Clone and enter the repository

```bash
git clone <your-fork-or-repo-url>
cd AgentHub
```

(Replace the URL with your team’s Git remote.)

---

## Step 2 Langfuse (local, recommended)

Tracing integrates with **Langfuse** when keys and `LANGFUSE_HOST` are set.

```bash
git clone https://github.com/langfuse/langfuse.git langfuse-local
cd langfuse-local
docker compose up -d
```

Open `http://localhost:3000`, create an account, create a project, and generate **public** and **secret** API keys. Put them in `.env` as `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`, and set `LANGFUSE_HOST=http://localhost:3000`.

Return to the AgentHub repo root for the remaining steps.

---

## Step 3 Python environment

```bash
cd /path/to/AgentHub
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
python -m pip install --upgrade pip
```

---

## Step 4 Install AgentLab (editable) and UI dependencies

```bash
pip install -e agent_lab/
```

Install the dashboard (required for the UI).

```bash
cd agent_lab/agent_lab_ui
npm install
cd ../..
```

You **must** run `npm install` here so the Next.js app can be started. The UI includes Spline-related packages for the landing hero. **No extra manual step** is required beyond `npm install`.

---

## Step 5 Environment file

```bash
cp .env.example .env
```

- Set the **LLM API key** (and optional model name) so diff summaries and suggestions work in the UI. Use the variable names in `.env.example`.  
- Set **Langfuse** variables if you use local Langfuse.

---

## Step 6 Verify the CLI

```bash
agentlab --help
```

You should see commands `init`, `eval`, `rollback`, `ui`.

---

## Step 7 Run a smoke evaluation

```bash
cd target_projects/01_math_multiverse
agentlab eval --limit 3
```

Expect the following.

- Progress output and a results summary  
- A snapshot under `.agentlab/snapshots/` for the run tag

**Version tags.** Each `agentlab eval` run is stored under a **version tag**. If you **do not** pass `--tag`, AgentLab **generates a tag automatically** (from a content hash, e.g. `run-001-…`). If you **do** pass `--tag v1` (or any label), that **name** is used so you can line up releases, prompts, or experiments yourself.

---

## Step 8 Create two tags (for compare / diff)

```bash
cd target_projects/01_math_multiverse
agentlab eval --tag v1
```

Make a small, intentional change in `src/graph.py` (e.g. prompt text), then run

```bash
agentlab eval --tag v2
```

---

## Step 9 Start API and dashboard (full stack locally)

From **repository root** (or from a target project directory), start **both** the FastAPI server and the Next.js dashboard.

```bash
agentlab ui
```

This is how you run AgentLab as a developer. One command brings up the **backend and the dashboard** from your clone. Open the printed dashboard URL in a browser. There is no separate “cloud dashboard” for local development.

Defaults.

- **API** `http://localhost:8000`  
- **Dashboard** `http://localhost:3001`

Custom ports.

```bash
agentlab ui --api-port 8001 --ui-port 3002
```

---

## Step 10 Quick API checks

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/projects
curl "http://localhost:8000/api/versions?project=01_math_multiverse"
```

`/health` should return JSON with a healthy status.

---

## Step 11 Dashboard checks

In the browser,

1. Open the dashboard URL printed by `agentlab ui`.
2. Confirm the **project** selector lists your target project.
3. Open **run history** and confirm **v1** / **v2** (or your tags) appear.
4. Open **Diff** (or diff viewer) and compare two tags. Confirm **metrics** and **summary** if your **LLM** key is set.
5. Open a **run detail** page for a tag and confirm samples (and traces if Langfuse is wired).

---

## Other target projects (local)

**Enterprise SQL**

```bash
cd target_projects/02_enterprise_sql
agentlab eval --tag sql-v1
```

**Stress typewriter**

```bash
cd target_projects/03_stress_typewriter
agentlab eval --tag typew-v1
```

Use the dashboard **project** dropdown to switch context between projects.

---

## Rollback workflow (local)

```bash
cd target_projects/01_math_multiverse
agentlab rollback --tag v1
agentlab eval --tag rollback-check
```

Use this to restore tracked files from a snapshot for a given tag (per project configuration).

---

# Hosted deployment and usage

This section is **optional**. It applies when you deploy the stack to a **server** for a team or demo, or when you **browse** an instance someone else already hosts. **Developing AgentLab or running evals end-to-end on your laptop** still follows [Local running](#local-running). Clone the repo and use `agentlab ui` for the dashboard.

---

## Deploying the API and UI

Use this when you deploy AgentLab to a **public URL** (demo, hackathon judging, team server). The dashboard and API are **separate processes**. Production usually mirrors that (static or Node hosting for the UI, Python hosting for the API).

### FastAPI backend

Run the ASGI app with a production server. With the virtualenv active and `pip install -e agent_lab/` done from the repo root,

```bash
cd agent_lab
uvicorn agent_lab_core.server:app --host 0.0.0.0 --port 8000
```

(`agentlab ui` starts the same app with cwd set to `agent_lab/`. Match that layout or rely on installed package and env vars.)

Set **environment variables** on the API host (same meaning as `.env` locally).


| Variable                                                      | Purpose                                                                                                                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM key for summaries                                         | Same role as locally. Match `.env.example` for the variable name tied to your **LLM model** provider.                                                                                  |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` | Traces (use cloud Langfuse or your own instance)                                                                                                                                       |
| `AGENTLAB_PROJECTS_ROOT`                                      | **Recommended for multi-project demos.** Absolute path to a directory whose children are project folders (each may contain `.agentlab.db`). Same layout as `target_projects/` on disk. |
| `AGENTLAB_DB`                                                 | **Single-project mode.** Path to one SQLite file if you are not using `AGENTLAB_PROJECTS_ROOT`.                                                                                        |


The API must **read** the same SQLite files that were populated by `agentlab eval` (copy the repo tree or sync `target_projects/**/.agentlab.db` to the server). Evals and rollback still run **on a machine with the CLI**. The hosted API serves the dashboard.

### Next.js frontend

Build the UI with `NEXT_PUBLIC_API_URL` pointing at your **public API origin** (scheme + host + port, **no trailing slash**). Example.

```bash
cd agent_lab/agent_lab_ui
NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
npm run start
```

`next.config.ts` rewrites browser requests from `/api/*` to `${NEXT_PUBLIC_API_URL}/api/*`, so the UI and API can live on different domains.

### Security and operations

- Serve **HTTPS** for both UI and API in production.  
- Keep **LLM** and Langfuse secrets on the **server**. Never commit them.  
- The API currently allows **CORS `*`** for easier local development. For a locked-down deployment, restrict `allow_origins` in `agent_lab_core/server.py` to your dashboard origin only.  
- Ensure the host running **evaluations** (if not the same as the API) can still write `.agentlab.db` files that the API can read, or use a shared volume or sync process.

### Hosting checklist

- API reachable at a stable URL. `curl https://…/health` works.  
- `AGENTLAB_PROJECTS_ROOT` or `AGENTLAB_DB` points at real data on that host.  
- UI built with `NEXT_PUBLIC_API_URL` matching the API.  
- Secrets configured on the API process.  
- Browser can load the dashboard and project/run data without CORS or mixed-content errors.

---

## Using a hosted project (browsing only, not the default developer setup)

If your team already **deployed** the dashboard and API, you can sometimes **view** runs without a local clone.

1. Open the **dashboard URL** they give you (usually HTTPS).
2. You do **not** need a local clone **only to view** runs, diffs, and feedback, as long as the server already has eval data in its SQLite databases. **To develop AgentLab, run evals locally, or use the dashboard against your own data, clone the repo and follow [Local running](#local-running).**
3. If you **build** the UI from source against a remote API, set `NEXT_PUBLIC_API_URL` at **build time** to the **public base URL of the FastAPI** service (no trailing slash), then deploy the built assets.
4. **Running new evals** still requires the **CLI** on a machine that has the target project and keys, unless you automate that elsewhere. Point `AGENTLAB_PROJECTS_ROOT` on the server at the tree that contains those `.agentlab.db` files so the hosted UI lists the right projects.

High-level context is in **[README.md](README.md)**.

---

## Troubleshooting

### `agentlab` command not found

Activate the same **virtualenv** where you ran `pip install -e agent_lab/`.

### UI stuck on loading or “API unreachable”

- Confirm `agentlab ui` is running and no firewall is blocking localhost.  
- Try alternate ports `agentlab ui --api-port 8001 --ui-port 3002` and open the printed UI URL.  
- For a **hosted** UI, confirm `NEXT_PUBLIC_API_URL` matched the API when you built the frontend.

### “LLM summary unavailable” or empty suggestions (Diff Viewer)

- Set a valid **LLM API key** in `.env` (per `.env.example`) and restart `agentlab ui` or the API process.  
- Check server logs for errors from the LLM client.

### Langfuse traces missing

- Confirm `LANGFUSE_HOST` matches your Langfuse base URL.  
- Verify **public/secret** keys and that Docker Langfuse is running.  
- Re-run an eval after fixing env vars.

### Spline / 3D hero does not load on the landing page

- Ensure `npm install` completed in `agent_lab/agent_lab_ui`.  
- Check the browser console for blocked network requests to **Spline** CDN. Allow **prod.spline.design** if you use a strict network policy.

### Port already in use

Pass explicit ports to `agentlab ui` (see Step 9).

---

## Summary checklist (local)

- Repository **cloned**. You are working from your local copy.  
- Python venv active. `pip install -e agent_lab/`  
- `npm install` in `agent_lab/agent_lab_ui` (dashboard dependencies)  
- `.env` copied from `.env.example`. **LLM** key set per `.env.example`  
- Langfuse running (optional) and keys in `.env`  
- `agentlab eval` succeeds in at least one `target_projects/*`  
- `agentlab ui` runs **API + dashboard**. Health and projects endpoints respond. Dashboard opens in the browser.

You are ready to use AgentLab locally with the full stack. Deeper product narrative is in **[README.md](README.md)**.
