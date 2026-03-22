"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles, ArrowLeft, GitCompare, Code2, BarChart3,
  List, CheckCircle2, XCircle, TrendingUp, TrendingDown,
  Minus, Zap, DollarSign, Activity, Terminal, ExternalLink,
  ArrowRight, ChevronDown, ChevronRight, Wrench, Brain,
  MessageSquare, Hash, Clock, AlertCircle, Loader2, Cpu,
} from "lucide-react";
import { VeraMascot } from "@/components/vera";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Palette (lighter, readable) ──────────────────────────────────────────────
const BG      = "#1a1628";
const SURF    = "#231F3A";
const SURF2   = "#2B2748";
const BORDER  = "#3D3860";
const PURPLE  = "#A78BFA";
const EMERALD = "#4ADE80";
const ROSE    = "#FF7A96";
const AMBER   = "#FCD34D";
const MUTED   = "#9B97BB";
const TEXT    = "#EDE9F8";

const MONO = "var(--font-mono), 'JetBrains Mono', monospace";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RunInfo {
  version_tag: string; success_rate: number;
  avg_latency_ms: number; avg_cost_usd: number; total_cases: number; timestamp: string;
  notes?: string;
  avg_ragas_faithfulness?: number | null;
  avg_ragas_relevancy?: number | null;
  avg_ragas_precision?: number | null;
}
interface DiffData {
  v1: RunInfo; v2: RunInfo;
  deltas: {
    success_rate: number; avg_latency_ms: number; avg_cost_usd: number;
    avg_ragas_faithfulness?: number | null;
    avg_ragas_relevancy?: number | null;
    avg_ragas_precision?: number | null;
  };
  regressions: any[]; improvements: any[]; llm_summary: string;
}
interface DiffLine {
  type: "equal" | "delete" | "insert";
  content: string; v1_no: number | null; v2_no: number | null;
}
interface SnapshotDiff {
  available: boolean; reason?: string; filename?: string;
  diff_lines?: DiffLine[];
  stats?: { added: number; removed: number; unchanged: number; has_changes: boolean };
}
interface SampleRow {
  sample_idx: number; input: string; expected: string; flipped: boolean;
  [key: string]: any;
}
interface ToolCall { name: string; input: string; output: string; }
interface LlmStep  { model: string; tools_called: string[]; response: string; }
interface ChainStep {
  type: "llm" | "tool";
  // LLM fields
  model?: string;
  tools_requested?: { name: string; args: Record<string, any>; display: string }[];
  content?: string;
  is_final?: boolean;
  // Tool fields
  name?: string;
  input?: string;
  output?: string;
}
interface TraceInfo {
  sample_idx: number; found: boolean; error?: string;
  trace_id?: string; system_prompt?: string | null;
  tool_calls?: ToolCall[]; llm_steps?: LlmStep[];
  execution_chain?: ChainStep[];
  latency_s?: number; total_cost?: number; langfuse_url?: string;
}
interface TracesResponse { traces: TraceInfo[]; tag: string; found?: number; error?: string; }

// ── Small utilities ───────────────────────────────────────────────────────────
function DeltaBadge({ value, unit = "", invert = false }: { value: number | null | undefined; unit?: string; invert?: boolean }) {
  if (value == null) return <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: MUTED, background: "rgba(155,151,187,0.10)", border: "1px solid rgba(155,151,187,0.20)", fontFamily: MONO }}>-</span>;
  const positive = invert ? value < 0 : value > 0;
  const color    = value === 0 ? MUTED : positive ? EMERALD : ROSE;
  const bg       = value === 0 ? "rgba(155,151,187,0.10)" : positive ? "rgba(74,222,128,0.10)" : "rgba(255,122,150,0.10)";
  const bdr      = value === 0 ? "rgba(155,151,187,0.20)" : positive ? "rgba(74,222,128,0.25)" : "rgba(255,122,150,0.25)";
  const Icon     = value === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color, background: bg, border: `1px solid ${bdr}`, fontFamily: MONO }}>
      <Icon size={9} />
      {value === 0 ? "-" : `${value > 0 ? "+" : ""}${value}${unit}`}
    </span>
  );
}

function PassBadge({ passed, label }: { passed: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        color: passed ? EMERALD : ROSE,
        background: passed ? "rgba(74,222,128,0.12)" : "rgba(255,122,150,0.12)",
        border: `1px solid ${passed ? "rgba(74,222,128,0.25)" : "rgba(255,122,150,0.25)"}`,
        fontFamily: MONO,
      }}>
      {passed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
      {label ?? (passed ? "pass" : "fail")}
    </span>
  );
}

