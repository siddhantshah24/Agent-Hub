import type { NextConfig } from "next";

/**
 * Browser-visible API origin (no trailing slash).
 * - Local: http://localhost:8000 (direct to FastAPI)
 * - Vercel: https://<deployment> so fetches stay same-origin; Next rewrites proxy to the real backend.
 * - Custom domain: set NEXT_PUBLIC_API_URL=https://your-domain.com
 */
function publicApiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:8000";
}

/**
 * Where Next.js rewrites /api/* to (FastAPI). On Vercel this must be your EC2 (or other) HTTP(S) URL.
 * Set in Vercel: AGENTLAB_BACKEND_URL=http://YOUR_EC2_IP:8000
 */
function backendApiBase(): string {
  const back = process.env.AGENTLAB_BACKEND_URL?.trim();
  if (back) return back.replace(/\/$/, "");
  return publicApiBase();
}

const apiPublic = publicApiBase();
const apiBackend = backendApiBase();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: apiPublic,
  },
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
