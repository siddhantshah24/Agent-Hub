"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronDown, Code2, Database, X } from "lucide-react";

/**
 * Always use same-origin `/api/*` in the browser. Next.js rewrites those to FastAPI
 * (`AGENTLAB_BACKEND_URL` on Vercel). This fixes custom domains: a baked
 * `NEXT_PUBLIC_API_URL` pointing at `*.vercel.app` breaks fetches from `agent-hub-one-gilt.vercel.app`.
 * Local dev: `next dev` rewrites `/api` → `http://localhost:8000` (see next.config).
 */
export const API = "";

export const PURPLE = "#A78BFA";
export const CYAN = "#22D3EE";
export const EMERALD = "#34D399";
export const ROSE = "#FF7A96";
export const SURFACE = "#1a1528";
export const BORDER = "#3d3558";
export const MUTED = "#9B97BB";

/** Compact run time for tables; full string in title tooltip. */
export function formatRunTimestamp(ts: string | null | undefined): string {
  if (ts == null || ts === "") return "—";
  const normalized = ts.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts}Z`;
  try {
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function formatRunTimestampFull(ts: string | null | undefined): string {
  if (ts == null || ts === "") return "";
  const normalized = ts.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts}Z`;
  try {
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return ts;
  }
}

export interface Run {
  id: number;
  version_tag: string;
  success_rate: number;
  avg_latency_ms: number;
  avg_cost_usd: number;
  total_cases: number;
  snapshot_path: string | null;
  content_hash: string | null;
  timestamp: string;
  notes: string;
  avg_ragas_faithfulness: number | null;
  avg_ragas_relevancy: number | null;
  avg_ragas_precision: number | null;
}

export interface Project {
  name: string;
  display_name: string;
  run_count: number;
  latest_success_rate: number | null;
}

export interface Snapshot {
  available: boolean;
  tag: string;
  filename: string;
  content: string;
  reason?: string;
}

export const DASHBOARD_PAGE_STYLE: CSSProperties = {
  background: "#1c1729",
  borderColor: "rgba(61, 53, 96, 0.55)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.028)",
};

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative -mx-4 max-w-[100%] overflow-visible px-4 py-8 sm:-mx-6 sm:px-8 sm:py-10 rounded-2xl border min-w-0"
      style={DASHBOARD_PAGE_STYLE}
    >
      {children}
    </div>
  );
}

