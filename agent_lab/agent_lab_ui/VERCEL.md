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

## Local dev

Keep using `.env.local` if you want:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Leave `AGENTLAB_BACKEND_URL` unset locally so the rewrite targets the same URL.
