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

**Do not** set `NEXT_PUBLIC_API_URL` on Vercel unless you use a **custom domain** and builds need a fixed public origin (see below).

### How it works

- On Vercel, the app calls `https://<your-deployment>.vercel.app/api/...`.
- Next.js **rewrites** those requests to `AGENTLAB_BACKEND_URL/api/...` (your EC2 FastAPI).
- The browser never talks to `http://` EC2 directly, so you avoid **mixed content** blocks.

### Custom domain (e.g. `app.example.com`)

Set:

- `NEXT_PUBLIC_API_URL` = `https://app.example.com`  
- Keep `AGENTLAB_BACKEND_URL` = `http://YOUR_EC2:8000`

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
