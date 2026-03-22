"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Activity, Zap, DollarSign, Layers, GitCompare,
  TrendingUp, TrendingDown, Minus, ChevronRight,
  Code2, X, ChevronDown, Pencil, Check, Shield,
} from "lucide-react";
import {
  API, PURPLE, EMERALD, ROSE, SURFACE, BORDER, MUTED,
  type Run, type Project, type Snapshot,
  ProjectSelector, SnapshotModal, WorkspaceShell,
} from "@/components/agent-lab/workspace-ui";

const AMB = "#F59E0B";

// ── Inline notes editor ─────────────────────────────────────────────────────
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
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          className="flex-1 rounded-md px-2 py-1 text-xs text-slate-200 outline-none"
          style={{ background: "#2a2540", border: `1px solid ${BORDER}` }}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        />
        <button onClick={save} disabled={saving} className="p-1 rounded" style={{ color: EMERALD }}>
          <Check size={12} />
        </button>
      </div>
    );
  }
  return (
    <div className="group flex items-center gap-1.5 cursor-pointer" onClick={e => { e.stopPropagation(); setEditing(true); }}>
      <span className="text-xs truncate max-w-[160px]" style={{ color: value.trim() ? "rgb(148 163 184)" : MUTED }}>
        {value.trim() || "add note…"}
      </span>
      <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" style={{ color: MUTED }} />
    </div>
  );
}

