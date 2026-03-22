"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Activity, Zap, DollarSign, Layers, GitCompare,
  TrendingUp, TrendingDown, Minus, Shield, ChevronRight,
  Code2, X, ChevronDown, Database, BarChart2, Pencil, Check,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Run {
  id: number; version_tag: string; success_rate: number;
  avg_latency_ms: number; avg_cost_usd: number;
  total_cases: number; snapshot_path: string | null;
  content_hash: string | null; timestamp: string;
  notes: string;
}
interface Project {
  name: string; display_name: string; run_count: number;
  latest_success_rate: number | null;
}
interface Snapshot {
  available: boolean; tag: string; filename: string; content: string; reason?: string;
}

const PURPLE  = "#A78BFA";
const EMERALD = "#4ADE80";
const ROSE    = "#FF7A96";
const AMB     = "#F59E0B";
const SURFACE = "#231F3A";
const BORDER  = "#3D3860";
const MUTED   = "#9B97BB";

// ── Inline notes editor ──────────────────────────────────────────────────────
function NotesCell({ tag, initialNotes, project }: { tag: string; initialNotes: string; project: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (value === initialNotes) { setEditing(false); return; }
    setSaving(true);
    const pq = project !== "default" ? `?project=${encodeURIComponent(project)}` : "";
    await fetch(`${API}/api/runs/${encodeURIComponent(tag)}/notes${pq}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    }).catch(() => {});
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-start gap-1.5" onClick={e => e.stopPropagation()}>
        <textarea
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === "Escape") setEditing(false); }}
          rows={2}
          className="flex-1 text-xs rounded-lg px-2 py-1 resize-none outline-none"
          style={{ background: "#131122", border: `1px solid ${PURPLE}40`, color: "#C9D1D9", fontFamily: "var(--font-mono, monospace)" }}
          placeholder="Add notes…"
        />
        <button onClick={save} disabled={saving}
          className="mt-0.5 p-1 rounded-md transition-colors"
          style={{ color: EMERALD, background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)" }}>
          <Check size={11} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      className="flex items-center gap-1.5 group cursor-pointer"
      title="Click to add/edit notes"
    >
      {value ? (
        <span className="text-xs leading-relaxed" style={{ color: MUTED, maxWidth: "200px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      ) : (
        <span className="text-[10px] italic" style={{ color: BORDER }}>Add notes…</span>
      )}
      <Pencil size={9} className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" style={{ color: MUTED }} />
    </div>
  );
}

// ── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, iconColor, trend }: {
  label: string; value: string; sub: string;
  icon: React.ElementType; iconColor: string; trend?: number | null;
}) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? EMERALD : trend && trend < 0 ? ROSE : MUTED;
  return (
    <div className="card-surface p-5 flex flex-col gap-4 cursor-default" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${iconColor}18`, boxShadow: `0 0 12px ${iconColor}22` }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
        {trend !== undefined && trend !== null && (
          <div className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: trendColor, background: `${trendColor}15`, border: `1px solid ${trendColor}30` }}>
            <TrendIcon size={10} />
            {trend > 0 ? "+" : ""}{trend}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-1">{label}</p>
        <p className="text-3xl font-bold tracking-tight text-slate-200 font-mono">{value}</p>
        <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Recharts tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-sm shadow-2xl" style={{ background: "#1A1825", border: `1px solid ${BORDER}`, backdropFilter: "blur(8px)" }}>
      <p className="text-slate-500 mb-1 font-mono text-xs">{label}</p>
      <p style={{ color: PURPLE }} className="font-bold">{payload[0].value}% pass</p>
    </div>
  );
};

// ── Pass rate pill ─────────────────────────────────────────────────────────────
function PassPill({ rate }: { rate: number }) {
  const color = rate >= 80 ? EMERALD : rate >= 50 ? "#F59E0B" : ROSE;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#2A263D" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-10 text-right" style={{ color }}>{rate}%</span>
    </div>
  );
}