// ── Full execution chain (ReAct trace) ───────────────────────────────────────
// ── Expandable tool output ─────────────────────────────────────────────────────
function ExpandableToolStep({ step, isLast }: { step: ChainStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const output = step.output ?? "";
  const PREVIEW = 160;
  const needsToggle = output.length > PREVIEW;

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center shrink-0" style={{ width: "20px" }}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.30)" }}>
          <Wrench size={9} style={{ color: AMBER }} />
        </div>
        {!isLast && <div className="w-px flex-1 mt-0.5" style={{ background: BORDER, minHeight: "12px" }} />}
      </div>
      <div className="flex-1 min-w-0 mb-2 rounded-lg px-3 py-2"
        style={{ background: BG, border: `1px solid ${BORDER}` }}>
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[10px] font-bold shrink-0" style={{ color: AMBER, fontFamily: MONO }}>
            {step.name}
          </span>
          <span className="text-[10px] flex-1" style={{ color: MUTED, fontFamily: MONO }}>
            ({step.input})
          </span>
        </div>
        {output && (
          <div className="mt-1.5">
            <div className="flex items-start gap-1.5">
              <ArrowRight size={9} className="mt-0.5 shrink-0" style={{ color: MUTED }} />
              <span className="text-xs whitespace-pre-wrap break-words" style={{ color: EMERALD, fontFamily: MONO }}>
                {expanded || !needsToggle ? output : output.slice(0, PREVIEW) + "…"}
              </span>
            </div>
            {needsToggle && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-1 text-[10px] font-semibold ml-4 hover:opacity-80 transition-opacity"
                style={{ color: PURPLE }}>
                {expanded ? "▲ show less" : `▼ show all (${output.length} chars)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutionChain({ chain, noTraceMsg }: { chain?: ChainStep[]; noTraceMsg?: string }) {
  if (!chain || chain.length === 0) {
    return (
      <div className="rounded-lg px-3 py-4 text-center" style={{ background: BG, border: `1px solid ${BORDER}` }}>
        <p className="text-xs italic" style={{ color: MUTED }}>
          {noTraceMsg ?? "No trace: run eval to capture execution"}
        </p>
      </div>
    );
  }

  // Filter to only LLM and TOOL steps (skip internal LangGraph CHAIN/AGENT frames)
  const steps = chain.filter(s => s.type === "llm" || s.type === "tool");
  const stepCount = steps.length;

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === stepCount - 1;

        if (step.type === "llm") {
          const hasCalls = (step.tools_requested?.length ?? 0) > 0;
          const isFinal  = step.is_final;

          return (
            <div key={i} className="flex items-start gap-2">
              {/* Connector */}
              <div className="flex flex-col items-center shrink-0" style={{ width: "20px" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isFinal ? "rgba(74,222,128,0.15)" : "rgba(167,139,250,0.15)",
                    border: `1px solid ${isFinal ? "rgba(74,222,128,0.35)" : "rgba(167,139,250,0.35)"}`,
                  }}>
                  {isFinal
                    ? <CheckCircle2 size={11} style={{ color: EMERALD }} />
                    : <Brain size={10} style={{ color: PURPLE }} />}
                </div>
                {!isLast && <div className="w-px flex-1 mt-0.5" style={{ background: BORDER, minHeight: "12px" }} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: isFinal ? EMERALD : PURPLE }}>
                    {isFinal ? "Final Answer" : `LLM${step.model ? ` · ${step.model.split("-").slice(0, 2).join("-")}` : ""}`}
                  </span>
                </div>

                {isFinal && step.content && (
                  <div className="rounded-lg px-3 py-2 text-xs font-semibold"
                    style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.20)", color: EMERALD, fontFamily: MONO }}>
                    {step.content}
                  </div>
                )}

                {hasCalls && (
                  <div className="space-y-1">
                    {step.tools_requested!.map((tc, ti) => (
                      <div key={ti} className="rounded-md px-2.5 py-1.5 text-xs"
                        style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.20)" }}>
                        <span style={{ color: MUTED }}>→ calls </span>
                        <span style={{ color: PURPLE, fontFamily: MONO }}>{tc.display}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // TOOL step
        return (
          <ExpandableToolStep key={i} step={step} isLast={isLast} />
        );
      })}
    </div>
  );
}

// ── System prompt display + diff ──────────────────────────────────────────────
function PromptBlock({ prompt, label, color }: { prompt: string | null | undefined; label: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
        style={{ color: MUTED }}>
        <MessageSquare size={10} style={{ color }} />
        {label}
      </p>
      {prompt ? (
        <pre className="text-xs leading-relaxed p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words"
          style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT, fontFamily: MONO, fontSize: "11px" }}>
          {prompt}
        </pre>
      ) : (
        <p className="text-xs italic p-3 rounded-lg" style={{ background: BG, border: `1px solid ${BORDER}`, color: MUTED }}>
          Not captured. Run a newer eval to see prompts in traces.
        </p>
      )}
    </div>
  );
}

function InlinePromptDiff({ v1Prompt, v2Prompt }: { v1Prompt: string; v2Prompt: string }) {
  const v1Lines = v1Prompt.split("\n");
  const v2Lines = v2Prompt.split("\n");

  // Build simple LCS diff
  const lines: { type: "equal" | "delete" | "insert"; content: string }[] = [];
  const v2Set = new Set(v2Lines);
  const v1Set = new Set(v1Lines);
  const allLines = Array.from(new Set([...v1Lines, ...v2Lines]));

  for (const line of v1Lines) {
    if (!v2Set.has(line)) lines.push({ type: "delete", content: line });
    else lines.push({ type: "equal", content: line });
  }
  for (const line of v2Lines) {
    if (!v1Set.has(line)) lines.push({ type: "insert", content: line });
  }

  const hasChanges = lines.some(l => l.type !== "equal");
  if (!hasChanges) return (
    <div className="text-xs italic px-3 py-2 rounded-lg" style={{ color: MUTED, background: BG, border: `1px solid ${BORDER}` }}>
      System prompts are identical between {"{v1}"} and {"{v2}"}
    </div>
  );

  return (
    <div className="rounded-lg overflow-hidden text-xs" style={{ border: `1px solid ${BORDER}`, fontFamily: MONO }}>
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: SURF2, borderBottom: `1px solid ${BORDER}` }}>
        <Terminal size={11} style={{ color: MUTED }} />
        <span style={{ color: MUTED }}>System prompt diff</span>
        <span style={{ color: EMERALD }}>+{lines.filter(l => l.type === "insert").length}</span>
        <span style={{ color: ROSE }}>−{lines.filter(l => l.type === "delete").length}</span>
      </div>
      <div style={{ background: BG }}>
        {lines.map((line, i) => (
          <div key={i}
            className={line.type === "delete" ? "diff-delete" : line.type === "insert" ? "diff-insert" : "diff-equal"}
            style={{ padding: "2px 12px", color: line.type === "delete" ? ROSE : line.type === "insert" ? EMERALD : TEXT + "AA" }}>
            <span style={{ marginRight: "8px", opacity: 0.5 }}>{line.type === "delete" ? "−" : line.type === "insert" ? "+" : " "}</span>
            {line.content || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Single version trace panel ────────────────────────────────────────────────
function TracePanel({
  version, sample, trace, accentColor,
}: {
  version: string; sample: SampleRow; trace: TraceInfo | undefined;
  accentColor: string;
}) {
  const passed = sample[`${version}_passed`] as boolean;
  const got    = sample[`${version}_got`]    as string;
  const msRaw  = sample[`${version}_latency_ms`] as number | null | undefined;
  const ms     = typeof msRaw === "number" && Number.isFinite(msRaw) ? msRaw : null;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Version header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: accentColor, fontFamily: MONO }}>{version}</span>
          <PassBadge passed={passed} />
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: MUTED }}>
          {ms !== null && (
            <span className="flex items-center gap-1"><Clock size={10} />{ms.toFixed(0)} ms</span>
          )}
          {trace?.langfuse_url && (
            <a href={trace.langfuse_url} target="_blank" rel="noopener"
              className="flex items-center gap-1 hover:underline" style={{ color: PURPLE }}>
              <ExternalLink size={10} /> trace
            </a>
          )}
        </div>
      </div>

      {/* Answer */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Answer</p>
        <div className="px-3 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: passed ? "rgba(74,222,128,0.08)" : "rgba(255,122,150,0.08)",
            border: `1px solid ${passed ? "rgba(74,222,128,0.20)" : "rgba(255,122,150,0.20)"}`,
            color: passed ? EMERALD : ROSE, fontFamily: MONO,
          }}>
          {got}
        </div>
      </div>

      {/* Execution chain */}
      {trace?.found ? (
        <>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: MUTED }}>
              <Activity size={10} style={{ color: accentColor }} />
              Execution Chain
              <span className="font-mono">({(trace.execution_chain?.filter(s => s.type === "tool").length ?? 0)} tool calls)</span>
            </p>
            <ExecutionChain chain={trace.execution_chain} />
          </div>

          {/* System prompt */}
          <PromptBlock prompt={trace.system_prompt} label="System Prompt" color={accentColor} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-6">
            <AlertCircle size={20} className="mx-auto mb-2" style={{ color: MUTED }} />
            <p className="text-xs" style={{ color: MUTED }}>
              {trace?.error ? `Trace error: ${trace.error}` : "No trace found. Run eval again to capture."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Per-sample comparison row ─────────────────────────────────────────────────
function SampleCompareRow({
  sample, v1Trace, v2Trace, v1, v2, idx,
}: {
  sample: SampleRow; v1Trace?: TraceInfo; v2Trace?: TraceInfo;
  v1: string; v2: string; idx: number;
}) {
  const [open, setOpen] = useState(sample.flipped || idx < 2);
  const p1 = sample[`${v1}_passed`] as boolean;
  const p2 = sample[`${v2}_passed`] as boolean;

  const promptsDiffer = !!(
    v1Trace?.found && v2Trace?.found &&
    v1Trace.system_prompt && v2Trace.system_prompt &&
    v1Trace.system_prompt !== v2Trace.system_prompt
  );

  const rowBorderColor = sample.flipped
    ? (p2 ? "rgba(74,222,128,0.30)" : "rgba(255,122,150,0.30)")
    : BORDER;
  const rowBg = sample.flipped
    ? (p2 ? "rgba(74,222,128,0.04)" : "rgba(255,122,150,0.04)")
    : SURF;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${rowBorderColor}`, background: rowBg }}>
      {/* Row header — click to expand */}
      <button
        className="flex w-full min-w-0 flex-wrap items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-white/[0.02] sm:gap-3 sm:px-4"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs shrink-0" style={{ color: MUTED, fontFamily: MONO, width: "2rem", textAlign: "right" }}>
          #{sample.sample_idx}
        </span>

        <span className="min-w-0 flex-1 text-sm break-words sm:truncate sm:overflow-hidden" style={{ color: TEXT }}>{sample.input}</span>

        {/* V1 badge */}
        <PassBadge passed={p1} label={`${v1}: ${p1 ? "pass" : "fail"}`} />
        <ArrowRight size={11} style={{ color: MUTED, flexShrink: 0 }} />
        {/* V2 badge */}
        <PassBadge passed={p2} label={`${v2}: ${p2 ? "pass" : "fail"}`} />

        {/* Flip indicator */}
        {sample.flipped && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{
              color: p2 ? EMERALD : ROSE,
              background: p2 ? "rgba(74,222,128,0.15)" : "rgba(255,122,150,0.15)",
              border: `1px solid ${p2 ? "rgba(74,222,128,0.30)" : "rgba(255,122,150,0.30)"}`,
              fontFamily: MONO,
            }}>
            {p2 ? "↑ FIXED" : "↓ BROKE"}
          </span>
        )}

        {promptsDiffer && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ color: AMBER, background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.25)" }}>
            Δ prompt
          </span>
        )}

        {open ? <ChevronDown size={13} style={{ color: MUTED, flexShrink: 0 }} />
               : <ChevronRight size={13} style={{ color: MUTED, flexShrink: 0 }} />}
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {/* Expected answer */}
          <div className="px-4 pt-3 pb-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>Expected: </span>
            <span className="text-xs font-bold" style={{ color: EMERALD, fontFamily: MONO }}>{sample.expected}</span>
          </div>

          {/* Prompt diff (if any) */}
          {promptsDiffer && (
            <div className="px-4 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: AMBER }}>
                ⚠ System prompt changed between versions
              </p>
              <InlinePromptDiff v1Prompt={v1Trace!.system_prompt!} v2Prompt={v2Trace!.system_prompt!} />
            </div>
          )}

          {/* Split panels */}
          <div className="mt-3 grid grid-cols-1 gap-px sm:grid-cols-2" style={{ background: BORDER }}>
            <div className="min-w-0 p-3 sm:p-4" style={{ background: rowBg }}>
              <TracePanel version={v1} sample={sample} trace={v1Trace} accentColor={MUTED} />
            </div>
            <div className="min-w-0 p-3 sm:p-4" style={{ background: rowBg }}>
              <TracePanel version={v2} sample={sample} trace={v2Trace} accentColor={PURPLE} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comparison tab ────────────────────────────────────────────────────────────
