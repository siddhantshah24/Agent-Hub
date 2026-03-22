"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Activity, Zap, DollarSign, Layers, ArrowLeft,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Hash, Wrench, ChevronRight, Camera,
  Brain, Terminal, ExternalLink, AlertCircle, Loader2,
  Shield, Target, ScanSearch,
  ThumbsUp, ThumbsDown, Send, Sparkles, Download,
  CheckCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { VeraMascot } from "@/components/vera";
import { AgentSnapshotView, type AgentSnapshotData } from "@/components/agent-lab/agent-snapshot-view";
import { API } from "@/components/agent-lab/workspace-ui";

const PURPLE  = "#A78BFA";
const EMERALD = "#4ADE80";
const ROSE    = "#FF7A96";
const AMB     = "#F59E0B";
const SURFACE = "#231F3A";
const BORDER  = "#3D3860";
const MUTED   = "#9B97BB";
/** Inline panels: dark purple (aligned with app shell, not pure black) */
const BG      = "#1a1628";
const MONO    = "var(--font-mono), 'JetBrains Mono', monospace";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Run {
  id: number; version_tag: string; success_rate: number;
  avg_latency_ms: number; avg_cost_usd: number;
  total_cases: number; snapshot_path: string | null;
  content_hash: string | null; timestamp: string;
  avg_ragas_faithfulness: number | null;
  avg_ragas_relevancy: number | null;
  avg_ragas_precision: number | null;
}
interface Sample {
  sample_idx: number; input: string; expected: string;
  got: string; passed: boolean; latency_ms: number;
}
interface ChainStep {
  type: "llm" | "tool";
  // LLM
  model?: string; tools_requested?: { display: string }[]; content?: string; is_final?: boolean;
  // Tool
  name?: string; input?: string; output?: string;
}
interface TraceInfo {
  sample_idx: number; found: boolean;
  trace_id?: string; system_prompt?: string | null;
  execution_chain?: ChainStep[]; tool_calls?: any[];
  latency_s?: number; total_cost?: number;
  langfuse_url?: string; error?: string;
}
interface TracesApiResponse {
  traces?: TraceInfo[];
  tag?: string;
  found?: number;
  langfuse_available?: boolean;
  error?: string;
}