// ── Project selector ──────────────────────────────────────────────────────────
function ProjectSelector({ projects, selected, onChange }: {
  projects: Project[]; selected: string; onChange: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = projects.find(p => p.name === selected);

  if (projects.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#EDE9F8" }}
      >
        <Database size={14} style={{ color: PURPLE }} />
        <span>{current?.display_name ?? "Select project"}</span>
        <ChevronDown size={13} style={{ color: MUTED, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 left-0 z-50 rounded-xl overflow-hidden shadow-2xl min-w-[240px]"
          style={{ background: "#1A1729", border: `1px solid ${BORDER}` }}
        >
          {projects.map(p => (
            <button
              key={p.name}
              onClick={() => { onChange(p.name); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors"
              style={{
                background: selected === p.name ? "rgba(139,92,246,0.12)" : "transparent",
                color: selected === p.name ? PURPLE : "#EDE9F8",
                borderBottom: `1px solid ${BORDER}`,
              }}
              onMouseEnter={e => { if (selected !== p.name) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected === p.name ? "rgba(139,92,246,0.12)" : "transparent"; }}
            >
              <span className="font-semibold">{p.display_name}</span>
              <span className="text-xs font-mono" style={{ color: MUTED }}>{p.run_count} runs</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Snapshot modal ────────────────────────────────────────────────────────────
function SnapshotModal({ tag, project, onClose }: { tag: string; project: string; onClose: () => void }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = project === "default"
      ? `${API}/api/snapshot/${encodeURIComponent(tag)}`
      : `${API}/api/snapshot/${encodeURIComponent(tag)}?project=${encodeURIComponent(project)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setSnap(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tag, project]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ background: "#131122", border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <Code2 size={16} style={{ color: PURPLE }} />
            <span className="font-semibold text-slate-200">Agent Snapshot</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.15)", color: PURPLE, border: `1px solid rgba(139,92,246,0.3)` }}>{tag}</span>
            {snap?.filename && (
              <span className="text-xs font-mono" style={{ color: MUTED }}>{snap.filename}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <X size={16} style={{ color: MUTED }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PURPLE, borderTopColor: "transparent" }} />
            </div>
          ) : !snap?.available ? (
            <p className="text-slate-500 text-sm text-center py-8">{snap?.reason ?? "Snapshot not available."}</p>
          ) : (
            <div className="rounded-xl overflow-auto" style={{ border: `1px solid ${BORDER}` }}>
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

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <Activity size={28} style={{ color: PURPLE }} />
      </div>
      <p className="text-xl font-semibold text-slate-200">No evaluations yet</p>
      <p className="text-slate-500 text-sm max-w-sm">Run your first evaluation to start tracking agent behaviour across versions.</p>
      <code className="mt-1 px-3 py-1.5 rounded-lg text-sm font-mono" style={{ background: SURFACE, color: PURPLE, border: `1px solid ${BORDER}` }}>
        agentlab eval --tag v1
      </code>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const router = useRouter();
  const [projects, setProjects]     = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("default");
  const [runs, setRuns]             = useState<Run[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selA, setSelA]             = useState<string | null>(null);
  const [selB, setSelB]             = useState<string | null>(null);
  const [snapTag, setSnapTag]       = useState<string | null>(null);

  // Load project list once
  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then((ps: Project[]) => {
        setProjects(ps);
        if (ps.length > 0) setSelectedProject(ps[0].name);
      })
      .catch(() => {});
  }, []);

  // Load runs whenever project changes
  useEffect(() => {
    setLoading(true);
    setSelA(null); setSelB(null);
    const url = selectedProject === "default"
      ? `${API}/api/versions`
      : `${API}/api/versions?project=${encodeURIComponent(selectedProject)}`;
    fetch(url)
      .then(r => r.json())
      .then((d: Run[]) => { setRuns(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  function toggle(tag: string) {
    if (selA === tag) { setSelA(null); return; }
    if (selB === tag) { setSelB(null); return; }
    if (!selA) { setSelA(tag); return; }
    if (!selB) { setSelB(tag); return; }
    setSelA(selB); setSelB(tag);
  }

  function goCompare() {
    if (!selA || !selB) return;
    const base = `/diff?v1=${encodeURIComponent(selA)}&v2=${encodeURIComponent(selB)}`;
    const proj = selectedProject !== "default" ? `&project=${encodeURIComponent(selectedProject)}` : "";
    router.push(base + proj);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PURPLE, borderTopColor: "transparent" }} />
        <p className="text-slate-500 text-sm">Loading runs…</p>
      </div>
    </div>
  );

  const latest = runs[runs.length - 1];
  const prev   = runs[runs.length - 2];
  const trend  = prev ? Math.round((latest.success_rate - prev.success_rate) * 10) / 10 : null;
  const chartData = runs.map(r => ({ tag: r.version_tag, pass: r.success_rate }));

  return (
    <div className="space-y-8">
      {/* Snapshot modal */}
      {snapTag && (
        <SnapshotModal
          tag={snapTag}
          project={selectedProject}
          onClose={() => setSnapTag(null)}
        />
      )}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="flex items-end gap-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-200">Evaluation Overview</h1>
            {runs.length > 0 && (
              <p className="text-slate-500 text-sm mt-1">
                {runs.length} version{runs.length !== 1 ? "s" : ""} · {latest.total_cases}-sample dataset
              </p>
            )}
          </div>
          <ProjectSelector projects={projects} selected={selectedProject} onChange={p => setSelectedProject(p)} />
        </div>

        {trend !== null && (
          <div
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{
              color: trend > 0 ? EMERALD : trend < 0 ? ROSE : MUTED,
              background: trend > 0 ? "rgba(52,211,153,0.10)" : trend < 0 ? "rgba(251,113,133,0.10)" : "rgba(100,116,139,0.10)",
              border: `1px solid ${trend > 0 ? "rgba(52,211,153,0.25)" : trend < 0 ? "rgba(251,113,133,0.25)" : "rgba(100,116,139,0.20)"}`,
            }}
          >
            {trend > 0 ? <TrendingUp size={13} /> : trend < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
            {trend > 0 ? "+" : ""}{trend}% vs previous
          </div>
        )}
      </div>

      {runs.length === 0 ? <EmptyState /> : <>

        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Latest Pass Rate" value={`${latest.success_rate}%`} sub={`on ${latest.version_tag}`} icon={Activity}
            iconColor={latest.success_rate >= 80 ? EMERALD : latest.success_rate >= 50 ? "#F59E0B" : ROSE} trend={trend} />
          <MetricCard label="Avg Latency" value={`${latest.avg_latency_ms.toFixed(0)}`} sub="ms per call · last run" icon={Zap} iconColor="#F59E0B"
            trend={prev ? Math.round(latest.avg_latency_ms - prev.avg_latency_ms) : null} />
          <MetricCard label="Avg Cost / Call" value={`$${latest.avg_cost_usd.toFixed(4)}`} sub="last run · gpt-4o-mini" icon={DollarSign} iconColor="#A78BFA" />
          <MetricCard label="Versions Evaluated" value={String(runs.length)} sub={`${runs.reduce((s, r) => s + r.total_cases, 0)} total evals`} icon={Layers} iconColor={PURPLE} />
        </div>

        {/* ── Area chart ─────────────────────────────────────────────────────── */}
        <div className="rounded-xl p-6" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-200">Pass Rate Trend</h2>
              <p className="text-xs text-slate-500 mt-0.5">Golden dataset accuracy across versions · 80% target line</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={PURPLE} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="tag" tick={{ fontSize: 11, fill: MUTED, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={80} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="pass" stroke={PURPLE} strokeWidth={2.5} fill="url(#purpleGrad)"
                dot={{ r: 5, fill: PURPLE, stroke: "#0B0A10", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: PURPLE, style: { filter: "drop-shadow(0 0 6px #8B5CF6)" } }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Version history table ────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <h2 className="font-semibold text-slate-200">Version History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selA && selB
                  ? <span style={{ color: PURPLE }}>Ready to compare <span className="font-mono">{selA}</span> ↔ <span className="font-mono">{selB}</span></span>
                  : selA ? `Select a second version to compare with ${selA}` : "Click rows to select for comparison · 📄 to view snapshot"}
              </p>
            </div>
            {selA && selB && (
              <button onClick={goCompare}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7C3AED, #8B5CF6)", color: "#fff" }}>
                <GitCompare size={14} />
                Compare {selA} ↔ {selB}
                <ChevronRight size={13} />
              </button>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Version", "Notes", "Pass Rate", "Latency", "Cost", "Cases", "Actions", "When"].map(h => (
                  <th key={h} className={`py-3 text-[11px] font-medium uppercase tracking-wider text-slate-500 ${h === "Version" || h === "Notes" ? "text-left px-6" : h === "When" ? "text-right px-6" : "text-right px-4"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const reversed = [...runs].reverse();
                // Build a set of hashes that appear more than once (for unchanged indicator)
                const hashCount: Record<string, number> = {};
                runs.forEach(r => { if (r.content_hash) hashCount[r.content_hash] = (hashCount[r.content_hash] ?? 0) + 1; });
                return reversed.map((run, ri) => {
                  const isA = selA === run.version_tag;
                  const isB = selB === run.version_tag;
                  const sel = isA || isB;
                  // Unchanged: same hash as the next older run
                  const nextOlder = reversed[ri + 1];
                  const unchanged = !!(run.content_hash && nextOlder?.content_hash && run.content_hash === nextOlder.content_hash);
                  return (
                  <tr
                    key={run.id}
                    onClick={() => toggle(run.version_tag)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${BORDER}`, background: sel ? "rgba(139,92,246,0.07)" : undefined }}
                    onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "#1A1825"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = sel ? "rgba(139,92,246,0.07)" : ""; }}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-200">{run.version_tag}</span>
                        {isA && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: PURPLE, background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.30)" }}>A</span>}
                        {isB && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: EMERALD, background: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.30)" }}>B</span>}
                        {run.content_hash && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" title={`Content hash: ${run.content_hash}`}
                            style={{ color: MUTED, background: "rgba(155,151,187,0.08)", border: `1px solid ${BORDER}` }}>
                            #{run.content_hash}
                          </span>
                        )}
                        {unchanged && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            title="Agent code unchanged from previous run"
                            style={{ color: AMB, background: "rgba(252,211,77,0.10)", border: "1px solid rgba(252,211,77,0.25)" }}>
                            ≡ unchanged
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <NotesCell tag={run.version_tag} initialNotes={run.notes ?? ""} project={selectedProject} />
                    </td>
                    <td className="px-4 py-3.5 w-52"><PassPill rate={run.success_rate} /></td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-400">{run.avg_latency_ms.toFixed(0)} ms</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-400">${run.avg_cost_usd.toFixed(4)}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-500">{run.total_cases}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const proj = selectedProject !== "default" ? `?project=${encodeURIComponent(selectedProject)}` : "";
                            router.push(`/run/${encodeURIComponent(run.version_tag)}${proj}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                          style={{ color: PURPLE, background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)" }}
                          title="View run details and sample results"
                        >
                          <BarChart2 size={10} />
                          Details
                        </button>
                        {run.snapshot_path && (
                          <button
                            onClick={e => { e.stopPropagation(); setSnapTag(run.version_tag); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                            style={{ color: EMERALD, background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)" }}
                            title="View agent source code snapshot"
                          >
                            <Shield size={10} />
                            Code
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs text-slate-500 font-mono">
                      {new Date(run.timestamp + "Z").toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