export function ProjectSelector({
  projects,
  selected,
  onChange,
}: {
  projects: Project[];
  selected: string;
  onChange: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = projects.find(p => p.name === selected);

  if (projects.length <= 1) return null;

  return (
    <div className="relative z-20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#EDE9F8" }}
      >
        <Database size={14} style={{ color: PURPLE }} />
        <span className="max-w-[12rem] truncate sm:max-w-[16rem]">{current?.display_name ?? "Select project"}</span>
        <ChevronDown
          size={13}
          style={{ color: MUTED, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[100] mt-2 w-max min-w-full max-w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl shadow-2xl"
          style={{ background: "#1A1729", border: `1px solid ${BORDER}` }}
          role="listbox"
          aria-label="Projects"
        >
          {projects.map(p => (
            <button
              key={p.name}
              type="button"
              role="option"
              aria-selected={selected === p.name}
              onClick={() => {
                onChange(p.name);
                setOpen(false);
              }}
              className="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-3 text-left text-sm transition-colors"
              style={{
                background: selected === p.name ? "rgba(139,92,246,0.12)" : "transparent",
                color: selected === p.name ? PURPLE : "#EDE9F8",
                borderBottom: `1px solid ${BORDER}`,
              }}
              onMouseEnter={e => {
                if (selected !== p.name) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background =
                  selected === p.name ? "rgba(139,92,246,0.12)" : "transparent";
              }}
            >
              <span className="min-w-0 shrink font-semibold">{p.display_name}</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-xs tabular-nums" style={{ color: MUTED }}>
                {p.run_count} runs
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SnapshotModal({ tag, project, onClose }: { tag: string; project: string; onClose: () => void }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url =
      project === "default"
        ? `${API}/api/snapshot/${encodeURIComponent(tag)}`
        : `${API}/api/snapshot/${encodeURIComponent(tag)}?project=${encodeURIComponent(project)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setSnap(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tag, project]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="snapshot-modal-title"
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "#131122", border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <Code2 size={16} style={{ color: PURPLE }} />
            <span id="snapshot-modal-title" className="font-semibold text-slate-200">
              Agent Snapshot
            </span>
            <span
              className="rounded px-2 py-0.5 font-mono text-xs"
              style={{
                background: "rgba(139,92,246,0.15)",
                color: PURPLE,
                border: `1px solid rgba(139,92,246,0.3)`,
              }}
            >
              {tag}
            </span>
            {snap?.filename && (
              <span className="font-mono text-xs" style={{ color: MUTED }}>
                {snap.filename}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/5">
            <X size={16} style={{ color: MUTED }} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: PURPLE, borderTopColor: "transparent" }}
              />
            </div>
          ) : !snap?.available ? (
            <p className="py-8 text-center text-sm text-slate-500">{snap?.reason ?? "Snapshot not available."}</p>
          ) : (
            <div className="overflow-auto rounded-xl" style={{ border: `1px solid ${BORDER}` }}>
              <SyntaxHighlighter
                language="python"
                style={vscDarkPlus}
                showLineNumbers
                lineNumberStyle={{ color: "#4A4565", minWidth: "3em", paddingRight: "1em", userSelect: "none" }}
                customStyle={{ margin: 0, background: "#0D0B1A", padding: "1.5rem", fontSize: "0.82rem", lineHeight: "1.65" }}
                codeTagProps={{ style: { fontFamily: "var(--font-mono), 'JetBrains Mono', monospace" } }}
              >
                {snap.content ?? ""}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VersionHistoryRunTable({
  runs,
  selectedTag,
  onSelect,
}: {
  runs: Run[];
  selectedTag: string;
  onSelect: (tag: string) => void;
}) {
  const rev = [...runs].reverse();
  return (
    <div
      className="overflow-auto rounded-lg border"
      style={{ borderColor: BORDER, maxHeight: "min(260px, 42vh)" }}
    >
      <table className="w-full table-fixed border-collapse text-left text-[11px]">
        <thead className="sticky top-0 z-[1]" style={{ background: "#14101f", boxShadow: "0 1px 0 rgba(61,53,88,0.9)" }}>
          <tr>
            <th className="w-[30%] px-2.5 py-2 font-medium text-slate-500">Version</th>
            <th className="w-[11%] px-2 py-2 font-medium text-slate-500">Pass</th>
            <th className="w-[24%] px-2 py-2 font-medium text-slate-500">Time</th>
            <th className="w-[35%] px-2 py-2 font-medium text-slate-500">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rev.map(r => {
            const sel = selectedTag === r.version_tag;
            const timeLabel = formatRunTimestamp(r.timestamp);
            const timeTitle = formatRunTimestampFull(r.timestamp);
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.version_tag)}
                className="cursor-pointer border-b transition-colors"
                style={{
                  borderColor: BORDER,
                  background: sel ? "rgba(139,92,246,0.14)" : undefined,
                }}
                onMouseEnter={e => {
                  if (!sel) (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.06)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = sel ? "rgba(139,92,246,0.14)" : "transparent";
                }}
              >
                <td className="px-2.5 py-2 font-mono font-semibold text-slate-200">{r.version_tag}</td>
                <td
                  className="px-2 py-2 tabular-nums"
                  style={{ color: r.success_rate >= 80 ? EMERALD : r.success_rate >= 50 ? "#F59E0B" : ROSE }}
                >
                  {r.success_rate}%
                </td>
                <td className="px-2 py-2 tabular-nums whitespace-nowrap" style={{ color: MUTED }} title={timeTitle || undefined}>
                  {timeLabel}
                </td>
                <td className="min-w-0 px-2 py-2">
                  <span className="block truncate" style={{ color: MUTED }} title={r.notes?.trim() ? r.notes : "No notes"}>
                    {r.notes?.trim() ? r.notes : "-"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DiffPickRunTable({
  runs,
  selected,
  onSelect,
  label,
  accent,
}: {
  runs: Run[];
  selected: string;
  onSelect: (tag: string) => void;
  label: string;
  accent: "v1" | "v2";
}) {
  const rev = [...runs].reverse();
  const hi = accent === "v1" ? "rgba(139,92,246,0.16)" : "rgba(34,211,238,0.10)";
  const hiHover = accent === "v1" ? "rgba(139,92,246,0.08)" : "rgba(34,211,238,0.06)";
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
        {label}
      </span>
      <div
        className="overflow-auto rounded-lg border"
        style={{ borderColor: BORDER, maxHeight: "min(220px, 38vh)" }}
      >
        <table className="w-full table-fixed border-collapse text-left text-[11px]">
          <thead className="sticky top-0 z-[1]" style={{ background: "#14101f", boxShadow: "0 1px 0 rgba(61,53,88,0.9)" }}>
            <tr>
              <th className="w-[34%] px-2 py-2 font-medium text-slate-500">Version</th>
              <th className="w-[26%] px-2 py-2 font-medium text-slate-500">Time</th>
              <th className="w-[40%] px-2 py-2 font-medium text-slate-500">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rev.map(r => {
              const sel = selected === r.version_tag;
              const timeLabel = formatRunTimestamp(r.timestamp);
              const timeTitle = formatRunTimestampFull(r.timestamp);
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.version_tag)}
                  className="cursor-pointer border-b transition-colors"
                  style={{
                    borderColor: BORDER,
                    background: sel ? hi : undefined,
                  }}
                  onMouseEnter={e => {
                    if (!sel) (e.currentTarget as HTMLElement).style.background = hiHover;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = sel ? hi : "transparent";
                  }}
                >
                  <td className="px-2 py-2 font-mono font-semibold text-slate-200">{r.version_tag}</td>
                  <td className="px-2 py-2 tabular-nums whitespace-nowrap" style={{ color: MUTED }} title={timeTitle || undefined}>
                    {timeLabel}
                  </td>
                  <td className="min-w-0 px-2 py-2">
                    <span className="block truncate" style={{ color: MUTED }} title={r.notes?.trim() ? r.notes : "No notes"}>
                      {r.notes?.trim() ? r.notes : "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