function ComparisonTab({
  samples, v1, v2, v1Traces, v2Traces, tracesLoading,
}: {
  samples: SampleRow[]; v1: string; v2: string;
  v1Traces: Record<number, TraceInfo>; v2Traces: Record<number, TraceInfo>;
  tracesLoading: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "flipped" | "failed">("all");

  const filtered = samples.filter(s => {
    if (filter === "flipped") return s.flipped;
    if (filter === "failed")  return !s[`${v2}_passed`];
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter + status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "flipped", "failed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-all"
              style={{
                background: filter === f ? "rgba(167,139,250,0.15)" : "rgba(61,56,96,0.50)",
                color: filter === f ? PURPLE : MUTED,
                border: `1px solid ${filter === f ? "rgba(167,139,250,0.35)" : BORDER}`,
              }}>
              {f === "all" ? `All (${samples.length})`
               : f === "flipped" ? `Flipped (${samples.filter(s => s.flipped).length})`
               : `Failed in ${v2} (${samples.filter(s => !s[`${v2}_passed`]).length})`}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: MUTED }}>
          {tracesLoading ? (
            <>
              <Loader2 size={12} className="animate-spin" style={{ color: PURPLE }} />
              Loading traces…
            </>
          ) : (
            <>
              <CheckCircle2 size={12} style={{ color: EMERALD }} />
              Traces loaded
            </>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-2" style={{ borderColor: BORDER }}>
        {[{ label: v1, color: MUTED }, { label: v2, color: PURPLE }].map(({ label, color }, i) => (
          <div key={label} className={`flex min-w-0 flex-wrap items-center gap-2 px-3 py-2 sm:px-4 ${i === 0 ? "border-b sm:border-b-0 sm:border-r" : ""}`} style={{ background: SURF2, borderColor: BORDER }}>
            <span className="min-w-0 break-all text-xs font-bold" style={{ color, fontFamily: MONO }}>{label}</span>
            <span className="text-xs" style={{ color: MUTED }}>traces + tool calls</span>
          </div>
        ))}
      </div>

      {/* Sample rows */}
      <div className="space-y-2">
        {filtered.map((sample, i) => (
          <SampleCompareRow
            key={sample.sample_idx}
            idx={i}
            sample={sample}
            v1Trace={v1Traces[sample.sample_idx]}
            v2Trace={v2Traces[sample.sample_idx]}
            v1={v1} v2={v2}
          />
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center rounded-xl text-sm"
            style={{ background: SURF, border: `1px solid ${BORDER}`, color: MUTED }}>
            No samples match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Code diff tab ─────────────────────────────────────────────────────────────
const CTX = 5;

function CodeDiffViewer({ diffLines, filename }: { diffLines: DiffLine[]; filename: string }) {
  const changedIdx = useMemo(() => {
    const s = new Set<number>();
    diffLines.forEach((l, i) => { if (l.type !== "equal") s.add(i); });
    return s;
  }, [diffLines]);

  const visible = useMemo(() => {
    const v = new Set<number>();
    changedIdx.forEach(i => {
      for (let j = Math.max(0, i - CTX); j <= Math.min(diffLines.length - 1, i + CTX); j++) v.add(j);
    });
    return v;
  }, [changedIdx, diffLines]);

  if (changedIdx.size === 0) return (
    <div className="rounded-xl p-12 text-center" style={{ background: SURF, border: `1px solid ${BORDER}` }}>
      <div className="text-4xl mb-3">✓</div>
      <p className="font-semibold" style={{ color: TEXT }}>No code changes detected</p>
      <p className="text-sm mt-1.5 max-w-sm mx-auto" style={{ color: MUTED }}>
        Both versions used the same agent snapshot. Modify the agent between runs to see a diff.
      </p>
    </div>
  );

  const groups: { type: "visible" | "collapsed"; lines: (DiffLine & { idx: number })[] }[] = [];
  let cur: (typeof groups)[0] | null = null;
  diffLines.forEach((line, idx) => {
    const type = visible.has(idx) ? "visible" : "collapsed";
    if (!cur || cur.type !== type) { cur = { type, lines: [] }; groups.push(cur); }
    cur.lines.push({ ...line, idx });
  });

  function buildSideBySideRows(lines: (DiffLine & { idx: number })[]): { left?: DiffLine & { idx: number }; right?: DiffLine & { idx: number } }[] {
    const out: { left?: DiffLine & { idx: number }; right?: DiffLine & { idx: number } }[] = [];
    let i = 0;
    const arr = lines;
    while (i < arr.length) {
      const a = arr[i];
      if (a.type === "equal") {
        out.push({ left: a, right: a });
        i++;
      } else if (a.type === "delete") {
        const b = arr[i + 1];
        if (b?.type === "insert") {
          out.push({ left: a, right: b });
          i += 2;
        } else {
          out.push({ left: a, right: undefined });
          i++;
        }
      } else {
        out.push({ left: undefined, right: a });
        i++;
      }
    }
    return out;
  }

  function SideBySideBlock({ lines }: { lines: (DiffLine & { idx: number })[] }) {
    const rows = buildSideBySideRows(lines);
    return (
      <>
        {rows.map((row, ri) => {
          return (
            <div
              key={`r-${ri}-${row.left?.idx ?? row.right?.idx}`}
              className="grid grid-cols-2 gap-px"
              style={{ background: BORDER }}
            >
              <div
                className={`min-h-[1.5rem] pl-0 ${!row.left ? "opacity-40" : ""} ${
                  row.left?.type === "delete" ? "diff-delete" : row.left?.type === "equal" ? "diff-equal" : ""
                }`}
                style={{ background: !row.left ? `${BG}` : undefined }}
              >
                <div className="flex">
                  <span className="w-9 shrink-0 select-none py-0.5 pr-1 text-right text-[10px]" style={{ color: MUTED + "99" }}>
                    {row.left?.v1_no ?? ""}
                  </span>
                  <span className="diff-side-pad flex-1 py-0.5 pr-2 font-mono text-[11px] leading-snug">
                    {row.left ? row.left.content : " "}
                  </span>
                </div>
              </div>
              <div
                className={`min-h-[1.5rem] pl-0 ${!row.right ? "opacity-40" : ""} ${
                  row.right?.type === "insert" ? "diff-insert" : row.right?.type === "equal" ? "diff-equal" : ""
                }`}
                style={{ background: !row.right ? `${BG}` : undefined }}
              >
                <div className="flex">
                  <span className="w-9 shrink-0 select-none py-0.5 pr-1 text-right text-[10px]" style={{ color: MUTED + "99" }}>
                    {row.right?.v2_no ?? ""}
                  </span>
                  <span className="diff-side-pad flex-1 py-0.5 pr-2 font-mono text-[11px] leading-snug">
                    {row.right ? row.right.content : " "}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <div
        className="grid grid-cols-2 gap-px text-[10px] font-semibold uppercase tracking-wider"
        style={{ background: BORDER }}
      >
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: SURF2, color: MUTED }}>
          <span style={{ color: ROSE }}>−</span> Baseline (removed)
        </div>
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: SURF2, color: MUTED }}>
          <span style={{ color: EMERALD }}>+</span> Compare (added)
        </div>
      </div>
      <div className="text-xs leading-snug overflow-x-auto" style={{ background: BG, fontFamily: MONO }}>
        {groups.map((group, gi) =>
          group.type === "collapsed" ? (
            <div
              key={gi}
              className="grid grid-cols-2 gap-px px-2 py-1.5 italic"
              style={{ color: MUTED + "CC", background: SURF, borderTop: `1px solid ${BORDER}50`, borderBottom: `1px solid ${BORDER}50` }}
            >
              <span className="col-span-2 text-center">{group.lines.length} unchanged lines collapsed</span>
            </div>
          ) : (
            <SideBySideBlock key={gi} lines={group.lines} />
          )
        )}
      </div>
    </div>
  );
}

// ── Metrics tab ───────────────────────────────────────────────────────────────
function MetricsTab({ diff, samples, v1, v2 }: { diff: DiffData; samples: SampleRow[]; v1: string; v2: string }) {
  const { v1: r1, v2: r2, deltas } = diff;

  function MetricBlock({ label, icon: Icon, iconColor, v1Val, v2Val, delta, unit = "", invert = false }: any) {
    return (
      <div className="rounded-xl p-5" style={{ background: SURF, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Icon size={13} style={{ color: iconColor }} />
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>{label}</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] mb-0.5" style={{ color: MUTED }}>Baseline</p>
            <p className="text-2xl font-bold" style={{ color: MUTED, fontFamily: MONO }}>{v1Val}</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 pb-1">
            <DeltaBadge value={delta} unit={unit} invert={invert} />
            <ArrowRight size={12} style={{ color: MUTED }} />
          </div>
          <div className="text-right">
            <p className="text-[10px] mb-0.5" style={{ color: MUTED }}>New</p>
            <p className="text-2xl font-bold" style={{ color: PURPLE, fontFamily: MONO }}>{v2Val}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBlock label="Success Rate" icon={Activity} iconColor={EMERALD}
          v1Val={`${r1.success_rate}%`} v2Val={`${r2.success_rate}%`} delta={deltas.success_rate} unit="%" />
        <MetricBlock label="Avg Latency" icon={Zap} iconColor={AMBER}
          v1Val={`${r1.avg_latency_ms} ms`} v2Val={`${r2.avg_latency_ms} ms`}
          delta={deltas.avg_latency_ms} unit=" ms" invert />
        <MetricBlock label="Avg Cost" icon={DollarSign} iconColor={PURPLE}
          v1Val={`$${r1.avg_cost_usd.toFixed(4)}`} v2Val={`$${r2.avg_cost_usd.toFixed(4)}`}
          delta={deltas.avg_cost_usd} unit=" USD" invert />
      </div>

      {/* RAGAS semantic quality block — only shown when both versions have RAGAS scores */}
      {r1.avg_ragas_faithfulness != null && r2.avg_ragas_faithfulness != null && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
            RAGAS Semantic Quality
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricBlock label="Faithfulness" icon={Activity} iconColor={EMERALD}
              v1Val={(r1.avg_ragas_faithfulness ?? 0).toFixed(3)}
              v2Val={(r2.avg_ragas_faithfulness ?? 0).toFixed(3)}
              delta={deltas.avg_ragas_faithfulness ?? null} unit="" />
            <MetricBlock label="Answer Relevancy" icon={Activity} iconColor={PURPLE}
              v1Val={r1.avg_ragas_relevancy != null ? r1.avg_ragas_relevancy.toFixed(3) : "-"}
              v2Val={r2.avg_ragas_relevancy != null ? r2.avg_ragas_relevancy.toFixed(3) : "-"}
              delta={deltas.avg_ragas_relevancy ?? null} unit="" />
            <MetricBlock label="Context Precision" icon={Activity} iconColor={AMBER}
              v1Val={r1.avg_ragas_precision != null ? r1.avg_ragas_precision.toFixed(3) : "-"}
              v2Val={r2.avg_ragas_precision != null ? r2.avg_ragas_precision.toFixed(3) : "-"}
              delta={deltas.avg_ragas_precision ?? null} unit="" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Cases", val: r2.total_cases },
          { label: "Regressions",  val: diff.regressions.length,  bad: diff.regressions.length > 0 },
          { label: "Improvements", val: diff.improvements.length, good: diff.improvements.length > 0 },
          { label: "Flipped",      val: samples.filter(s => s.flipped).length, neutral: true },
        ].map(({ label, val, bad, good }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: SURF, border: `1px solid ${BORDER}` }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: bad ? ROSE : good ? EMERALD : TEXT, fontFamily: MONO }}>{val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4 flex items-start gap-4"
        style={{ background: "rgba(61,56,96,0.40)", border: `1px solid ${BORDER}` }}>
        <VeraMascot size={44} showFootnote={false} title="VERA: traces tip" className="shrink-0" />
        <div>
          <p className="text-sm font-medium" style={{ color: TEXT }}>Tool traces in split compare</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: MUTED }}>
            Expand each sample row to see execution chains and prompts. When your eval records a trace URL, use the{" "}
            <span className="font-mono text-violet-300/90">trace</span> link on each side for the full timeline.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "compare", label: "Split Compare",  icon: GitCompare },
  { id: "metrics", label: "Metrics",        icon: BarChart3 },
  { id: "diff",    label: "Code Diff",      icon: Code2 },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── Main ──────────────────────────────────────────────────────────────────────
function DiffContent() {
  const params = useSearchParams();
  const v1      = params.get("v1") ?? "";
  const v2      = params.get("v2") ?? "";
  const project = params.get("project") ?? "";

  // Build the project query string once so every fetch uses the right DB
  const pq = project ? `?project=${encodeURIComponent(project)}` : "";
  const pqAmp = project ? `&project=${encodeURIComponent(project)}` : "";

  const [tab, setTab] = useState<TabId>("compare");
  const [diff,    setDiff]    = useState<DiffData | null>(null);
  const [snap,    setSnap]    = useState<SnapshotDiff | null>(null);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [v1Traces, setV1Traces] = useState<Record<number, TraceInfo>>({});
  const [v2Traces, setV2Traces] = useState<Record<number, TraceInfo>>({});
  // Structured snapshot metadata (system prompts, model, tools) from snapshot.json
  const [v1Snap, setV1Snap] = useState<Record<string, any> | null>(null);
  const [v2Snap, setV2Snap] = useState<Record<string, any> | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [tracesLoading, setTracesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!v1 || !v2) return;
    setLoading(true);
    setError(null);
    setSamples([]);
    setV1Traces({});
    setV2Traces({});
    setTracesLoading(true);
    Promise.all([
      fetch(`${API}/api/diff/${encodeURIComponent(v1)}/${encodeURIComponent(v2)}${pq}`).then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch(`${API}/api/snapshot-diff/${encodeURIComponent(v1)}/${encodeURIComponent(v2)}${pq}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/samples-compare/${encodeURIComponent(v1)}/${encodeURIComponent(v2)}${pq}`).then(r => r.ok ? r.json() : []),
      // Fetch structured snapshot metadata for both versions
      fetch(`${API}/api/snapshot/${encodeURIComponent(v1)}${pq}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/snapshot/${encodeURIComponent(v2)}${pq}`).then(r => r.ok ? r.json() : null),
    ])
      .then(([d, s, samps, s1, s2]) => {
        setDiff(d); setSnap(s); setSamples(samps);
        setV1Snap(s1); setV2Snap(s2);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [v1, v2, pq]);

  // Max sample index + 1 from compare table — primitive so we don't put ``samples`` in effect deps.
  const compareTraceCount = samples.reduce((m, s) => Math.max(m, s.sample_idx + 1), 0);

  // Fetch traces after compare samples load so ``count`` matches every row index.
  useEffect(() => {
    if (!v1 || !v2 || loading) return;
    const n = compareTraceCount;
    if (n <= 0) {
      setV1Traces({});
      setV2Traces({});
      setTracesLoading(false);
      return;
    }
    setTracesLoading(true);
    const qs = new URLSearchParams();
    qs.set("count", String(n));
    if (project) qs.set("project", project);
    const q = qs.toString();
    Promise.all([
      fetch(`${API}/api/traces/${encodeURIComponent(v1)}?${q}`).then(r => r.ok ? r.json() as Promise<TracesResponse> : null),
      fetch(`${API}/api/traces/${encodeURIComponent(v2)}?${q}`).then(r => r.ok ? r.json() as Promise<TracesResponse> : null),
    ])
      .then(([t1Resp, t2Resp]) => {
        const t1Map: Record<number, TraceInfo> = {};
        const t2Map: Record<number, TraceInfo> = {};
        (t1Resp?.traces ?? []).forEach(t => { t1Map[t.sample_idx] = t; });
        (t2Resp?.traces ?? []).forEach(t => { t2Map[t.sample_idx] = t; });
        setV1Traces(t1Map);
        setV2Traces(t2Map);
        setTracesLoading(false);
      })
      .catch(() => setTracesLoading(false));
  }, [v1, v2, loading, compareTraceCount, project]);

  if (!v1 || !v2) {
    const pick = project ? `/diff-viewer?project=${encodeURIComponent(project)}` : "/diff-viewer";
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center" style={{ color: MUTED }}>
        <p className="max-w-md text-sm leading-relaxed">
          Choose a baseline and a compare version on the{" "}
          <a href={pick} className="font-semibold text-violet-300 underline-offset-2 hover:underline">
            Diff Viewer
          </a>{" "}
          page, or open it from the dashboard.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={pick}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)", color: "#0a1620" }}
          >
            Go to Diff Viewer
          </a>
          <a href="/dashboard" className="nav-link text-sm">
            ← Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 flex-col gap-3">
      <Loader2 size={32} className="animate-spin" style={{ color: PURPLE }} />
      <p className="text-sm animate-pulse" style={{ color: MUTED }}>Generating behavioral analysis…</p>
    </div>
  );

  if (error || !diff) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: ROSE }}>
      <p className="font-semibold">Failed to load comparison</p>
      <p className="text-sm font-mono px-4 py-2 rounded" style={{ background: "rgba(255,122,150,0.08)", border: "1px solid rgba(255,122,150,0.2)", color: "#FF9EB0", maxWidth: "480px", textAlign: "center" }}>
        {error ?? "No data returned from API"}
      </p>
      <p className="text-xs" style={{ color: MUTED }}>
        Make sure <span className="font-mono">agentlab ui</span> is running and both versions exist in the same project.
      </p>
    </div>
  );

  const snapOk = snap?.available && snap.diff_lines;
  const hasCodeChanges = snapOk && snap!.stats?.has_changes;

  return (
    <div className="min-w-0 space-y-6">

      {/* Header */}
      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
        <a href="/dashboard" className="nav-link flex items-center gap-1.5 text-sm transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </a>
        <a
          href={project ? `/diff-viewer?project=${encodeURIComponent(project)}` : "/diff-viewer"}
          className="nav-link text-sm"
        >
          Change versions
        </a>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 px-3 py-2 rounded-xl sm:gap-3 sm:px-4"
          style={{ background: SURF, border: `1px solid ${BORDER}` }}>
          <VeraMascot size={36} showFootnote={false} className="hidden sm:block shrink-0" title="VERA" />
          <span className="min-w-0 break-all font-bold" style={{ color: MUTED, fontFamily: MONO, fontSize: "16px" }}>{v1}</span>
          <GitCompare size={14} className="shrink-0" style={{ color: PURPLE }} />
          <span className="min-w-0 break-all font-bold" style={{ color: PURPLE, fontFamily: MONO, fontSize: "16px" }}>{v2}</span>
        </div>

        {/* Stats pills */}
        {[
          { label: `${diff.v2.success_rate}% pass`, color: diff.v2.success_rate >= 80 ? EMERALD : ROSE },
          { label: `${diff.v2.avg_latency_ms.toFixed(0)} ms`, color: AMBER },
          { label: `$${diff.v2.avg_cost_usd.toFixed(4)}`, color: PURPLE },
        ].map(({ label, color }) => (
          <span key={label} className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ color, background: `${color}15`, border: `1px solid ${color}30`, fontFamily: MONO }}>
            {label}
          </span>
        ))}

        {hasCodeChanges && (
          <span className="w-full text-xs sm:ml-auto sm:w-auto" style={{ color: MUTED, fontFamily: MONO }}>
            <span style={{ color: EMERALD }}>+{snap!.stats!.added}</span>{" "}
            <span style={{ color: ROSE }}>−{snap!.stats!.removed}</span> code changes
          </span>
        )}
      </div>

      {/* Notes row — shown if either run has notes */}
      {(diff.v1.notes || diff.v2.notes) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[{ tag: v1, notes: diff.v1.notes }, { tag: v2, notes: diff.v2.notes }].map(({ tag, notes }) => (
            <div key={tag}
              className="flex items-start gap-2 rounded-lg px-3 py-2"
              style={{ background: SURF, border: `1px solid ${BORDER}` }}>
              <span className="text-[10px] font-bold uppercase tracking-widest shrink-0 mt-0.5" style={{ color: MUTED }}>Notes</span>
              <span className="text-xs leading-relaxed" style={{ color: notes ? TEXT + "CC" : MUTED, fontStyle: notes ? "normal" : "italic" }}>
                {notes || "-"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* AI Summary */}
      <div className="rounded-xl p-5"
        style={{
          background: "rgba(124, 58, 237, 0.12)",
          border: "1px solid rgba(167,139,250,0.28)",
        }}>
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "rgba(167,139,250,0.18)", border: "1px solid rgba(167,139,250,0.35)" }}>
            <Sparkles size={16} style={{ color: "#C4B5FD" }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#C4B5FD" }}>
                Behavioral analysis
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ color: "#7C3AED", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", fontFamily: MONO }}>
                AI-generated
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: TEXT }}>{diff.llm_summary}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="-mx-1 flex min-w-0 gap-0 overflow-x-auto pb-px sm:mx-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px sm:px-5"
              style={{ borderBottomColor: active ? PURPLE : "transparent", color: active ? TEXT : MUTED }}>
              <Icon size={13} style={{ color: active ? PURPLE : MUTED }} />
              {label}
              {id === "diff" && hasCodeChanges && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: PURPLE, background: "rgba(167,139,250,0.12)", fontFamily: MONO }}>
                  {snap!.stats!.added + snap!.stats!.removed}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab bodies */}
      {tab === "compare" && (
        <ComparisonTab
          samples={samples} v1={v1} v2={v2}
          v1Traces={v1Traces} v2Traces={v2Traces}
          tracesLoading={tracesLoading}
        />
      )}
      {tab === "metrics" && <MetricsTab diff={diff} samples={samples} v1={v1} v2={v2} />}
      {tab === "diff" && (
        <div className="space-y-6">
          {/* System Prompt comparison from snapshot.json */}
          {(v1Snap?.system_prompts || v2Snap?.system_prompts) && (() => {
            const p1 = v1Snap?.system_prompts ?? {};
            const p2 = v2Snap?.system_prompts ?? {};
            const active1 = p1["_active"];
            const active2 = p2["_active"];
            const text1 = active1 ? p1[active1] : Object.values(p1).filter((_, i) => Object.keys(p1)[i] !== "_active")[0];
            const text2 = active2 ? p2[active2] : Object.values(p2).filter((_, i) => Object.keys(p2)[i] !== "_active")[0];
            const promptChanged = text1 !== text2;
            return (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#1A1729", borderBottom: `1px solid ${BORDER}` }}>
                  <MessageSquare size={13} style={{ color: PURPLE }} />
                  <span className="text-sm font-semibold text-slate-200">System Prompt Comparison</span>
                  {promptChanged ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded ml-auto" style={{ color: ROSE, background: "rgba(255,122,150,0.12)", border: "1px solid rgba(255,122,150,0.3)" }}>changed</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded ml-auto" style={{ color: EMERALD, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}>identical</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {[{ label: v1, text: text1 as string, snap: active1 }, { label: v2, text: text2 as string, snap: active2 }].map(({ label, text, snap: activeVar }, i) => (
                    <div key={label} className={`min-w-0 p-4 ${i === 0 ? "border-b sm:border-b-0 sm:border-r" : ""}`} style={{ borderColor: BORDER }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 font-mono" style={{ color: MUTED }}>
                        {label} {activeVar && <span style={{ color: PURPLE }}>: {activeVar}</span>}
                      </p>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words"
                        style={{ fontFamily: MONO, color: text ? "#C9D1D9" : MUTED }}>
                        {text ?? "(no system prompt detected)"}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Model comparison */}
          {(v1Snap?.model || v2Snap?.model) && (() => {
            const m1 = v1Snap?.model ?? {};
            const m2 = v2Snap?.model ?? {};
            const allKeys = Array.from(new Set([...Object.keys(m1), ...Object.keys(m2)]));
            const anyDiff = allKeys.some(k => m1[k] !== m2[k]);
            return (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#1A1729", borderBottom: `1px solid ${BORDER}` }}>
                  <Cpu size={13} style={{ color: PURPLE }} />
                  <span className="text-sm font-semibold text-slate-200">Model Configuration</span>
                  {anyDiff ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded ml-auto" style={{ color: ROSE, background: "rgba(255,122,150,0.12)", border: "1px solid rgba(255,122,150,0.3)" }}>changed</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded ml-auto" style={{ color: EMERALD, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}>identical</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] text-xs font-mono">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <th className="px-4 py-2 text-left" style={{ color: MUTED, width: "120px" }}>Key</th>
                      <th className="px-4 py-2 text-left" style={{ color: MUTED }}>{v1}</th>
                      <th className="px-4 py-2 text-left" style={{ color: MUTED }}>{v2}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allKeys.map(k => {
                      const diff = m1[k] !== m2[k];
                      return (
                        <tr key={k} style={{ borderBottom: `1px solid ${BORDER}`, background: diff ? "rgba(255,122,150,0.04)" : undefined }}>
                          <td className="px-4 py-2" style={{ color: MUTED }}>{k}</td>
                          <td className="px-4 py-2" style={{ color: diff ? ROSE : "text-slate-300" }}>{String(m1[k] ?? "-")}</td>
                          <td className="px-4 py-2" style={{ color: diff ? EMERALD : "text-slate-300" }}>{String(m2[k] ?? "-")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
            );
          })()}

          {/* Code diff */}
          {!snapOk ? (
            <div className="rounded-xl p-12 text-center" style={{ background: SURF, border: `1px solid ${BORDER}`, color: MUTED }}>
              <p className="text-2xl mb-2">📸</p>
              <p className="font-medium">{snap?.reason ?? "Snapshot unavailable"}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#1A1729", border: `1px solid ${BORDER}` }}>
                <Code2 size={13} style={{ color: PURPLE }} />
                <span className="text-sm font-semibold text-slate-200 font-mono">{snap!.filename}</span>
                {hasCodeChanges ? (
                  <span className="ml-auto text-xs font-mono">
                    <span style={{ color: EMERALD }}>+{snap!.stats!.added}</span>{" "}
                    <span style={{ color: ROSE }}>−{snap!.stats!.removed}</span>
                  </span>
                ) : (
                  <span className="ml-auto text-xs" style={{ color: EMERALD }}>No code changes</span>
                )}
              </div>
              <CodeDiffViewer diffLines={snap!.diff_lines!} filename={snap!.filename!} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiffPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin" style={{ color: PURPLE }} />
      </div>
    }>
      <DiffContent />
    </Suspense>
  );
}
