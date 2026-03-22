import type { AgentSnapshotData } from "@/components/agent-lab/agent-snapshot-view";

/**
 * Normalizes GET /api/snapshot/{tag} responses so the UI always gets a proper
 * `{ available, reason? }` shape (FastAPI 404 returns `{ detail }`, and network
 * failures must not leave consumers stuck on "Loading…").
 */
export async function fetchAgentSnapshot(
  tag: string,
  project: string,
  apiBase = ""
): Promise<AgentSnapshotData> {
  const proj = !project || project === "default" ? "default" : project;
  const pq = proj !== "default" ? `?project=${encodeURIComponent(proj)}` : "";
  const url = `${apiBase}/api/snapshot/${encodeURIComponent(tag)}${pq}`;
  try {
    const r = await fetch(url);
    const data: unknown = await r.json().catch(() => ({}));
    if (!r.ok) {
      const obj = data as { detail?: unknown };
      const detail =
        typeof obj?.detail === "string"
          ? obj.detail
          : Array.isArray(obj?.detail)
            ? obj.detail.map((d: { msg?: string }) => d?.msg ?? d).join("; ")
            : `Snapshot request failed (${r.status})`;
      return { available: false, reason: detail };
    }
    if (
      data &&
      typeof data === "object" &&
      "available" in data &&
      typeof (data as AgentSnapshotData).available === "boolean"
    ) {
      return data as AgentSnapshotData;
    }
    return { available: false, reason: "Invalid snapshot response from API." };
  } catch {
    return { available: false, reason: "Could not load snapshot (network error)." };
  }
}