type TabId = "samples" | "traces" | "snapshot";

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: LucideIcon; color: string;
}) {
  return (
    <div className="p-5 rounded-xl flex flex-col gap-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
        <p className="text-2xl font-bold font-mono text-slate-200">{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: MUTED }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function Tab({ active, icon: Icon, label, onClick }: {
  active: boolean; icon: LucideIcon; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap"
      style={{
        color: active ? PURPLE : MUTED,
        borderBottom: active ? `2px solid ${PURPLE}` : "2px solid transparent",
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

// ── Expandable tool output ─────────────────────────────────────────────────────
function ToolStep({ step, isLast, accentColor }: { step: ChainStep; isLast: boolean; accentColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const output = step.output ?? "";
  const PREVIEW = 160;
  const needsToggle = output.length > PREVIEW;

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center shrink-0" style={{ width: "20px" }}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.30)" }}>
          <Wrench size={9} style={{ color: accentColor }} />
        </div>
        {!isLast && <div className="w-px flex-1 mt-0.5" style={{ background: BORDER, minHeight: "12px" }} />}
      </div>
      <div className="flex-1 min-w-0 mb-2 rounded-lg px-3 py-2"
        style={{ background: BG, border: `1px solid ${BORDER}` }}>
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[10px] font-bold shrink-0" style={{ color: accentColor, fontFamily: MONO }}>
            {step.name}
          </span>
          <span className="text-[10px] flex-1" style={{ color: MUTED, fontFamily: MONO }}>
            ({step.input})
          </span>
        </div>
        {output && (
          <div className="mt-1.5">
            <div className="flex items-start gap-1.5">
              <ChevronRight size={9} className="mt-0.5 shrink-0" style={{ color: MUTED }} />
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

// ── Execution chain (identical to diff page) ───────────────────────────────────
function ExecutionChain({ chain }: { chain?: ChainStep[] }) {
  const steps = (chain ?? []).filter(s => s.type === "llm" || s.type === "tool");
  if (steps.length === 0) return (
    <div className="rounded-lg px-3 py-3 text-center" style={{ background: BG, border: `1px solid ${BORDER}` }}>
      <p className="text-xs italic" style={{ color: MUTED }}>No trace captured</p>
    </div>
  );

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;

        if (step.type === "llm") {
          const hasCalls = (step.tools_requested?.length ?? 0) > 0;
          const isFinal  = step.is_final;
          return (
            <div key={i} className="flex items-start gap-2">
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
          <ToolStep key={i} step={step} isLast={isLast} accentColor={AMB} />
        );
      })}
    </div>
  );
}

// ── Single trace card ──────────────────────────────────────────────────────────
function TraceCard({ sample, trace }: { sample: Sample; trace: TraceInfo | undefined }) {
  const [open, setOpen] = useState(false);
  const passed = sample.passed;
  const color  = passed ? EMERALD : ROSE;
  const toolCallCount = trace?.execution_chain?.filter(s => s.type === "tool").length ?? 0;
  const llmStepCount  = trace?.execution_chain?.filter(s => s.type === "llm").length ?? 0;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${open ? (passed ? "rgba(74,222,128,0.3)" : "rgba(255,122,150,0.3)") : BORDER}` }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: SURFACE }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1A1825"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = SURFACE; }}
      >
        {/* Index */}
        <span className="text-xs font-mono shrink-0" style={{ color: MUTED, width: "2rem", textAlign: "right" }}>
          #{sample.sample_idx}
        </span>

        {/* Pass/fail badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
          style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
          {passed ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
          {passed ? "pass" : "fail"}
        </span>

        {/* Question */}
        <span className="flex-1 text-sm text-slate-300 truncate">{sample.input}</span>

        {/* Answer */}
        <span className="text-xs font-mono shrink-0" style={{ color, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
          → {sample.got.slice(0, 40)}{sample.got.length > 40 ? "…" : ""}
        </span>

        {/* Trace stats */}
        {trace?.found && (
          <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono" style={{ color: MUTED }}>
            <span className="flex items-center gap-1">
              <Brain size={9} style={{ color: PURPLE }} />{llmStepCount}
            </span>
            <span className="flex items-center gap-1">
              <Wrench size={9} style={{ color: AMB }} />{toolCallCount}
            </span>
            <span>{sample.latency_ms.toFixed(0)} ms</span>
          </div>
        )}

        {trace?.langfuse_url && (
          <a href={trace.langfuse_url} target="_blank" rel="noopener"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] hover:underline shrink-0"
            style={{ color: PURPLE }}>
            <ExternalLink size={9} /> trace
          </a>
        )}

        {/* Expand indicator */}
        {open ? <ChevronUp size={13} style={{ color: MUTED }} /> : <ChevronDown size={13} style={{ color: MUTED }} />}
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
          {/* Q/A */}
          <div className="grid grid-cols-3 gap-4 text-xs font-mono pt-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: MUTED }}>Input</p>
              <p className="text-slate-300 leading-relaxed">{sample.input}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: EMERALD }}>Expected</p>
              <p style={{ color: EMERALD }}>{sample.expected}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color }}>Got</p>
              <p style={{ color, wordBreak: "break-word" }}>{sample.got}</p>
            </div>
          </div>

          {/* Execution chain */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: MUTED }}>
              <Activity size={10} style={{ color: PURPLE }} />
              Execution Chain
              {trace?.found && (
                <span className="font-mono">
                  ({toolCallCount} tool call{toolCallCount !== 1 ? "s" : ""}, {llmStepCount} LLM step{llmStepCount !== 1 ? "s" : ""})
                </span>
              )}
            </p>
            {!trace ? (
              <div className="rounded-lg px-3 py-3 text-center" style={{ background: "#131122", border: `1px solid ${BORDER}` }}>
                <Loader2 size={14} className="animate-spin mx-auto mb-1" style={{ color: MUTED }} />
                <p className="text-xs" style={{ color: MUTED }}>Loading trace…</p>
              </div>
            ) : !trace.found ? (
              <div className="rounded-lg px-3 py-4 text-center" style={{ background: "#131122", border: `1px solid ${BORDER}` }}>
                <AlertCircle size={16} className="mx-auto mb-1" style={{ color: MUTED }} />
                <p className="text-xs" style={{ color: MUTED }}>
                  {trace.error ? `Trace error: ${trace.error}` : "No trace found for this sample"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                  Enable tracing in your eval environment and re-run if you expect execution data here.
                </p>
              </div>
            ) : (
              <ExecutionChain chain={trace.execution_chain} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Traces tab ─────────────────────────────────────────────────────────────────
function TracesTab({ samples, traces, tracesLoading, tracesApiError, tag }: {
  samples: Sample[];
  traces: Record<number, TraceInfo>;
  tracesLoading: boolean;
  tracesApiError: string | null;
  tag: string;
}) {
  return (
    <div className="p-5 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: MUTED }}>
          Click any row to expand the full execution chain when traces are available.
        </p>
        {tracesLoading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
            <Loader2 size={12} className="animate-spin" style={{ color: PURPLE }} />
            Loading traces…
          </div>
        )}
        {!tracesLoading && (
          <span className="text-xs font-mono" style={{ color: MUTED }}>
            {Object.values(traces).filter(t => t.found).length}/{samples.length} traces found
          </span>
        )}
      </div>
      {tracesApiError && (
        <p className="text-xs rounded-lg px-3 py-2 mb-2" style={{ color: ROSE, background: "rgba(255,122,150,0.08)", border: "1px solid rgba(255,122,150,0.2)" }}>
          {tracesApiError}
        </p>
      )}

      {samples.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm" style={{ color: MUTED }}>No samples found for this run.</p>
        </div>
      ) : (
        samples.map(s => (
          <TraceCard
            key={s.sample_idx}
            sample={s}
            trace={tracesLoading ? undefined : (traces[s.sample_idx] ?? { sample_idx: s.sample_idx, found: false })}
          />
        ))
      )}
    </div>
  );
}

// ── Sample row (Samples tab) ───────────────────────────────────────────────────
// ── FeedbackButtons ─────────────────────────────────────────────────────────
function FeedbackButtons({ sampleIdx, tag, project }: { sampleIdx: number; tag: string; project: string }) {
  const [score, setScore] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (s: 1 | -1, c?: string) => {
    setSaving(true);
    try {
      await fetch(`${API}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, sample_idx: sampleIdx, score: s, comment: c ?? comment, project }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleThumb = (s: 1 | -1) => {
    const newScore = score === s ? null : s;
    setScore(newScore as 1 | -1 | null);
    if (newScore !== null) {
      setShowComment(true);
      save(newScore);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 items-end" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleThumb(1)}
          title="Thumbs up"
          className="p-1 rounded transition-colors"
          style={{
            color: score === 1 ? "#4ADE80" : "#9B97BB",
            background: score === 1 ? "#4ADE8015" : "transparent",
          }}
        >
          <ThumbsUp size={13} />
        </button>
        <button
          onClick={() => handleThumb(-1)}
          title="Thumbs down"
          className="p-1 rounded transition-colors"
          style={{
            color: score === -1 ? "#FF7A96" : "#9B97BB",
            background: score === -1 ? "#FF7A9615" : "transparent",
          }}
        >
          <ThumbsDown size={13} />
        </button>
        {saved && <CheckCheck size={11} className="text-emerald-400" />}
        {saving && <Loader2 size={11} className="animate-spin" style={{ color: MUTED }} />}
      </div>
      {showComment && score !== null && (
        <div className="flex items-center gap-1">
          <input
            className="text-xs px-2 py-0.5 rounded outline-none bg-transparent border"
            style={{ borderColor: BORDER, color: "white", width: 120 }}
            placeholder="Add comment…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(score!); }}
            autoFocus
          />
          <button
            onClick={() => save(score!)}
            className="p-1 rounded"
            style={{ color: PURPLE }}
            title="Save comment"
          >
            <Send size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function SampleRow({ s, tag, project }: { s: Sample; tag: string; project: string }) {
  const [open, setOpen] = useState(false);
  const color = s.passed ? EMERALD : ROSE;
  const isErr = s.got.startsWith("ERROR:");
  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className="cursor-pointer transition-colors"
        style={{ borderBottom: `1px solid ${BORDER}` }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1A1825"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
      >
        <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>#{s.sample_idx}</td>
        <td className="px-4 py-3 text-sm text-slate-300 max-w-xs">
          <span className="line-clamp-2">{s.input}</span>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-slate-400">{s.expected}</td>
        <td className="px-4 py-3 text-xs font-mono max-w-xs">
          <span className={isErr ? "text-rose-400" : "text-slate-300"} style={{ wordBreak: "break-word" }}>
            {s.got.length > 80 ? s.got.slice(0, 80) + "…" : s.got}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
            {s.passed ? <><CheckCircle2 size={11} /> pass</> : <><XCircle size={11} /> fail</>}
          </span>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-right" style={{ color: MUTED }}>{s.latency_ms.toFixed(0)} ms</td>
        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
          <FeedbackButtons sampleIdx={s.sample_idx} tag={tag} project={project} />
        </td>
        <td className="px-4 py-3 text-right">
          {open ? <ChevronUp size={14} style={{ color: MUTED }} /> : <ChevronDown size={14} style={{ color: MUTED }} />}
        </td>
      </tr>
      {open && (
        <tr style={{ background: "#18152C", borderBottom: `1px solid ${BORDER}` }}>
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>Input</p>
                <p className="text-slate-300 leading-relaxed">{s.input}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: EMERALD }}>Expected</p>
                <p style={{ color: EMERALD }}>{s.expected}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: s.passed ? EMERALD : ROSE }}>Got</p>
                <p style={{ color: s.passed ? EMERALD : ROSE, wordBreak: "break-word" }}>{s.got}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── SuggestionPanel ──────────────────────────────────────────────────────────
interface Suggestion {
  type: "system_prompt" | "model_config" | "tool_config";
  reason: string;
  current_value: string;
  suggested_value: string;
}

function ExpandableText({ text, label, bgColor, borderColor, labelColor }: {
  text: string; label: string; bgColor: string; borderColor: string; labelColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 300;
  return (
    <div className="rounded-lg p-3" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: labelColor }}>{label}</p>
      <p className={`text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-words${isLong && !expanded ? " line-clamp-6" : ""}`}>
        {text || "(not captured)"}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[10px] font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: labelColor }}
        >
          {expanded ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> Show full text</>}
        </button>
      )}
    </div>
  );
}

function SuggestionCard({
  s, tag, project, onApplied,
}: { s: Suggestion; tag: string; project: string; onApplied: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");

  const typeLabel: Record<string, string> = {
    system_prompt: "System Prompt Change",
    model_config: "Model config (manual edit)",
    tool_config: "Tool config (manual edit)",
  };
  const typeColor: Record<string, string> = {
    system_prompt: "#A78BFA",
    model_config: "#38BDF8",
    tool_config: "#F59E0B",
  };
  const color = typeColor[s.type] ?? PURPLE;
  const canAutoApply = s.type === "system_prompt";

  if (dismissed) return null;

  const apply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`${API}/api/apply-suggestion/${encodeURIComponent(tag)}?project=${encodeURIComponent(project)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: s.type, suggested_value: s.suggested_value, project }),
      });
      const data = await res.json();
      if (data.applied) {
        setApplied(true);
        setApplyMsg(`✓ Applied to ${data.file?.split("/").slice(-2).join("/")}`);
        onApplied();
      } else {
        setApplyMsg(data.message ?? "Could not apply.");
      }
    } catch (e: any) {
      setApplyMsg(`Error: ${e.message}`);
    } finally { setApplying(false); }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}30`, background: `${color}08` }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${color}20` }}>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color, background: `${color}20` }}>
          {typeLabel[s.type] ?? s.type}
        </span>
        {!canAutoApply && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: AMB, background: "#F59E0B15", border: "1px solid #F59E0B30" }}>
            review &amp; apply manually
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">{s.reason}</p>
        <div className="grid grid-cols-2 gap-3">
          <ExpandableText
            text={s.current_value}
            label="Before"
            bgColor="#FF7A9610"
            borderColor="#FF7A9630"
            labelColor={ROSE}
          />
          <ExpandableText
            text={s.suggested_value}
            label="After"
            bgColor="#4ADE8010"
            borderColor="#4ADE8030"
            labelColor={EMERALD}
          />
        </div>
        {applyMsg && (
          <p className="text-xs rounded px-3 py-2" style={{ color: applied ? EMERALD : AMB, background: "#ffffff08" }}>
            {applyMsg}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1">
          {canAutoApply && !applied && (
            <button
              onClick={apply}
              disabled={applying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
            >
              {applying ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
              Apply to graph.py
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: MUTED, border: `1px solid ${BORDER}` }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestionPanel({ tag, project }: { tag: string; project: string }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const generate = async () => {
    setLoading(true);
    setError("");
    setSuggestions([]);
    try {
      const res = await fetch(
        `${API}/api/suggest/${encodeURIComponent(tag)}?project=${encodeURIComponent(project)}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Unknown error");
      }
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate suggestions.");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "#1A1729" }}>
        <div className="flex items-center gap-2.5">
          <Sparkles size={14} style={{ color: PURPLE }} />
          <span className="text-sm font-semibold text-slate-200">LLM Improvement Suggestions</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#A78BFA20", color: PURPLE }}>
            AI-Powered
          </span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: loading ? "#1A1729" : "linear-gradient(135deg, #7C3AED, #6D28D9)",
            color: loading ? MUTED : "white",
            border: `1px solid ${loading ? BORDER : "#7C3AED50"}`,
          }}
        >
          {loading ? (
            <><Loader2 size={13} className="animate-spin" /> Analyzing…</>
          ) : (
            <><Sparkles size={13} /> Generate Suggestions</>
          )}
        </button>
      </div>

      {error && (
        <div className="px-5 py-4">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {!loading && suggestions.length === 0 && !error && (
        <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
          <Sparkles size={24} style={{ color: `${PURPLE}50` }} />
          <p className="text-sm" style={{ color: MUTED }}>
            Click <strong className="text-slate-300">Generate Suggestions</strong> to let Claude analyse
            the evaluation results and human feedback, then suggest improvements to the system prompt,
            model configuration, or tools.
          </p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="p-4 space-y-4">
          {suggestions.map((s, i) => (
            <SuggestionCard
              key={`${refreshKey}-${i}`}
              s={s}
              tag={tag}
              project={project}
              onApplied={() => setRefreshKey(k => k + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function RunDetailPage() {
  const params       = useParams<{ tag: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const tag          = decodeURIComponent(params.tag);
  const project      = searchParams.get("project") ?? "default";

  const [run,     setRun]     = useState<Run | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [snap,    setSnap]    = useState<AgentSnapshotData | null>(null);
  const [traces,  setTraces]  = useState<Record<number, TraceInfo>>({});
  const [tracesLoading, setTracesLoading] = useState(true);
  const [tracesApiError, setTracesApiError] = useState<string | null>(null);
  const [tab,     setTab]     = useState<TabId>("samples");
  const [loading, setLoading] = useState(true);

  // Load run meta, samples, snapshot in parallel
  useEffect(() => {
    const pq = project !== "default" ? `?project=${encodeURIComponent(project)}` : "";
    setLoading(true);
    setRun(null);
    setSamples([]);
    setSnap(null);
    setTraces({});
    setTracesApiError(null);
    setTracesLoading(true);
    Promise.all([
      fetch(`${API}/api/versions${pq}`).then(r => r.json()),
      fetch(`${API}/api/samples/${encodeURIComponent(tag)}${pq}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/snapshot/${encodeURIComponent(tag)}${pq}`).then(r => r.json()).catch(() => null),
    ]).then(([runs, sampleData, snapData]) => {
      const found = Array.isArray(runs) ? runs.find((r: Run) => r.version_tag === tag) : null;
      setRun(found ?? null);
      setSamples(Array.isArray(sampleData) ? sampleData : []);
      setSnap(snapData);
      setLoading(false);
    }).catch(() => {
      setRun(null);
      setSamples([]);
      setSnap(null);
      setLoading(false);
    });
  }, [tag, project]);

  // Load traces after we know how many samples this run has (API sizes batches correctly).
  // Use only primitive deps — ``run`` / ``samples`` objects change identity every render and break React's effect dependency rules.
  const samplesLen = samples.length;
  const runTotalCases = run?.total_cases ?? 0;
  const runVersionTag = run?.version_tag ?? "";
  useEffect(() => {
    if (loading || !runVersionTag) return;
    const n = Math.max(samplesLen, runTotalCases);
    if (n <= 0) {
      setTraces({});
      setTracesApiError(null);
      setTracesLoading(false);
      return;
    }
    setTracesLoading(true);
    setTracesApiError(null);
    const qs = new URLSearchParams();
    qs.set("count", String(n));
    if (project !== "default") qs.set("project", project);
    const q = qs.toString();
    fetch(`${API}/api/traces/${encodeURIComponent(tag)}?${q}`)
      .then(r => r.ok ? r.json() as Promise<TracesApiResponse> : null)
      .then(data => {
        const map: Record<number, TraceInfo> = {};
        (data?.traces ?? []).forEach((t: TraceInfo) => { map[t.sample_idx] = t; });
        setTraces(map);
        setTracesApiError(data?.error && !data?.langfuse_available ? data.error : null);
        setTracesLoading(false);
      })
      .catch(() => {
        setTracesLoading(false);
        setTracesApiError("Failed to reach trace API");
      });
  }, [tag, project, loading, runVersionTag, samplesLen, runTotalCases]);

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: PURPLE, borderTopColor: "transparent" }} />
    </div>
  );

  if (!run) return (
    <div className="flex flex-col items-center justify-center h-72 gap-3">
      <p className="text-slate-400">Run <span className="font-mono" style={{ color: PURPLE }}>{tag}</span> not found.</p>
      <button onClick={() => router.back()} className="text-sm" style={{ color: MUTED }}>← Go back</button>
    </div>
  );

  const passCount  = samples.filter(s => s.passed).length;
  const failCount  = samples.length - passCount;
  const foundCount = Object.values(traces).filter(t => t.found).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="mt-1 p-2 rounded-lg transition-colors hover:bg-white/5 shrink-0"
          style={{ border: `1px solid ${BORDER}` }}>
          <ArrowLeft size={15} style={{ color: MUTED }} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <VeraMascot size={40} showFootnote={false} className="hidden sm:block" title="VERA" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-200">
              Run: <span className="font-mono" style={{ color: PURPLE }}>{tag}</span>
            </h1>
            {run.content_hash && (
              <span className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ color: MUTED, background: "rgba(155,151,187,0.1)", border: `1px solid ${BORDER}` }}>
                #{run.content_hash}
              </span>
            )}
            {project !== "default" && (
              <span className="text-xs px-2 py-0.5 rounded font-mono"
                style={{ background: "rgba(139,92,246,0.15)", color: PURPLE, border: `1px solid rgba(139,92,246,0.3)` }}>
                {project.split("_").slice(1).join(" ").replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: MUTED }}>
            {new Date(run.timestamp + "Z").toLocaleString(undefined, {
              weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        {/* RLHF Export button */}
        <a
          href={`${API}/api/export-rlhf/${encodeURIComponent(tag)}?project=${encodeURIComponent(project)}`}
          download={`rlhf_${tag}.jsonl`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 self-start mt-1 transition-colors"
          style={{ background: "#A78BFA15", color: PURPLE, border: `1px solid #A78BFA30` }}
        >
          <Download size={14} /> Export RLHF Dataset
        </a>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pass Rate" value={`${run.success_rate}%`}
          sub={`${passCount} / ${run.total_cases} passed`} icon={Activity}
          color={run.success_rate >= 80 ? EMERALD : run.success_rate >= 50 ? AMB : ROSE} />
        <StatCard label="Avg Latency" value={`${run.avg_latency_ms.toFixed(0)} ms`}
          sub="per sample" icon={Zap} color={AMB} />
        <StatCard label="Avg Cost" value={`$${run.avg_cost_usd.toFixed(5)}`}
          sub="per sample" icon={DollarSign} color={PURPLE} />
        <StatCard label="Total Samples" value={String(run.total_cases)}
          sub={`${failCount} failed`} icon={Layers} color={PURPLE} />
      </div>

      {/* RAGAS metric cards — only shown for RAG agents */}
      {run.avg_ragas_faithfulness !== null && run.avg_ragas_faithfulness !== undefined && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
            RAGAS Semantic Quality Scores
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Faithfulness"
              value={(run.avg_ragas_faithfulness ?? 0).toFixed(3)}
              sub="answer grounded in retrieved context"
              icon={Shield}
              color={
                (run.avg_ragas_faithfulness ?? 0) >= 0.8 ? EMERALD :
                (run.avg_ragas_faithfulness ?? 0) >= 0.6 ? AMB : ROSE
              }
            />
            <StatCard
              label="Answer Relevancy"
              value={run.avg_ragas_relevancy != null ? run.avg_ragas_relevancy.toFixed(3) : "—"}
              sub="answer relevance to the question"
              icon={Target}
              color={
                (run.avg_ragas_relevancy ?? 0) >= 0.8 ? EMERALD :
                (run.avg_ragas_relevancy ?? 0) >= 0.6 ? AMB : ROSE
              }
            />
            <StatCard
              label="Context Precision"
              value={run.avg_ragas_precision != null ? run.avg_ragas_precision.toFixed(3) : "-"}
              sub="retrieval ranking quality"
              icon={ScanSearch}
              color={
                (run.avg_ragas_precision ?? 0) >= 0.8 ? EMERALD :
                (run.avg_ragas_precision ?? 0) >= 0.6 ? AMB : ROSE
              }
            />
          </div>
        </div>
      )}

      {/* Pass/fail bar */}
      <div className="rounded-xl p-5 flex items-center gap-5"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#2A263D" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${run.success_rate}%`, background: `linear-gradient(90deg, ${EMERALD}, #34D399)` }} />
        </div>
        <div className="flex items-center gap-6 text-sm shrink-0">
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: EMERALD }}>
            <CheckCircle2 size={14} /> {passCount} passed
          </span>
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: ROSE }}>
            <XCircle size={14} /> {failCount} failed
          </span>
        </div>
      </div>

      {/* Suggestion Panel */}
      <SuggestionPanel tag={tag} project={project} />

      {/* Tabs */}
      <div className="rounded-xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="flex overflow-x-auto" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Tab active={tab === "samples"} icon={Hash}
            label={`Sample Results (${samples.length})`} onClick={() => setTab("samples")} />
          <Tab active={tab === "traces"} icon={Activity}
            label={tracesLoading ? "Traces (loading…)" : `Traces (${foundCount}/${samples.length})`}
            onClick={() => setTab("traces")} />
          <Tab active={tab === "snapshot"} icon={Camera}
            label="Agent Snapshot" onClick={() => setTab("snapshot")} />
        </div>

        {tab === "samples" && (
          samples.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm" style={{ color: MUTED }}>No sample data found for this run.</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["#", "Input", "Expected", "Got", "Result", "Latency", "Feedback", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{samples.map(s => <SampleRow key={s.sample_idx} s={s} tag={tag} project={project} />)}</tbody>
              </table>
            </div>
          )
        )}

        {tab === "traces" && (
          <TracesTab
            samples={samples}
            traces={traces}
            tracesLoading={tracesLoading}
            tracesApiError={tracesApiError}
            tag={tag}
          />
        )}

        {tab === "snapshot" && <AgentSnapshotView snap={snap} />}
      </div>
    </div>
  );
}
