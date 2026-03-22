"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Activity, Zap, DollarSign, Layers, GitCompare,
  TrendingUp, TrendingDown, Minus,
  GitBranch, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  API,
  BORDER,
  CYAN,
  EMERALD,
  MUTED,
  PURPLE,
  ROSE,
  SURFACE,
  type Project,
  type Run,
  ProjectSelector,
  WorkspaceShell,
} from "@/components/agent-lab/workspace-ui";
import { VeraMascot } from "@/components/vera";

// ── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, iconColor, trend }: {
  label: string; value: string; sub: string;
  icon: LucideIcon; iconColor: string; trend?: number | null;
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-sm shadow-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}`, backdropFilter: "blur(8px)" }}>
      <p className="text-slate-500 mb-1 font-mono text-xs">{label}</p>
      <p style={{ color: PURPLE }} className="font-bold">{payload[0].value}% pass</p>
    </div>
  );
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-1 overflow-hidden"
        style={{
          background: `linear-gradient(145deg, rgba(124,58,237,0.2), ${SURFACE})`,
          border: `1px solid ${BORDER}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <VeraMascot size={72} showFootnote={false} title="VERA: no runs yet" animate />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>VERA · Versioning agent</p>
      <p className="text-xl font-semibold text-slate-200">No evaluations yet</p>
      <p className="text-slate-500 text-sm max-w-sm">Run your first evaluation to start tracking agent behaviour across versions.</p>
      <code className="mt-1 px-3 py-1.5 rounded-lg text-sm font-mono" style={{ background: SURFACE, color: PURPLE, border: `1px solid ${BORDER}` }}>
        agentlab eval --tag v1
      </code>
    </div>
  );
}

function NavCards({ projectQs }: { projectQs: string }) {
  const card: CSSProperties = {
    background: SURFACE,
    borderColor: BORDER,
  };
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <Link
        href={`/version-history${projectQs}`}
        className="group flex flex-col gap-3 rounded-xl border p-5 text-left transition-all hover:brightness-110"
        style={card}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${PURPLE}18`, boxShadow: `0 0 12px ${PURPLE}22` }}
          >
            <GitBranch size={20} style={{ color: PURPLE }} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Version history</h2>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: MUTED }}>
              Browse runs, notes, open a run, frozen snapshot.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>
          Open <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
      <Link
        href={`/diff-viewer${projectQs}`}
        className="group flex flex-col gap-3 rounded-xl border p-5 text-left transition-all hover:brightness-110"
        style={card}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${CYAN}18`, boxShadow: `0 0 12px ${CYAN}22` }}
          >
            <GitCompare size={20} style={{ color: CYAN }} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Diff Viewer</h2>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: MUTED }}>
              Pick two versions, then open side-by-side compare.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: CYAN }}>
          Open <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}

export default function OverviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("default");
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then((ps: Project[]) => {
        setProjects(ps);
        if (ps.length > 0) setSelectedProject(ps[0].name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url =
      selectedProject === "default"
        ? `${API}/api/versions`
        : `${API}/api/versions?project=${encodeURIComponent(selectedProject)}`;
    fetch(url)
      .then(r => r.json())
      .then((d: Run[]) => {
        setRuns(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  const latest = runs[runs.length - 1];
  const prev = runs[runs.length - 2];
  const trend = prev && latest ? Math.round((latest.success_rate - prev.success_rate) * 10) / 10 : null;
  const chartData = runs.map(r => ({ tag: r.version_tag, pass: r.success_rate }));
  const projectQs = selectedProject !== "default" ? `?project=${encodeURIComponent(selectedProject)}` : "";

  if (loading) {
    return (
      <WorkspaceShell>
        <div className="flex min-h-[18rem] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${CYAN}66`, borderTopColor: "transparent" }}
          />
          <p className="ml-3 text-sm text-slate-500">Loading runs…</p>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <div className="space-y-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-end gap-4 sm:gap-5">
            <VeraMascot size={44} showFootnote={false} className="hidden sm:block mb-0.5 shrink-0" title="VERA" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: CYAN }}>
                VERA · versioning agent
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-200">Evaluation Overview</h1>
              {runs.length > 0 && (
                <p className="text-slate-500 text-sm mt-1">
                  {runs.length} version{runs.length !== 1 ? "s" : ""} · {latest.total_cases}-sample dataset
                </p>
              )}
            </div>
            <div className="w-full min-w-[12rem] sm:w-auto">
              <ProjectSelector projects={projects} selected={selectedProject} onChange={p => setSelectedProject(p)} />
            </div>
          </div>

          {trend !== null && (
            <div
              className="flex shrink-0 items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
              style={{
                color: trend > 0 ? EMERALD : trend < 0 ? ROSE : MUTED,
                background: trend > 0 ? "rgba(52,211,153,0.12)" : trend < 0 ? "rgba(251,113,133,0.10)" : "rgba(100,116,139,0.10)",
                border: `1px solid ${trend > 0 ? "rgba(52,211,153,0.28)" : trend < 0 ? "rgba(251,113,133,0.25)" : "rgba(100,116,139,0.20)"}`,
              }}
            >
              {trend > 0 ? <TrendingUp size={13} /> : trend < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
              {trend > 0 ? "+" : ""}{trend}% vs previous
            </div>
          )}
        </div>

        <NavCards projectQs={projectQs} />

        {runs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Latest Pass Rate"
                value={`${latest.success_rate}%`}
                sub={`on ${latest.version_tag}`}
                icon={Activity}
                iconColor={latest.success_rate >= 80 ? EMERALD : latest.success_rate >= 50 ? "#F59E0B" : ROSE}
                trend={trend}
              />
              <MetricCard
                label="Avg Latency"
                value={`${latest.avg_latency_ms.toFixed(0)}`}
                sub="ms per call · last run"
                icon={Zap}
                iconColor="#F59E0B"
                trend={prev ? Math.round(latest.avg_latency_ms - prev.avg_latency_ms) : null}
              />
              <MetricCard
                label="Avg Cost / Call"
                value={`$${latest.avg_cost_usd.toFixed(4)}`}
                sub="last run"
                icon={DollarSign}
                iconColor="#A78BFA"
              />
              <MetricCard
                label="Versions Evaluated"
                value={String(runs.length)}
                sub={`${runs.reduce((s, r) => s + r.total_cases, 0)} total evals`}
                icon={Layers}
                iconColor={PURPLE}
              />
            </div>

            <div className="min-w-0 rounded-xl p-4 sm:p-6" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-200">Pass Rate Trend</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Golden dataset accuracy across versions · 80% target line</p>
                </div>
              </div>
              <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE} stopOpacity={0.38} />
                      <stop offset="55%" stopColor={CYAN} stopOpacity={0.14} />
                      <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lineAccent" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={PURPLE} />
                      <stop offset="100%" stopColor={CYAN} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tag" tick={{ fontSize: 11, fill: MUTED, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={80} stroke={EMERALD} strokeDasharray="4 4" strokeOpacity={0.5} strokeWidth={1} />
                  <Area
                    type="monotone"
                    dataKey="pass"
                    stroke="url(#lineAccent)"
                    strokeWidth={2.5}
                    fill="url(#purpleGrad)"
                    dot={{ r: 5, fill: PURPLE, stroke: "#0a0612", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: CYAN, style: { filter: "drop-shadow(0 0 8px rgba(34,211,238,0.65))" } }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
