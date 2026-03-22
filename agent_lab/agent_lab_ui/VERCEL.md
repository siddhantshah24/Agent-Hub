# Deploy Agent Lab UI to Vercel

## 1. Push your repo to GitHub (or GitLab / Bitbucket)

Vercel imports from git.

## 2. New project → Import that repo

## 3. Root Directory

Set **Root Directory** to:

`agent_lab/agent_lab_ui`

(The folder that contains `package.json` and `next.config.ts`.)

## 4. Environment variables (Project → Settings → Environment Variables)

| Name | Value | Environments |
|------|--------|--------------|
| `AGENTLAB_BACKEND_URL` | `http://54.196.166.55:8000` | Production, Preview, Development |

Use your **current** EC2 public IP and port if different. **No trailing slash.**

The UI calls **same-origin** `/api/...` only (no baked `NEXT_PUBLIC_API_URL`), so **custom domains** (e.g. `agent-hub-one-gilt.vercel.app`) work without extra env.

### How it works

- The browser requests `https://<your-domain>/api/...` on the **same host** you opened.
- Next.js **rewrites** those to `AGENTLAB_BACKEND_URL/api/...` (EC2 FastAPI).
- Avoids mixed content and avoids calling the wrong `*.vercel.app` host from a custom domain.

### Custom domain

Only ensure **`AGENTLAB_BACKEND_URL`** is set. No `NEXT_PUBLIC_API_URL` required.

## 5. Deploy

Click **Deploy**. Fix any build errors (run `npm run build` locally from `agent_lab/agent_lab_ui` first if needed).

## 6. EC2 security group

Allow **inbound TCP 8000** from **Vercel** (or `0.0.0.0/0` for demos). Vercel outbound IPs are not a single fixed set; for production, use HTTPS on the API or a lockdown strategy you’re comfortable with.

## 7. EC2 sync (when you change the Python API)

Vercel only deploys the **Next.js** app. **`agent_lab_core/server.py`** and the rest of the FastAPI app run on **EC2** — they do not auto-update when you push to GitHub.

After a push that touches the backend (snapshots, DB paths, new routes, etc.):

1. **SSH into EC2** and `cd` to your clone of this repo (same tree as GitHub).
2. **Pull** the latest `main`:
   ```bash
   git pull origin main
   ```
3. **Restart** the API process (adjust for your setup):
   ```bash
   # If you use systemd, e.g. agentlab-api.service:
   sudo systemctl restart agentlab-api
   # Or if you run uvicorn manually, stop it and start again from the right venv.
   ```
4. **Data on disk**: For **Agent Snapshot** to work, each project needs **both** next to each other on EC2:
   - `<project>/.agentlab.db` (or path set by `AGENTLAB_DB` / `AGENTLAB_PROJECTS_ROOT`)
   - `<project>/.agentlab/snapshots/<tag>/` (files from `agentlab eval`)

   If you only copied the DB from your laptop, **sync `.agentlab/snapshots/`** too, or run `agentlab eval` on EC2 so snapshots are created there.

5. **Env on EC2** (if you use multiple target projects): set `AGENTLAB_PROJECTS_ROOT` to the parent folder that contains each repo’s `.agentlab.db` (see `server.py` `_get_all_dbs`). The `agentlab-api` systemd unit sets `AGENTLAB_PROJECTS_ROOT=$APP_ROOT/target_projects` — keep that path aligned with where rsync puts `target_projects/`.

## 8. “Snapshot directory not found” in the UI

**Vercel does not store snapshots.** The dashboard only proxies `/api/*` to EC2. The FastAPI process on EC2 must read:

`$AGENTLAB_PROJECTS_ROOT/<project>/.agentlab/snapshots/<tag>/` (next to that project’s `.agentlab.db`).

Fix on **EC2**, not Vercel:

- Confirm **`AGENTLAB_PROJECTS_ROOT`** matches the folder that contains `01_math_multiverse`, `02_enterprise_sql`, … (e.g. `~/agentlab/target_projects`).
- **Rsync `.agentlab/snapshots/`** for every project you care about. If only one project’s `snapshots/` was uploaded, runs for other projects will still fail until those dirs exist.
- **Pull + restart** the API after backend fixes (`git pull`, `sudo systemctl restart agentlab-api`).
- Use the **project selector** in the UI (adds `?project=…`) when comparing multiple agents; the API also **auto-resolves** the correct DB by tag when `project` is `default` and several DBs exist (latest `server.py`).

## Local dev

Keep using `.env.local` if you want:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Leave `AGENTLAB_BACKEND_URL` unset locally so the rewrite targets the same URL.
