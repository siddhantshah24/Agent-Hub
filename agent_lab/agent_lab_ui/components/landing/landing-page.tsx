"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronRight,
  Cpu,
  Database,
  Eye,
  FileCode,
  GitCompare,
  LineChart,
  MessageSquare,
  Network,
  ScanLine,
  Shield,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Workflow,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { VeraHero, VeraMascot } from "@/components/vera";

const PURPLE = "#c4b5fd";
const PURPLE_DIM = "#7c3aed";
const EMERALD = "#34d399";
const CYAN = "#22d3ee";
const BORDER = "#2a2444";
const SURFACE = "#12101c";
const SURFACE_ELEV = "#181624";
const MUTED = "#8b8999";

function TiltPanel({
  children,
  className = "",
  highlight = false,
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({
    transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
    glare: "radial-gradient(circle at 50% 50%, transparent, transparent)",
  });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateX(${y * -10}deg) rotateY(${x * 10}deg) scale3d(1.015,1.015,1.015)`,
      glare: `radial-gradient(circle at ${50 + x * 80}% ${50 + y * 80}%, rgba(34,211,238,0.08), transparent 55%)`,
    });
  }, []);

  const onLeave = useCallback(() => {
    setStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      glare: "radial-gradient(circle at 50% 50%, transparent, transparent)",
    });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative h-full min-h-[200px] overflow-hidden rounded-2xl border transition-shadow duration-300 ${
        highlight
          ? "shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_24px_80px_rgba(124,58,237,0.18)]"
          : "hover:shadow-[0_20px_60px_rgba(124,58,237,0.12)]"
      } ${className}`}
      style={{
        borderColor: highlight ? "rgba(34,211,238,0.35)" : BORDER,
        background: highlight ? `linear-gradient(165deg, rgba(34,211,238,0.06), ${SURFACE_ELEV})` : SURFACE_ELEV,
        transform: style.transform,
        transition: "transform 0.12s ease-out",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: style.glare }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** Explanation column + interactive graphic column */
function FeatureSplitRow({
  eyebrow,
  title,
  description,
  bullets,
  children,
  highlight,
  reversed,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  children: React.ReactNode;
  highlight?: boolean;
  reversed?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-2 md:items-start md:gap-10 lg:gap-14">
      <div className={`min-w-0 space-y-4 ${reversed ? "md:order-2" : ""}`}>
        <p
          className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em]"
          style={{ color: highlight ? CYAN : MUTED }}
        >
          {eyebrow}
        </p>
        <h3 className="text-xl font-bold leading-snug text-slate-50 sm:text-2xl">{title}</h3>
        <p className="text-[15px] leading-relaxed text-slate-400 sm:text-base">{description}</p>
        {bullets && bullets.length > 0 && (
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-500">
            {bullets.map(b => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
      <div className={`min-h-[220px] min-w-0 w-full ${reversed ? "md:order-1" : ""}`}>
        <TiltPanel highlight={!!highlight}>{children}</TiltPanel>
      </div>
    </div>
  );
}

function InteractiveTerminal({ split }: { split?: boolean }) {
  const [step, setStep] = useState(0);
  const lines = [
    {
      cmd: "agentlab eval --limit 10",
      out: [
        "✓ Dataset loaded (10 cases)",
        "✓ Pass rate 84% | avg 1.2s | $0.0004/call",
        "Snapshot → .agentlab/snapshots/run-002-…",
      ],
    },
    { cmd: "agentlab rollback v1", out: ["✓ Checked out snapshot for v1", "Tip: re-run eval to confirm behaviour."] },
    { cmd: "agentlab ui", out: ["✓ UI server started. Dashboard URL printed in the terminal."] },
  ];
  const cur = lines[step % lines.length];

  return (
    <div className={`space-y-3 font-mono text-[11px] ${split ? "p-4 sm:p-5" : "p-5"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal size={14} style={{ color: CYAN }} />
          {!split && <span className="font-semibold text-slate-300">Command Line Bridge</span>}
          {split && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Live mock</span>}
        </div>
        <button
          type="button"
          onClick={() => setStep(s => s + 1)}
          className="rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-white/5"
          style={{ color: PURPLE_DIM, border: `1px solid ${BORDER}` }}
        >
          Run next →
        </button>
      </div>
      <div className="rounded-xl p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <p style={{ color: EMERALD }}>
          <span style={{ color: MUTED }}>$ </span>
          {cur.cmd}
        </p>
        {cur.out.map((l, i) => (
          <p key={`${step}-${i}`} className="mt-1.5 text-slate-400">
            {l}
          </p>
        ))}
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          The <code className="text-cyan-400/90">agentlab</code> CLI runs <code className="text-violet-300/90">init</code>,{" "}
          <code className="text-violet-300/90">eval</code>, <code className="text-violet-300/90">rollback</code>, and{" "}
          <code className="text-violet-300/90">ui</code> so you can version agents and snapshots without leaving the terminal.
        </p>
      )}
    </div>
  );
}

function MockChart({ split }: { split?: boolean }) {
  const [hover, setHover] = useState(false);
  const pts = [62, 71, 68, 84, 88, 91];
  const gradId = `lg-chart-${useId().replace(/:/g, "")}`;
  return (
    <div className={`space-y-3 ${split ? "p-4 sm:p-5" : "p-5"}`}>
      {!split && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart size={14} style={{ color: PURPLE }} />
            <span className="text-sm font-semibold text-slate-200">Dashboard</span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: CYAN }}>
            80% gate
          </span>
        </div>
      )}
      {split && (
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span>Accuracy trend</span>
          <span style={{ color: CYAN }}>80% gate</span>
        </div>
      )}
      <div
        className="relative h-28 rounded-xl px-2 pt-2"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <svg viewBox="0 0 200 80" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PURPLE_DIM} stopOpacity="0.4" />
              <stop offset="100%" stopColor={PURPLE_DIM} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="64" x2="200" y2="64" stroke={MUTED} strokeOpacity="0.2" strokeDasharray="4 4" />
          <polyline
            fill={`url(#${gradId})`}
            stroke="none"
            points={`0,80 ${pts.map((p, i) => `${(i / (pts.length - 1)) * 200},${80 - p * 0.65}`).join(" ")} 200,80`}
          />
          <polyline
            fill="none"
            stroke={PURPLE}
            strokeWidth={hover ? 3.2 : 2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pts.map((p, i) => `${(i / (pts.length - 1)) * 200},${80 - p * 0.65}`).join(" ")}
            style={{ filter: hover ? "drop-shadow(0 0 10px rgba(167,139,250,0.55))" : undefined }}
          />
        </svg>
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          The dashboard charts accuracy across tags on your golden set so you can spot regressions before you ship.
        </p>
      )}
    </div>
  );
}

function MockTraceLogs({ split }: { split?: boolean }) {
  const steps = [
    { tag: "LLM", line: "system + user prompt · task #3", tone: "cyan" as const },
    { tag: "Tool", line: 'retrieve("docs", query="…") → 4 chunks', tone: "amber" as const },
    { tag: "LLM", line: "final answer + grounding check", tone: "cyan" as const },
  ];
  return (
    <div className={`space-y-3 ${split ? "p-4 sm:p-5" : "p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScanLine size={14} style={{ color: CYAN }} />
          {!split && <span className="text-sm font-semibold text-slate-100">Trace call log</span>}
          {split && <span className="text-xs font-semibold text-slate-200">Version · v2.1</span>}
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: MUTED }}>
          sample #3
        </span>
      </div>
      {!split && (
        <p className="text-[11px] leading-relaxed text-slate-400">
          Each tag in <span className="text-slate-200">version history</span> opens runs with{" "}
          <span className="text-cyan-400/90">ordered trace steps</span>: prompts, tool I/O, and LLM turns per golden task.
        </p>
      )}
      <div
        className="overflow-hidden rounded-xl text-[10px] font-mono leading-relaxed"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex border-b last:border-b-0"
            style={{
              borderColor: BORDER,
              background: i % 2 === 0 ? "rgba(15,12,28,0.9)" : "rgba(24,22,36,0.65)",
            }}
          >
            <div
              className="w-[52px] shrink-0 border-r px-2 py-2 text-center text-[9px] font-bold uppercase"
              style={{
                borderColor: BORDER,
                color: s.tone === "cyan" ? CYAN : "#F59E0B",
              }}
            >
              {s.tag}
            </div>
            <div className="flex-1 px-2.5 py-2 text-slate-300">{s.line}</div>
          </div>
        ))}
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          Same structure appears in run detail when your eval records traces: history becomes a provable timeline, not a guess.
        </p>
      )}
    </div>
  );
}

function MockDiff({ split }: { split?: boolean }) {
  if (split) {
    return (
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitCompare size={14} style={{ color: CYAN }} />
            <span className="text-xs font-semibold text-slate-200">Side-by-side diff checker</span>
          </div>
          <span className="text-[9px] font-mono" style={{ color: MUTED }}>
            same tasks
          </span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          For each golden task, v1 and v2 are aligned: prompts, tool calls, LLM responses, plus aggregate metrics and code.
        </p>
        <div
          className="overflow-hidden rounded-xl border text-[10px] font-mono"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          <div className="grid grid-cols-2 border-b" style={{ borderColor: BORDER }}>
            <div className="border-r px-2 py-1.5" style={{ borderColor: BORDER, background: "rgba(34,211,238,0.08)" }}>
              <span style={{ color: EMERALD }}>v1</span> <span style={{ color: MUTED }}>baseline</span>
            </div>
            <div className="px-2 py-1.5" style={{ background: "rgba(167,139,250,0.10)" }}>
              <span style={{ color: PURPLE }}>v2</span> <span style={{ color: MUTED }}>candidate</span>
            </div>
          </div>
          <div className="border-b px-2 py-1.5 text-slate-500" style={{ borderColor: BORDER }}>
            Task · sample #2 · identical input
          </div>
          <div className="grid grid-cols-2 border-b" style={{ borderColor: BORDER }}>
            <div className="border-r p-2 text-slate-400" style={{ borderColor: BORDER }}>
              <span style={{ color: MUTED }}>prompt:</span> use 2 tools max
            </div>
            <div className="p-2 text-slate-300">
              <span style={{ color: MUTED }}>prompt:</span> use tools until confident
            </div>
          </div>
          <div className="grid grid-cols-2 border-b" style={{ borderColor: BORDER }}>
            <div className="border-r p-2 text-slate-400" style={{ borderColor: BORDER }}>
              <span style={{ color: MUTED }}>tool:</span> search_kb ×1
            </div>
            <div className="p-2 text-slate-300">
              <span style={{ color: MUTED }}>tool:</span> search_kb ×2, calc ×1
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="border-r p-2 text-slate-400" style={{ borderColor: BORDER }}>
              <span style={{ color: MUTED }}>LLM:</span> short answer
            </div>
            <div className="p-2 text-slate-200">
              <span style={{ color: MUTED }}>LLM:</span> answer + cite sources
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitCompare size={14} style={{ color: CYAN }} />
          <span className="text-sm font-semibold text-slate-100">Diff Viewer</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ color: EMERALD, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.35)" }}
        >
          Highlight
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400">
        Pick two tags, then inspect <span className="text-cyan-400/90">side-by-side behavior</span> (prompts, tools, LLM
        turns), <span className="text-violet-300/90">code</span>, metrics, and traces for the same tasks.
      </p>
      <div
        className="group/diff overflow-hidden rounded-xl text-[10px] font-mono leading-relaxed transition-shadow hover:shadow-[0_0_32px_rgba(34,211,238,0.15)]"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="diff-delete px-2 py-1.5 pl-3 opacity-95 transition-opacity group-hover/diff:opacity-100">
          − tool_choice=&quot;none&quot;  # v1
        </div>
        <div className="diff-insert px-2 py-1.5 pl-3 opacity-95 transition-opacity group-hover/diff:opacity-100">
          + tool_choice=&quot;auto&quot;   # v2
        </div>
        <div className="diff-equal px-2 py-1.5 pl-3 text-slate-500">
          &nbsp; return graph.invoke(state)
        </div>
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
        The fastest way to see what changed between agent versions: behavior per task, not just final strings.
      </p>
    </div>
  );
}

function MockAgnosticPipeline({ split }: { split?: boolean }) {
  const stacks = ["LangChain", "LangGraph", "RAG / custom"];
  return (
    <div className={`space-y-3 ${split ? "p-4 sm:p-5" : "p-5"}`}>
      <div className="flex items-center gap-2">
        <Workflow size={14} style={{ color: EMERALD }} />
        {!split && <span className="text-sm font-semibold text-slate-200">Agnostic pipeline</span>}
      </div>
      {split && (
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Same loop, any stack</p>
      )}
      <div className="flex flex-wrap gap-2">
        {stacks.map(name => (
          <span
            key={name}
            className="rounded-lg border px-2.5 py-1.5 text-[10px] font-mono leading-none"
            style={{ borderColor: BORDER, color: CYAN, background: "rgba(34,211,238,0.07)" }}
          >
            {name}
          </span>
        ))}
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          Point AgentLab at chains, graphs, or bespoke agents: one eval harness and dashboard, not a separate tool per
          framework.
        </p>
      )}
    </div>
  );
}

function MockProjects({ split }: { split?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`space-y-3 ${split ? "p-4 sm:p-5" : "p-5"}`}>
      {!split && (
        <div className="flex items-center gap-2">
          <Database size={14} style={{ color: CYAN }} />
          <span className="text-sm font-semibold text-slate-200">Project Switcher</span>
        </div>
      )}
      {split && <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Click to expand</p>}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-white/[0.04]"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
        onClick={() => setOpen(o => !o)}
      >
        <span>01_math_multiverse</span>
        <ChevronRight size={14} style={{ color: MUTED, transform: open ? "rotate(90deg)" : "none" }} />
      </button>
      {open && (
        <div className="space-y-1 rounded-xl p-2 text-[11px]" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(124,58,237,0.15)", color: PURPLE }}>
            01_math_multiverse
          </div>
          <div className="px-2 py-1.5 text-slate-400">02_rag_support_bot</div>
          <div className="px-2 py-1.5 text-slate-400">03_stress_typewriter</div>
        </div>
      )}
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          The API can host multiple target agents. Switch the active project in the dashboard and keep one UI for every codebase you evaluate.
        </p>
      )}
    </div>
  );
}

function MockFeedbackLoop({ split }: { split?: boolean }) {
  return (
    <div className={`space-y-3 ${split ? "p-4 sm:p-5" : "p-5"}`}>
      <div className="flex items-center gap-2">
        <MessageSquare size={14} style={{ color: PURPLE }} />
        {!split && <span className="text-sm font-semibold text-slate-200">Review &amp; export</span>}
      </div>
      {split && (
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Per-sample + version notes</p>
      )}
      <div className="rounded-xl p-3 text-[11px]" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-slate-400">sample #12</span>
          <span className="flex items-center gap-1.5">
            <ThumbsUp size={13} style={{ color: EMERALD }} aria-hidden />
            <ThumbsDown size={13} style={{ color: MUTED }} aria-hidden />
          </span>
        </div>
        <p className="mt-2 leading-relaxed" style={{ color: MUTED }}>
          Suggestion: tighten tool args before the final answer (matches reviewer note on v0.4.2).
        </p>
      </div>
      <div
        className="rounded-lg border px-3 py-2 text-[10px] font-mono leading-relaxed"
        style={{ borderColor: `${BORDER}cc`, color: CYAN, background: "rgba(34,211,238,0.06)" }}
      >
        Run note · v0.4.2: &quot;Golden set drift on edge cases; re-check routing.&quot;
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          Bundle judgments with traces and metrics, then export when you are ready to train or fine-tune.
        </p>
      )}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="relative -mx-6 -mt-8 min-w-0 w-full max-w-none overflow-x-hidden">
      <section className="relative w-full min-w-0">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "#1a1628" }}
        />

        <div className="relative z-[1] grid min-h-[calc(100svh-3.5rem)] min-h-[calc(100dvh-3.5rem)] w-full grid-cols-1 grid-rows-[auto_1fr] md:min-h-[calc(100svh-3.5rem)] md:grid-cols-2 md:grid-rows-1">
          <div className="landing-hero-animate flex min-h-0 w-full flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 md:min-h-[calc(100svh-3.5rem)] md:px-8 lg:px-10 xl:px-14 2xl:px-16">
            <p
              className="max-w-xl text-[11px] font-semibold uppercase leading-snug tracking-[0.14em] sm:text-xs sm:tracking-[0.16em]"
              style={{ color: CYAN }}
            >
              Agent versioning and continuous evaluation for LLM agents
            </p>
            <h1 className="mt-3 max-w-[40ch] text-[clamp(1.75rem,4vw+0.5rem,3rem)] font-bold leading-[1.08] tracking-tight text-slate-50">
              Ship agent versions{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #e9d5ff, #a78bfa 45%, #34d399)" }}
              >
                you can prove
              </span>{" "}
              improved.
            </h1>
            <p className="mt-5 max-w-xl text-[clamp(0.95rem,1.2vw+0.6rem,1.125rem)] font-normal leading-relaxed" style={{ color: MUTED }}>
              AI is moving fast, but developer tooling has not kept up: workflows stay fragmented, integrations feel
              brittle, and it is hard to know whether a change really helped. AgentLab closes that gap with versioned
              agent runs, repeatable golden evals, and side-by-side diffs and traces so you connect metrics to real behavior
              before you merge or deploy.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: MUTED }}>
              <span className="font-semibold text-slate-400">VERA</span> is your versioning guide: tags, runs, and diffs stay
              aligned so you always know which version you are viewing and reviewers can follow the evidence end to end.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, #5b21b6, #7c3aed)",
                  boxShadow: "0 14px 48px rgba(91,33,182,0.45)",
                }}
              >
                Open dashboard
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#features-explained"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/[0.04]"
                style={{ border: `1px solid ${BORDER}`, color: CYAN }}
              >
                Primary features
              </a>
            </div>
          </div>

          <div
            className="relative flex h-full min-h-0 w-full flex-col border-t md:border-l md:border-t-0"
            style={{
              borderColor: BORDER,
              background: "#1c1729",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <VeraHero />
          </div>
        </div>
      </section>

      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: "#181624" }}
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">Why trust matters</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: MUTED }}>
            We designed AgentLab so teams can ship with evidence, not guesswork. Four themes drive the product.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:gap-5">
            {[
              {
                icon: Shield,
                ic: CYAN,
                title: "Reliability",
                body: "Compare runs on the same golden tasks before you ship. Catch regressions when behavior flips, not after users do.",
              },
              {
                icon: Eye,
                ic: PURPLE_DIM,
                title: "Transparency",
                body: "Ground decisions in traces, per-sample results, and diffs. You see what the agent did, not only the final answer.",
              },
              {
                icon: FileCode,
                ic: EMERALD,
                title: "Code awareness",
                body: "Snapshots and code diffs show what changed in agent source between versions so review stays tied to behavior.",
              },
              {
                icon: Network,
                ic: CYAN,
                title: "Developer empowerment",
                body: "One HTTP API for the dashboard and your automation. Run evals from the CLI and wire the same loop into CI.",
              },
            ].map(({ icon: Icon, ic, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border p-5 sm:p-6"
                style={{ borderColor: BORDER, background: SURFACE_ELEV }}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <Icon size={20} className="mt-0.5 shrink-0" style={{ color: ic }} aria-hidden />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-100">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
                      {body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature explanations first, then side-by-side interactive graphics */}
      <section
        id="features-explained"
        className="scroll-mt-24 border-t px-4 py-16 sm:px-6 lg:px-10"
        style={{ borderColor: BORDER, background: "#1a1628" }}
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">AgentLab&apos;s Primary Features</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: MUTED }}>
            Treat each version tag like a release: run <span className="font-mono text-slate-400">agentlab eval</span> when
            your agent changes, watch pass-rate trends on a fixed golden set, and open a diff between any two tags. The same
            evaluation loop works across LangChain, LangGraph, RAG, or custom graphs, with optional semantic scores (for
            example RAGAS) when your project records them. Below, each block pairs a short explanation with a live-style
            graphic.
          </p>

        <div className="mt-12 flex flex-col gap-20 lg:gap-24 sm:mt-14">
          <FeatureSplitRow
            eyebrow="Agent version history"
            title="Trace call logs in version history"
            description="Every evaluated tag belongs in your history. Open a version for golden tasks, scores, and expandable trace logs: prompts, tools, and LLM steps per sample so audits tie numbers to real execution."
            bullets={[
              "One tag selects a full slice of behavior across your dataset.",
              "Traces follow your stack’s real order: prompts → tools → model turns.",
              "Optional deep links to external observability when your eval stores them.",
            ]}
          >
            <MockTraceLogs split />
          </FeatureSplitRow>

          <FeatureSplitRow
            reversed
            highlight
            eyebrow="Diff Viewer"
            title="Side-by-side behavior check"
            description="The Diff Viewer lines up two tags in columns: prompts, tools, LLM steps, answers, timelines when available, plus metrics and code, so you see how reasoning changed, not only the final string."
            bullets={[
              "Pick baseline and compare on the dashboard, then open metrics, Split Compare, and code diff.",
              "Expand per-sample rows to the same task on both sides when routing or tools changed.",
              "Share a URL with query params so reviewers land in the checker.",
            ]}
          >
            <MockDiff split />
          </FeatureSplitRow>

          <FeatureSplitRow
            eyebrow="Human Feedback Loop"
            title="Notes, signals, and export"
            description="Notes and per-sample signals you can export when you close the loop. Reviewers leave thumbs, written change suggestions next to runs, and version-level notes on the dashboard, paired with traces and metrics so the signal stays grounded."
            bullets={[
              "Per-sample review with concrete suggestions sits beside pass/fail and cost.",
              "Version notes capture what changed between tags for the whole team.",
              "Export paths support training or RLHF-style datasets when you are ready.",
            ]}
          >
            <MockFeedbackLoop split />
          </FeatureSplitRow>

          <FeatureSplitRow
            reversed
            eyebrow="Continuous evaluation"
            title="Command Line Bridge"
            description="The agentlab CLI is easy to use: run golden evals, roll back to a stored snapshot for a tag, and launch the UI against your local API. Your shell stays the source of truth for scripts and CI."
            bullets={[
              "eval runs the dataset and records run history plus artifact paths.",
              "rollback checks out a tagged tree for inspection or re-run.",
              "ui opens the same dashboard data the API serves.",
            ]}
          >
            <InteractiveTerminal split />
          </FeatureSplitRow>

          <FeatureSplitRow
            eyebrow="Dashboard"
            title="Dashboard"
            description="The dashboard charts accuracy across tags on your golden set and surfaces version history, diff entry points, and key metrics: one place to see whether recent edits helped before you ship."
            bullets={[
              "Trends come from stored runs: no one-off spreadsheets.",
              "Use a reference line as a team quality bar (for example 80%).",
            ]}
          >
            <MockChart split />
          </FeatureSplitRow>

          <FeatureSplitRow
            reversed
            eyebrow="Agnostic Pipeline"
            title="Same eval loop, any stack"
            description="AgentLab does not assume a single framework. Wire LangChain, LangGraph, RAG stacks, or a custom graph. The same eval API, dashboard, and version history apply regardless of how the agent is built."
            bullets={[
              "One golden loop for whatever stack your repo uses.",
              "Semantic or custom quality hooks can plug in alongside pass/fail when you add them.",
              "Keeps comparisons fair: same dataset and tasks across versions.",
            ]}
          >
            <MockAgnosticPipeline split />
          </FeatureSplitRow>

          <FeatureSplitRow
            eyebrow="Multi-tenant UI"
            title="Easy project switch"
            description="The FastAPI layer can expose more than one target agent or repo. The dashboard project control switches context in one click so one UI tracks many codebases without mixing runs or notes."
            bullets={[
              "Runs and history stay scoped to the project you selected.",
              "Useful when several agents share one AgentLab install.",
            ]}
          >
            <MockProjects split />
          </FeatureSplitRow>

          <div
            className="grid gap-6 rounded-2xl border p-6 sm:grid-cols-2 sm:p-8"
            style={{ borderColor: BORDER, background: SURFACE_ELEV }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} style={{ color: PURPLE }} />
                <h3 className="font-semibold text-slate-100">Run Control Plane (API)</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                Projects, runs, and notes are served over HTTP. The dashboard and any script you write see the same JSON and
                history, so automation and humans stay aligned.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} style={{ color: CYAN }} />
                <h3 className="font-semibold text-slate-100">Run Inspection</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                Open <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-cyan-300/90">/run/[tag]</code>{" "}
                for one version: every sample, pass or fail, latency, cost, and expandable execution detail when tracing is
                available.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ScanLine size={18} style={{ color: PURPLE }} />
                <h3 className="font-semibold text-slate-100">Trace deep links</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                When a run stores a trace URL per sample, you can open it from the run or diff views to inspect full tool
                timelines next to AgentLab&apos;s summary metrics.
              </p>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="px-4 pb-24 pt-8 sm:px-8">
        <div
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl px-8 py-12 text-center"
          style={{
            border: `1px solid ${BORDER}`,
            background: "#1c1729",
            boxShadow: "0 0 40px rgba(124,58,237,0.12)",
          }}
        >
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <VeraMascot size={52} showFootnote={false} title="VERA" />
          </div>
          <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">Try it in three steps</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed" style={{ color: MUTED }}>
            Run an eval from the CLI, open the dashboard, then pick two tags in the Diff Viewer. VERA keeps version context
            clear while you inspect runs, traces, and trends so you can explain what you built and what you would do next.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #5b21b6, #7c3aed)" }}
            >
              <Boxes size={17} />
              Go to evaluation overview
            </Link>
            <code
              className="rounded-xl px-4 py-3 text-xs font-mono"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: EMERALD }}
            >
              agentlab eval --limit 10
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
