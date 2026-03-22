import type { NextConfig } from "next";

/**
 * Where Next.js rewrites /api/* to (FastAPI).
 * - Vercel: set AGENTLAB_BACKEND_URL=http://YOUR_EC2_IP:8000
 * - Local: defaults to http://localhost:8000 when unset
 *
 * The browser always calls same-origin `/api/*` (see workspace-ui `API = ""`) so custom
 * domains work; we do not bake NEXT_PUBLIC_API_URL to *.vercel.app anymore.
 */
function backendApiBase(): string {
  const back = process.env.AGENTLAB_BACKEND_URL?.trim();
  if (back) return back.replace(/\/$/, "");
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:8000";
}

const apiBackend = backendApiBase();

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBackend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
