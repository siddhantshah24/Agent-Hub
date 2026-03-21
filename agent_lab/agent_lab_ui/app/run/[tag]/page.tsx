"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Activity, Zap, DollarSign, Layers, ArrowLeft,
  CheckCircle2, XCircle, Code2, ChevronDown, ChevronUp,
  Hash, MessageSquare, Cpu, Wrench, ChevronRight, Camera,
  Brain, Terminal, ExternalLink, AlertCircle, Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PURPLE  = "#A78BFA";
const EMERALD = "#4ADE80";
const ROSE    = "#FF7A96";
const AMB     = "#F59E0B";
const SURFACE = "#231F3A";
const BORDER  = "#3D3860";
const MUTED   = "#9B97BB";
const BG      = "#0D0B1A";
const MONO    = "var(--font-mono), 'JetBrains Mono', monospace";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Run {
  id: number; version_tag: string; success_rate: number;
  avg_latency_ms: number; avg_cost_usd: number;
  total_cases: number; snapshot_path: string | null;
  content_hash: string | null; timestamp: string;
}
interface Sample {
  sample_idx: number; input: string; expected: string;
  got: string; passed: boolean; latency_ms: number;
}
interface ToolDef {
  name: string; description: string; source: "inline" | "external"; schema: Record<string, any>;
}
interface SnapshotData {
  available: boolean; tag?: string; filename?: string; content?: string;
  files?: string[]; reason?: string;
  system_prompts?: Record<string, string>;
  model?: Record<string, any>;
  tools?: ToolDef[];
  content_hash?: string;
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

type TabId = "samples" | "traces" | "snapshot";

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
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
  active: boolean; icon: React.ElementType; label: string; onClick: () => void;
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
          <div key={i} className="flex items-start gap-2">
            <div className="flex flex-col items-center shrink-0" style={{ width: "20px" }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.30)" }}>
                <Wrench size={9} style={{ color: AMB }} />
              </div>
              {!isLast && <div className="w-px flex-1 mt-0.5" style={{ background: BORDER, minHeight: "12px" }} />}
            </div>
            <div className="flex-1 min-w-0 mb-2 rounded-lg px-3 py-2"
              style={{ background: BG, border: `1px solid ${BORDER}` }}>
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[10px] font-bold shrink-0" style={{ color: AMB, fontFamily: MONO }}>
                  {step.name}
                </span>
                <span className="text-[10px] flex-1 truncate" style={{ color: MUTED, fontFamily: MONO }}>
                  ({step.input?.slice(0, 80)}{(step.input?.length ?? 0) > 80 ? "…" : ""})
                </span>
              </div>
              {step.output && (
                <div className="flex items-center gap-1.5 mt-1">
                  <ChevronRight size={9} style={{ color: MUTED }} />
                  <span className="text-xs font-semibold" style={{ color: EMERALD, fontFamily: MONO }}>
                    {step.output.slice(0, 120)}{step.output.length > 120 ? "…" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
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

        {/* Langfuse link */}
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
                  {trace.error ? `Trace error: ${trace.error}` : "No Langfuse trace found for this sample"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                  Make sure Langfuse is running and this eval was run with tracing enabled
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
function TracesTab({ samples, traces, tracesLoading, tag }: {
  samples: Sample[];
  traces: Record<number, TraceInfo>;
  tracesLoading: boolean;
  tag: string;
}) {
  return (
    <div className="p-5 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: MUTED }}>
          Click any row to expand the full execution chain pulled from Langfuse.
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

      {samples.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm" style={{ color: MUTED }}>No samples found for this run.</p>
        </div>
      ) : (
        samples.map(s => (
          <TraceCard
            key={s.sample_idx}
            sample={s}
            trace={tracesLoading ? undefined : traces[s.sample_idx]}
          />
        ))
      )}
    </div>
  );
}

// ── Sample row (Samples tab) ───────────────────────────────────────────────────
function SampleRow({ s }: { s: Sample }) {
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
        <td className="px-4 py-3 text-right">
          {open ? <ChevronUp size={14} style={{ color: MUTED }} /> : <ChevronDown size={14} style={{ color: MUTED }} />}
        </td>
      </tr>
      {open && (
        <tr style={{ background: "#18152C", borderBottom: `1px solid ${BORDER}` }}>
          <td colSpan={7} className="px-6 py-4">
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

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, color, title, badge }: {
  icon: React.ElementType; color: string; title: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER}`, background: "#1A1729" }}>
      <Icon size={14} style={{ color }} />
      <span className="text-sm font-semibold text-slate-200">{title}</span>
      {badge}
    </div>
  );
}

// ── Tool card ──────────────────────────────────────────────────────────────────
function ToolCard({ tool }: { tool: ToolDef }) {
  const [open, setOpen] = useState(false);
  const isInline = tool.source === "inline";
  const hasSchema = tool.schema && Object.keys(tool.schema).length > 0;
  const color = isInline ? EMERALD : AMB;

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
        style={{ background: "#18162C" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#211E38"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#18162C"; }}
      >
        <Wrench size={12} style={{ color }} />
        <span className="font-mono text-sm font-semibold text-slate-200">{tool.name}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
          {isInline ? "inline" : "ext"}
        </span>
        {tool.description && (
          <span className="flex-1 text-xs text-slate-500 line-clamp-1 text-right pr-2">{tool.description}</span>
        )}
        {open ? <ChevronUp size={12} style={{ color: MUTED }} /> : <ChevronRight size={12} style={{ color: MUTED }} />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2.5" style={{ background: "#0D0B1A", borderTop: `1px solid ${BORDER}` }}>
          {tool.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>Description</p>
              <p className="text-xs text-slate-300 leading-relaxed">{tool.description}</p>
            </div>
          )}
          {hasSchema && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>Input Schema</p>
              <pre className="text-xs rounded p-2.5 overflow-auto"
                style={{ fontFamily: MONO, color: "#C9D1D9", background: "#131122", border: `1px solid ${BORDER}` }}>
                {JSON.stringify(tool.schema, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Agent Snapshot tab ─────────────────────────────────────────────────────────
function SnapshotTab({ snap }: { snap: SnapshotData | null }) {
  const prompts        = snap?.system_prompts ?? {};
  const model          = snap?.model ?? {};
  const tools          = snap?.tools ?? [];
  const promptEntries  = Object.entries(prompts).filter(([k]) => k !== "_active");
  const modelEntries   = Object.entries(model).filter(([k]) => k !== "class");
  const active         = prompts["_active"];
  const inlineCount    = tools.filter(t => t.source === "inline").length;
  const extCount       = tools.filter(t => t.source === "external").length;

  return (
    <div className="divide-y" style={{ borderColor: BORDER }}>

      {/* System Prompt */}
      <div>
        <SectionHeader icon={MessageSquare} color={PURPLE} title="System Prompt"
          badge={active ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-1"
              style={{ color: PURPLE, background: "rgba(167,139,250,0.12)", border: `1px solid rgba(167,139,250,0.3)` }}>
              active: {active}
            </span>
          ) : null}
        />
        <div className="p-5 space-y-4">
          {promptEntries.length === 0 ? (
            <p className="text-sm italic" style={{ color: MUTED }}>No system prompt variables detected.</p>
          ) : (
            promptEntries.map(([name, text]) => {
              const isActive = name === active;
              return (
                <div key={name} className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${isActive ? "rgba(167,139,250,0.5)" : BORDER}` }}>
                  <div className="flex items-center gap-2 px-4 py-2"
                    style={{ background: isActive ? "rgba(167,139,250,0.10)" : "#18162C", borderBottom: `1px solid ${BORDER}` }}>
                    <span className="font-mono text-xs font-bold" style={{ color: isActive ? PURPLE : MUTED }}>{name}</span>
                    {isActive && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ color: PURPLE, background: "rgba(167,139,250,0.18)", border: `1px solid rgba(167,139,250,0.3)` }}>ACTIVE</span>
                    )}
                  </div>
                  <pre className="px-4 py-3 text-sm leading-relaxed overflow-auto"
                    style={{ fontFamily: MONO, color: "#C9D1D9", background: BG, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {text}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Model */}
      <div>
        <SectionHeader icon={Cpu} color={AMB} title="Model Configuration"
          badge={model.model ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-1"
              style={{ color: AMB, background: "rgba(245,158,11,0.12)", border: `1px solid rgba(245,158,11,0.3)` }}>{model.model}</span>
          ) : null}
        />
        <div className="p-5">
          {Object.keys(model).length === 0 ? (
            <p className="text-sm italic" style={{ color: MUTED }}>No model config detected.</p>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              <table className="w-full text-sm">
                <tbody>
                  {model.class && (
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: MUTED, width: "140px" }}>class</td>
                      <td className="px-4 py-3 font-mono font-bold" style={{ color: PURPLE }}>{model.class}</td>
                    </tr>
                  )}
                  {modelEntries.map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: MUTED }}>{k}</td>
                      <td className="px-4 py-3 font-mono text-slate-200">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tools */}
      <div>
        <SectionHeader icon={Wrench} color={EMERALD} title="Tools"
          badge={
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                style={{ color: MUTED, background: "rgba(155,151,187,0.1)", border: `1px solid ${BORDER}` }}>
                {tools.length} total
              </span>
              {inlineCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: EMERALD, background: "rgba(74,222,128,0.10)", border: `1px solid rgba(74,222,128,0.3)` }}>
                  {inlineCount} inline
                </span>
              )}
              {extCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: AMB, background: "rgba(245,158,11,0.10)", border: `1px solid rgba(245,158,11,0.3)` }}>
                  {extCount} external
                </span>
              )}
            </div>
          }
        />
        <div className="p-5">
          {tools.length === 0 ? (
            <p className="text-sm italic" style={{ color: MUTED }}>No tools captured. Run a fresh eval to populate tool metadata.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {tools.map(t => <ToolCard key={t.name} tool={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Agent Code */}
      <div>
        <SectionHeader icon={Code2} color={PURPLE} title="Agent Code"
          badge={
            <div className="flex items-center gap-3 ml-auto">
              {snap?.files && snap.files.length > 1 && (
                <span className="text-[10px]" style={{ color: MUTED }}>{snap.files.join(", ")}</span>
              )}
              {snap?.filename && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                  style={{ background: "rgba(139,92,246,0.15)", color: PURPLE, border: `1px solid rgba(139,92,246,0.3)` }}>
                  {snap.filename}
                </span>
              )}
            </div>
          }
        />
        <div>
          {!snap?.available || !snap.content ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-sm" style={{ color: MUTED }}>{snap?.reason ?? "No snapshot captured."}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <SyntaxHighlighter
                language="python"
                style={vscDarkPlus}
                showLineNumbers
                lineNumberStyle={{ color: "#4A4565", minWidth: "3em", paddingRight: "1em", userSelect: "none" }}
                customStyle={{ margin: 0, background: BG, padding: "1.5rem", fontSize: "0.82rem", lineHeight: "1.65" }}
                codeTagProps={{ style: { fontFamily: MONO } }}
              >
                {snap.content}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
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
  const [snap,    setSnap]    = useState<SnapshotData | null>(null);
  const [traces,  setTraces]  = useState<Record<number, TraceInfo>>({});
  const [tracesLoading, setTracesLoading] = useState(true);
  const [tab,     setTab]     = useState<TabId>("samples");
  const [loading, setLoading] = useState(true);

  const pq = project !== "default" ? `?project=${encodeURIComponent(project)}` : "";

  // Load run meta, samples, snapshot in parallel
  useEffect(() => {
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
    });
  }, [tag, project]);

  // Load Langfuse traces separately (slower — don't block the page)
  useEffect(() => {
    setTracesLoading(true);
    const pqSep = pq ? pq : "";
    fetch(`${API}/api/traces/${encodeURIComponent(tag)}${pqSep}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const map: Record<number, TraceInfo> = {};
        (data?.traces ?? []).forEach((t: TraceInfo) => { map[t.sample_idx] = t; });
        setTraces(map);
        setTracesLoading(false);
      })
      .catch(() => setTracesLoading(false));
  }, [tag, project]);

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
                    {["#", "Input", "Expected", "Got", "Result", "Latency", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{samples.map(s => <SampleRow key={s.sample_idx} s={s} />)}</tbody>
              </table>
            </div>
          )
        )}

        {tab === "traces" && (
          <TracesTab
            samples={samples}
            traces={traces}
            tracesLoading={tracesLoading}
            tag={tag}
          />
        )}

        {tab === "snapshot" && <SnapshotTab snap={snap} />}
      </div>
    </div>
  );
}
