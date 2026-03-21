"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Activity, Zap, DollarSign, Layers, GitCompare,
  TrendingUp, TrendingDown, Minus, Shield, ChevronRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Run {
  id: number; version_tag: string; success_rate: number;
  avg_latency_ms: number; avg_cost_usd: number;
  total_cases: number; snapshot_path: string | null; timestamp: string;
}

// ── Palette constants ────────────────────────────────────────────────────────
const PURPLE   = "#A78BFA";   // violet-400 — lighter, more readable
const EMERALD  = "#4ADE80";   // emerald-400
const ROSE     = "#FF7A96";   // rose-400 lighter
const SURFACE  = "#231F3A";   // lifted card surface
const BORDER   = "#3D3860";   // visible border
const MUTED    = "#9B97BB";   // much more readable than before

// ── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, icon: Icon, iconColor, trend,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; iconColor: string; trend?: number | null;
}) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? EMERALD : trend && trend < 0 ? ROSE : MUTED;

  return (
    <div
      className="card-surface p-5 flex flex-col gap-4 cursor-default"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${iconColor}18`, boxShadow: `0 0 12px ${iconColor}22` }}
        >
          <Icon size={17} style={{ color: iconColor }} />
        </div>

        {trend !== undefined && trend !== null && (
          <div
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: trendColor, background: `${trendColor}15`, border: `1px solid ${trendColor}30` }}
          >
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

// ── Recharts tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm shadow-2xl"
      style={{ background: "#1A1825", border: `1px solid ${BORDER}`, backdropFilter: "blur(8px)" }}
    >
      <p className="text-slate-500 mb-1 font-mono text-xs">{label}</p>
      <p style={{ color: PURPLE }} className="font-bold">{payload[0].value}% pass</p>
      {payload[1] && (
        <p style={{ color: EMERALD }} className="font-bold">{payload[1].value} ms</p>
      )}
    </div>
  );
};

// ── Pass rate pill ────────────────────────────────────────────────────────────
function PassPill({ rate }: { rate: number }) {
  const isGood = rate >= 80;
  const isMid  = rate >= 50;
  const color  = isGood ? EMERALD : isMid ? "#F59E0B" : ROSE;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#2A263D" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-10 text-right" style={{ color }}>{rate}%</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/versions`)
      .then(r => r.json())
      .then((d: Run[]) => { setRuns(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggle(tag: string) {
    if (selA === tag) { setSelA(null); return; }
    if (selB === tag) { setSelB(null); return; }
    if (!selA) { setSelA(tag); return; }
    if (!selB) { setSelB(tag); return; }
    setSelA(selB); setSelB(tag);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PURPLE, borderTopColor: "transparent" }} />
        <p className="text-slate-500 text-sm">Loading runs…</p>
      </div>
    </div>
  );

  if (runs.length === 0) return <EmptyState />;

  const latest = runs[runs.length - 1];
  const prev   = runs[runs.length - 2];
  const trend  = prev ? Math.round((latest.success_rate - prev.success_rate) * 10) / 10 : null;

  const chartData = runs.map(r => ({
    tag: r.version_tag,
    pass: r.success_rate,
    latency: Math.round(r.avg_latency_ms),
  }));

  return (
    <div className="space-y-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-200">Evaluation Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            {runs.length} version{runs.length !== 1 ? "s" : ""} evaluated · {latest.total_cases}-sample golden dataset
          </p>
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

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          trend={prev ? Math.round((latest.avg_latency_ms - prev.avg_latency_ms)) : null}
        />
        <MetricCard
          label="Avg Cost / Call"
          value={`$${latest.avg_cost_usd.toFixed(4)}`}
          sub="last run · gpt-4o-mini"
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

      {/* ── Area chart ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-6"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-slate-200">Pass Rate Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">Golden dataset accuracy across versions · 80% target line</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: PURPLE }} />
              Pass %
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={PURPLE} stopOpacity={0.35} />
                <stop offset="95%" stopColor={PURPLE} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
            <XAxis
              dataKey="tag"
              tick={{ fontSize: 11, fill: MUTED, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: MUTED }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1} />
            <Area
              type="monotone" dataKey="pass"
              stroke={PURPLE} strokeWidth={2.5}
              fill="url(#purpleGrad)"
              dot={{ r: 5, fill: PURPLE, stroke: "#0B0A10", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: PURPLE, style: { filter: "drop-shadow(0 0 6px #8B5CF6)" } }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Version history table ───────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>

        {/* Table header bar */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <h2 className="font-semibold text-slate-200">Version History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selA && selB
                ? <span style={{ color: PURPLE }}>Ready to compare <span className="font-mono">{selA}</span> ↔ <span className="font-mono">{selB}</span></span>
                : selA
                ? `Select a second version to compare with ${selA}`
                : "Click two rows to compare"}
            </p>
          </div>

          {selA && selB && (
            <button
              onClick={() => router.push(`/diff?v1=${encodeURIComponent(selA)}&v2=${encodeURIComponent(selB)}`)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90 glow-purple-sm"
              style={{ background: "linear-gradient(135deg, #7C3AED, #8B5CF6)", color: "#fff" }}
            >
              <GitCompare size={14} />
              Compare {selA} ↔ {selB}
              <ChevronRight size={13} />
            </button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Version", "Pass Rate", "Latency", "Cost", "Cases", "Snapshot", "When"].map(h => (
                <th
                  key={h}
                  className={`py-3 text-[11px] font-medium uppercase tracking-wider text-slate-500 ${
                    h === "Version" ? "text-left px-6" :
                    h === "Pass Rate" ? "px-4" :
                    h === "When" ? "text-right px-6" : "text-right px-4"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...runs].reverse().map(run => {
              const isA = selA === run.version_tag;
              const isB = selB === run.version_tag;
              const sel = isA || isB;
              return (
                <tr
                  key={run.id}
                  onClick={() => toggle(run.version_tag)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: `1px solid ${BORDER}`,
                    background: sel ? "rgba(139,92,246,0.07)" : undefined,
                  }}
                  onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "#1A1825"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = sel ? "rgba(139,92,246,0.07)" : ""; }}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{run.version_tag}</span>
                      {isA && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: PURPLE, background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.30)" }}>A</span>
                      )}
                      {isB && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: EMERALD, background: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.30)" }}>B</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 w-52">
                    <PassPill rate={run.success_rate} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-400">
                    {run.avg_latency_ms.toFixed(0)} ms
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-400">
                    ${run.avg_cost_usd.toFixed(4)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs text-slate-500">{run.total_cases}</td>
                  <td className="px-4 py-3.5 text-right text-xs">
                    {run.snapshot_path ? (
                      <span className="flex items-center justify-end gap-1" style={{ color: EMERALD }}>
                        <Shield size={11} /> saved
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right text-xs text-slate-500 font-mono">
                    {new Date(run.timestamp + "Z").toLocaleString(undefined, {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
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