// ── Metric card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: number;
}) {
  const TrendIcon = trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend == null ? MUTED : trend > 0 ? EMERALD : trend < 0 ? ROSE : MUTED;
  return (
    <div className="rounded-xl p-5 transition-colors" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-100">{value}</p>
      {(sub || TrendIcon) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {TrendIcon && <TrendIcon size={11} style={{ color: trendColor }} />}
          {sub && <span className="text-xs" style={{ color: MUTED }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState(searchParams.get("project") ?? "default");
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [snapTag, setSnapTag] = useState<string | null>(null);

  // Load projects list
  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then(d => {
        setProjects(d.projects ?? []);
        if (d.projects?.length && project === "default") {
          const first = d.projects[0].name;
          setProject(first);
        }
      })
      .catch(() => {});
  }, []);

  // Load runs whenever project changes
  useEffect(() => {
    setLoading(true);
    setSelected([]);
    const url = project === "default"
      ? `${API}/api/versions`
      : `${API}/api/versions?project=${encodeURIComponent(project)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setRuns(d.runs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [project]);

  const latest = runs[runs.length - 1];
  const prev   = runs[runs.length - 2];

  const chartData = runs.map(r => ({
    tag: r.version_tag.replace(/^run-\d+-/, "").slice(0, 8),
    pass: r.success_rate,
    full_tag: r.version_tag,
  }));

  function toggleSelect(tag: string) {
    setSelected(s =>
      s.includes(tag) ? s.filter(x => x !== tag)
        : s.length < 2 ? [...s, tag]
        : [s[1], tag]
    );
  }

  function goCompare() {
    if (selected.length !== 2) return;
    const [v1, v2] = selected;
    router.push(`/diff?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}&project=${encodeURIComponent(project)}`);
  }

  function goRun(tag: string) {
    router.push(`/run/${encodeURIComponent(tag)}?project=${encodeURIComponent(project)}`);
  }

  const srTrend = latest && prev ? latest.success_rate - prev.success_rate : undefined;
  const latTrend = latest && prev ? prev.avg_latency_ms - latest.avg_latency_ms : undefined;

  return (
    <WorkspaceShell>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Evaluation Overview</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            {runs.length} version{runs.length !== 1 ? "s" : ""} evaluated
            {latest && ` · latest: ${latest.total_cases} samples`}
          </p>
        </div>
        <ProjectSelector projects={projects} selected={project} onChange={setProject} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: PURPLE, borderTopColor: "transparent" }} />
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <p className="text-slate-400">No runs found for this project.</p>
          <code className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "#1a1528", color: EMERALD, border: `1px solid ${BORDER}` }}>
            agentlab eval --tag v1
          </code>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Latest Success Rate" value={`${latest.success_rate}%`}
              sub={`${latest.total_cases} samples`} icon={Activity} color={EMERALD}
              trend={srTrend} />
            <StatCard label="Avg Latency" value={`${latest.avg_latency_ms.toFixed(0)} ms`}
              sub="last run" icon={Zap} color={AMB} trend={latTrend} />
            <StatCard label="Avg Cost / Run" value={`$${latest.avg_cost_usd.toFixed(5)}`}
              sub="last run" icon={DollarSign} color={PURPLE} />
            <StatCard label="Versions Evaluated" value={String(runs.length)}
              sub="all time" icon={Layers} color={PURPLE} />
          </div>

          {/* Chart */}
          <div className="rounded-xl p-5 mb-6" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} style={{ color: PURPLE }} />
              <span className="text-sm font-semibold text-slate-200">Success Rate Over Versions</span>
              <span className="text-xs ml-auto" style={{ color: MUTED }}>golden dataset pass rate (%)</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad-pass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PURPLE} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2A263D" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="tag" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1A1729", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: PURPLE }}
                  itemStyle={{ color: EMERALD }}
                />
                <ReferenceLine y={80} stroke={EMERALD} strokeDasharray="4 4" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="pass" stroke={PURPLE} strokeWidth={2}
                  fill="url(#grad-pass)" dot={{ fill: PURPLE, r: 3 }} activeDot={{ r: 5, fill: PURPLE }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Version history table */}
          <div className="rounded-xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER}`, background: "#1A1729" }}>
              <div className="flex items-center gap-2">
                <Layers size={14} style={{ color: PURPLE }} />
                <span className="text-sm font-semibold text-slate-200">Version History</span>
                {selected.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#A78BFA20", color: PURPLE }}>
                    {selected.length}/2 selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: MUTED }}>
                  {selected.length < 2 ? "Click rows to select for comparison." : ""}
                </span>
                <button
                  onClick={goCompare}
                  disabled={selected.length !== 2}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: selected.length === 2 ? "linear-gradient(135deg, #7C3AED, #6D28D9)" : "#2a2540",
                    color: selected.length === 2 ? "white" : MUTED,
                    border: `1px solid ${selected.length === 2 ? "#7C3AED50" : BORDER}`,
                    opacity: selected.length === 2 ? 1 : 0.6,
                  }}
                >
                  <GitCompare size={12} /> Compare
                </button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Version", "Success Rate", "Avg Latency", "Avg Cost", "Cases", "Timestamp", "Notes", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...runs].reverse().map(r => {
                    const isSelected = selected.includes(r.version_tag);
                    const hashShort = r.content_hash ? r.content_hash.slice(0, 8) : null;
                    const prevRun = runs[runs.indexOf(r) - 1];
                    const unchanged = prevRun && prevRun.content_hash && r.content_hash === prevRun.content_hash;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => toggleSelect(r.version_tag)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: `1px solid ${BORDER}`,
                          background: isSelected ? "rgba(167,139,250,0.08)" : undefined,
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#1A1825"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? "rgba(167,139,250,0.08)" : ""; }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-sm" style={{ color: isSelected ? PURPLE : "white" }}>
                                {r.version_tag}
                              </span>
                              {r.avg_ragas_faithfulness != null && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{
                                  color: r.avg_ragas_faithfulness >= 0.8 ? EMERALD : r.avg_ragas_faithfulness >= 0.6 ? AMB : ROSE,
                                  background: "rgba(255,255,255,0.06)",
                                }}>
                                  F:{r.avg_ragas_faithfulness.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {hashShort && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(155,151,187,0.1)", border: `1px solid ${BORDER}` }}>
                                  #{hashShort}
                                </span>
                              )}
                              {unchanged && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: AMB, background: "rgba(245,158,11,0.08)" }}>
                                  ≡ unchanged
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: r.success_rate >= 80 ? EMERALD : r.success_rate >= 50 ? AMB : ROSE }}>
                            {r.success_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{r.avg_latency_ms.toFixed(0)} ms</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">${r.avg_cost_usd.toFixed(6)}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{r.total_cases}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                          {new Date(r.timestamp + "Z").toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <NotesCell tag={r.version_tag} initialNotes={r.notes ?? ""} project={project} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={e => { e.stopPropagation(); setSnapTag(r.version_tag); }}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                              title="View snapshot"
                            >
                              <Code2 size={13} style={{ color: MUTED }} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); goRun(r.version_tag); }}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                              title="View run details"
                            >
                              <ChevronRight size={13} style={{ color: MUTED }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RAGAS summary if available */}
          {latest.avg_ragas_faithfulness != null && (
            <div className="mt-4 rounded-xl p-4 flex flex-wrap gap-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <Shield size={14} style={{ color: PURPLE }} className="mt-0.5" />
              <span className="text-xs font-medium text-slate-300">RAGAS (latest):</span>
              {[
                { label: "Faithfulness", val: latest.avg_ragas_faithfulness },
                { label: "Relevancy", val: latest.avg_ragas_relevancy },
                { label: "Precision", val: latest.avg_ragas_precision },
              ].map(({ label, val }) => val != null && (
                <span key={label} className="text-xs font-mono" style={{ color: val >= 0.8 ? EMERALD : val >= 0.6 ? AMB : ROSE }}>
                  {label}: {val.toFixed(3)}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Snapshot modal */}
      {snapTag && <SnapshotModal tag={snapTag} project={project} onClose={() => setSnapTag(null)} />}
    </WorkspaceShell>
  );
}
