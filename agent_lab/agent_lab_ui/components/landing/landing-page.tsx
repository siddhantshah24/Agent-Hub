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
import { CLAUDE_ORANGE, CLAUDE_ORANGE_BORDER } from "@/lib/anthropic-brand";

const PURPLE = "#c4b5fd";
const PURPLE_DIM = "#7c3aed";
const EMERALD = "#34d399";
const CYAN = "#22d3ee";
const BORDER = "#2a2444";
const SURFACE = "#12101c";
const SURFACE_ELEV = "#181624";
const MUTED = "#b0aac8";

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
      transform:
        "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
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
        background: highlight
          ? `linear-gradient(165deg, rgba(34,211,238,0.06), ${SURFACE_ELEV})`
          : SURFACE_ELEV,
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
        <h3 className="text-xl font-bold leading-snug text-slate-50 sm:text-2xl">
          {title}
        </h3>
        <p className="text-[15px] leading-relaxed text-slate-400 sm:text-base">
          {description}
        </p>
        {bullets && bullets.length > 0 && (
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-500">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
      <div
        className={`min-h-[220px] min-w-0 w-full ${reversed ? "md:order-1" : ""}`}
      >
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
    {
      cmd: "agentlab rollback v1",
      out: [
        "✓ Checked out snapshot for v1",
        "Tip: re-run eval to confirm behaviour.",
      ],
    },
    {
      cmd: "agentlab ui",
      out: ["✓ UI server started. Dashboard URL printed in the terminal."],
    },
  ];
  const cur = lines[step % lines.length];

  return (
    <div
      className={`space-y-3 font-mono text-[11px] ${split ? "p-4 sm:p-5" : "p-5"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal size={14} style={{ color: CYAN }} />
          {!split && (
            <span className="font-semibold text-slate-300">
              Command Line Bridge
            </span>
          )}
          {split && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Live mock
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          className="rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-white/5"
          style={{ color: PURPLE_DIM, border: `1px solid ${BORDER}` }}
        >
          Run next →
        </button>
      </div>
      <div
        className="rounded-xl p-3"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
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
          The <code className="text-cyan-400/90">agentlab</code> CLI runs{" "}
          <code className="text-violet-300/90">init</code>,{" "}
          <code className="text-violet-300/90">eval</code>,{" "}
          <code className="text-violet-300/90">rollback</code>, and{" "}
          <code className="text-violet-300/90">ui</code> so you can version
          agents and snapshots without leaving the terminal.
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
            <span className="text-sm font-semibold text-slate-200">
              Dashboard
            </span>
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
        <svg
          viewBox="0 0 200 80"
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PURPLE_DIM} stopOpacity="0.4" />
              <stop offset="100%" stopColor={PURPLE_DIM} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="64"
            x2="200"
            y2="64"
            stroke={MUTED}
            strokeOpacity="0.2"
            strokeDasharray="4 4"
          />
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
            points={pts
              .map((p, i) => `${(i / (pts.length - 1)) * 200},${80 - p * 0.65}`)
              .join(" ")}
            style={{
              filter: hover
                ? "drop-shadow(0 0 10px rgba(167,139,250,0.55))"
                : undefined,
            }}
          />
        </svg>
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          The dashboard charts accuracy across tags on your golden set so you
          can spot regressions before you ship.
        </p>
      )}
    </div>
  );
}

function MockTraceLogs({ split }: { split?: boolean }) {
  const steps = [
    {
      tag: "LLM",
      line: "system + user prompt · task #3",
      tone: "cyan" as const,
    },
    {
      tag: "Tool",
      line: 'retrieve("docs", query="…") → 4 chunks',
      tone: "amber" as const,
    },
    {
      tag: "LLM",
      line: "final answer + grounding check",
      tone: "cyan" as const,
    },
  ];
  return (
    <div className={`space-y-3 ${split ? "p-4 sm:p-5" : "p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScanLine size={14} style={{ color: CYAN }} />
          {!split && (
            <span className="text-sm font-semibold text-slate-100">
              Trace call log
            </span>
          )}
          {split && (
            <span className="text-xs font-semibold text-slate-200">
              Version · v2.1
            </span>
          )}
        </div>
        <span
          className="text-[9px] font-mono uppercase tracking-wider"
          style={{ color: MUTED }}
        >
          sample #3
        </span>
      </div>
      {!split && (
        <p className="text-[11px] leading-relaxed text-slate-400">
          Each tag in <span className="text-slate-200">version history</span>{" "}
          opens runs with{" "}
          <span className="text-cyan-400/90">ordered trace steps</span>:
          prompts, tool I/O, and LLM turns per golden task.
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
              background:
                i % 2 === 0 ? "rgba(15,12,28,0.9)" : "rgba(24,22,36,0.65)",
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
          Same structure appears in run detail when your eval records traces:
          history becomes a provable timeline, not a guess.
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
            <span className="text-xs font-semibold text-slate-200">
              Side-by-side diff checker
            </span>
          </div>
          <span className="text-[9px] font-mono" style={{ color: MUTED }}>
            same tasks
          </span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          For each golden task, v1 and v2 are aligned: prompts, tool calls, LLM
          responses, plus aggregate metrics and code.
        </p>
        <div
          className="overflow-hidden rounded-xl border text-[10px] font-mono"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          <div
            className="grid grid-cols-2 border-b"
            style={{ borderColor: BORDER }}
          >
            <div
              className="border-r px-2 py-1.5"
              style={{
                borderColor: BORDER,
                background: "rgba(34,211,238,0.08)",
              }}
            >
              <span style={{ color: EMERALD }}>v1</span>{" "}
              <span style={{ color: MUTED }}>baseline</span>
            </div>
            <div
              className="px-2 py-1.5"
              style={{ background: "rgba(167,139,250,0.10)" }}
            >
              <span style={{ color: PURPLE }}>v2</span>{" "}
              <span style={{ color: MUTED }}>candidate</span>
            </div>
          </div>
          <div
            className="border-b px-2 py-1.5 text-slate-500"
            style={{ borderColor: BORDER }}
          >
            Task · sample #2 · identical input
          </div>
          <div
            className="grid grid-cols-2 border-b"
            style={{ borderColor: BORDER }}
          >
            <div
              className="border-r p-2 text-slate-400"
              style={{ borderColor: BORDER }}
            >
              <span style={{ color: MUTED }}>prompt:</span> use 2 tools max
            </div>
            <div className="p-2 text-slate-300">
              <span style={{ color: MUTED }}>prompt:</span> use tools until
              confident
            </div>
          </div>
          <div
            className="grid grid-cols-2 border-b"
            style={{ borderColor: BORDER }}
          >
            <div
              className="border-r p-2 text-slate-400"
              style={{ borderColor: BORDER }}
            >
              <span style={{ color: MUTED }}>tool:</span> search_kb ×1
            </div>
            <div className="p-2 text-slate-300">
              <span style={{ color: MUTED }}>tool:</span> search_kb ×2, calc ×1
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div
              className="border-r p-2 text-slate-400"
              style={{ borderColor: BORDER }}
            >
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
          <span className="text-sm font-semibold text-slate-100">
            Diff Viewer
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            color: EMERALD,
            background: "rgba(52,211,153,0.12)",
            border: "1px solid rgba(52,211,153,0.35)",
          }}
        >
          Highlight
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400">
        Pick two tags, then inspect{" "}
        <span className="text-cyan-400/90">side-by-side behavior</span>{" "}
        (prompts, tools, LLM turns),{" "}
        <span className="text-violet-300/90">code</span>, metrics, and traces
        for the same tasks.
      </p>
      <div
        className="group/diff overflow-hidden rounded-xl text-[10px] font-mono leading-relaxed transition-shadow hover:shadow-[0_0_32px_rgba(34,211,238,0.15)]"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="diff-delete px-2 py-1.5 pl-3 opacity-95 transition-opacity group-hover/diff:opacity-100">
          − tool_choice=&quot;none&quot; # v1
        </div>
        <div className="diff-insert px-2 py-1.5 pl-3 opacity-95 transition-opacity group-hover/diff:opacity-100">
          + tool_choice=&quot;auto&quot; # v2
        </div>
        <div className="diff-equal px-2 py-1.5 pl-3 text-slate-500">
          &nbsp; return graph.invoke(state)
        </div>
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
        The fastest way to see what changed between agent versions: behavior per
        task, not just final strings.
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
        {!split && (
          <span className="text-sm font-semibold text-slate-200">
            Agnostic pipeline
          </span>
        )}
      </div>
      {split && (
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Same loop, any stack
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {stacks.map((name) => (
          <span
            key={name}
            className="rounded-lg border px-2.5 py-1.5 text-[10px] font-mono leading-none"
            style={{
              borderColor: BORDER,
              color: CYAN,
              background: "rgba(34,211,238,0.07)",
            }}
          >
            {name}
          </span>
        ))}
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          Point AgentLab at chains, graphs, or bespoke agents: one eval harness
          and dashboard, not a separate tool per framework.
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
          <span className="text-sm font-semibold text-slate-200">
            Project Switcher
          </span>
        </div>
      )}
      {split && (
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Click to expand
        </p>
      )}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-white/[0.04]"
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          color: "#e2e8f0",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span>01_math_multiverse</span>
        <ChevronRight
          size={14}
          style={{ color: MUTED, transform: open ? "rotate(90deg)" : "none" }}
        />
      </button>
      {open && (
        <div
          className="space-y-1 rounded-xl p-2 text-[11px]"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <div
            className="rounded-lg px-2 py-1.5"
            style={{ background: "rgba(124,58,237,0.15)", color: PURPLE }}
          >
            01_math_multiverse
          </div>
          <div className="px-2 py-1.5 text-slate-400">02_rag_support_bot</div>
          <div className="px-2 py-1.5 text-slate-400">03_stress_typewriter</div>
        </div>
      )}
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          The API can host multiple target agents. Switch the active project in
          the dashboard and keep one UI for every codebase you evaluate.
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
        {!split && (
          <span className="text-sm font-semibold text-slate-200">
            Review &amp; export
          </span>
        )}
      </div>
      {split && (
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Per-sample + version notes
        </p>
      )}
      <div
        className="rounded-xl p-3 text-[11px]"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-slate-400">sample #12</span>
          <span className="flex items-center gap-1.5">
            <ThumbsUp size={13} style={{ color: EMERALD }} aria-hidden />
            <ThumbsDown size={13} style={{ color: MUTED }} aria-hidden />
          </span>
        </div>
        <p className="mt-2 leading-relaxed" style={{ color: MUTED }}>
          Suggestion: tighten tool args before the final answer (matches
          reviewer note on v0.4.2).
        </p>
      </div>
      <div
        className="rounded-lg border px-3 py-2 text-[10px] font-mono leading-relaxed"
        style={{
          borderColor: `${BORDER}cc`,
          color: CYAN,
          background: "rgba(34,211,238,0.06)",
        }}
      >
        Run note · v0.4.2: &quot;Golden set drift on edge cases; re-check
        routing.&quot;
      </div>
      {!split && (
        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
          Bundle judgments with traces and metrics, then export when you are
          ready to train or fine-tune.
        </p>
      )}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="relative -mx-6 -mt-8 min-w-0 w-full max-w-none overflow-x-hidden">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full min-w-0">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "#1a1628" }}
        />

        <div
          className="relative z-[1] grid min-h-[calc(100svh-3.5rem)] w-full grid-cols-1 md:grid-cols-2"
          style={{ gridTemplateRows: "1fr" }}
        >
          {/* Left — text content, vertically centred */}
          <div className="flex min-h-[50vh] w-full flex-col items-start justify-center px-6 py-10 sm:px-10 md:min-h-[calc(100svh-3.5rem)] md:px-12 lg:px-16 xl:px-20">
            {/* Headline */}
            <h1 className="max-w-xl text-[clamp(1.65rem,3.2vw+0.85rem,2.65rem)] font-bold leading-[1.12] tracking-tight text-slate-50 sm:max-w-2xl">
              No vibe checks{" "}
              <span
                className="inline-block whitespace-nowrap bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #e9d5ff, #a78bfa 50%, #c4b5fd)",
                }}
              >
                only Diffs
              </span>
              .
            </h1>

            <a
              href="https://www.anthropic.com/claude"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors hover:bg-[rgba(217,119,87,0.14)] hover:text-[#e8a090]"
              style={{
                borderColor: CLAUDE_ORANGE_BORDER,
                color: CLAUDE_ORANGE,
              }}
            >
              Powered by Claude · Anthropic
            </a>

            {/* Tagline — slightly wider, better breathing room */}
            <p
              className="mt-6 max-w-lg text-[clamp(1rem,1.3vw+0.5rem,1.125rem)] leading-relaxed"
              style={{ color: MUTED }}
            >
              <span className="font-semibold text-slate-200">AgentLab </span> is
              the missing layer between AI agents and production. Version your
              agent&apos;s full state, run eval datasets automatically, and
              compare every change with traces all in one place.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, #5b21b6, #7c3aed)",
                  boxShadow: "0 14px 48px rgba(91,33,182,0.50)",
                }}
              >
                Open dashboard
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <a
                href="#features-explained"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-white/[0.06]"
                style={{
                  border: "1px solid rgba(34,211,238,0.45)",
                  color: CYAN,
                }}
              >
                See how it works
              </a>
            </div>

            {/* CLI pill */}

            {/* Scroll cue */}
            <div
              className="mt-14 hidden md:flex items-center gap-2"
              style={{ color: MUTED }}
            >
              <ChevronRight size={13} className="rotate-90 opacity-50" />
              <span className="text-[11px] uppercase tracking-widest opacity-50">
                Scroll to explore
              </span>
            </div>
          </div>

          {/* Right — VERA, full height, no border seam */}
          <div
            className="relative flex min-h-[50vh] w-full flex-col items-stretch md:min-h-[calc(100svh-3.5rem)]"
            style={{ background: "#1a1628" }}
          >
            <VeraHero />
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────────── */}
      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: SURFACE_ELEV }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              The problem we solve
            </h2>
            <p
              className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base"
              style={{ color: MUTED }}
            >
              AI capabilities are advancing fast. Tooling hasn&apos;t kept up.
              Developers change a prompt, swap a model, or tweak a tool and have
              no reliable way to know if things got better or worse.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div
              className="rounded-2xl border p-5 sm:p-6"
              style={{
                borderColor: BORDER,
                borderLeft: "3px solid #7c3aed",
                borderRadius: "0 1rem 1rem 0",
                background: SURFACE,
              }}
            >
              <h3 className="font-semibold text-slate-100">Before AgentLab</h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: MUTED }}
              >
                Prompt changed in a file. Model swapped. Tool definition
                changed. No record of what combination ran. No score to compare.
                Debugging is archaeology.
              </p>
            </div>
            <div
              className="rounded-2xl border p-5 sm:p-6"
              style={{
                borderColor: BORDER,
                borderLeft: "3px solid #34d399",
                borderRadius: "0 1rem 1rem 0",
                background: SURFACE,
              }}
            >
              <h3 className="font-semibold text-slate-100">After AgentLab</h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: MUTED }}
              >
                Every change is a versioned snapshot. Every eval run is traced.
                Every verion is diffed. You know exactly what changed and
                whether it helped.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 Feature cards ────────────────────────────────────────────────── */}
      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: "#1a1628" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Core features
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#b0aac8" }}>
              Click any card to see it in action below.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                bg: "rgba(124,58,237,0.12)",
                icon: "⊞",
                href: "#feat-trace",
                title: "Agent version history",
                body: "Open any version tag to see golden tasks, scores and full execution traces per sample.",
              },
              {
                bg: "rgba(245,158,11,0.10)",
                icon: "⇄",
                href: "#feat-diff",
                title: "Diff Viewer",
                body: "Line up two version tags and see exactly how prompts, tools and scores changed.",
              },
              {
                bg: "rgba(239,68,68,0.10)",
                icon: "↗",
                href: "#feat-feedback",
                title: "Human Feedback Loop",
                body: "Leave thumbs and written suggestions per run then export for training or RLHF.",
              },
              {
                bg: "rgba(52,211,153,0.10)",
                icon: "≡",
                href: "#feat-cli",
                title: "Continuous evaluation",
                body: "Run evals, roll back version tags and launch the dashboard from your terminal.",
              },
              {
                bg: "rgba(52,211,153,0.10)",
                icon: "✓",
                href: "#feat-dashboard",
                title: "Dashboard",
                body: "Track accuracy trends across versions and surface diff entry points in one place.",
              },
              {
                bg: "rgba(124,58,237,0.12)",
                icon: "◎",
                href: "#feat-agnostic",
                title: "Agnostic Pipeline",
                body: "Wire LangGraph, LangChain, RAG pipelines or a custom graph to the same eval loop.",
              },
            ].map(({ bg, icon, href, title, body }) => (
              <a
                key={title}
                href={href}
                className="group rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:border-violet-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                style={{
                  borderColor: BORDER,
                  background: SURFACE_ELEV,
                  display: "block",
                  textDecoration: "none",
                }}
              >
                <div
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold transition-transform group-hover:scale-110"
                  style={{ background: bg, color: PURPLE }}
                >
                  {icon}
                </div>
                <h3 className="font-semibold text-slate-100">{title}</h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: "#b0aac8" }}
                >
                  {body}
                </p>
                <div
                  className="mt-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: PURPLE }}
                >
                  See detail <ChevronRight size={11} />
                </div>
              </a>
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            AgentLab&apos;s Primary Features
          </h2>
          {/* <p
            className="mt-4 max-w-3xl text-base leading-relaxed sm:text-lg"
            style={{ color: MUTED }}
          >
            Treat each version tag like a release: run{" "}
            <span className="font-mono text-slate-400">agentlab eval</span> when
            your agent changes, watch pass-rate trends on a fixed golden set,
            and open a diff between any two tags. The same evaluation loop works
            across LangChain, LangGraph, RAG, or custom graphs, with optional
            semantic scores (for example RAGAS) when your project records them.
            Below, each block pairs a short explanation with a live-style
            graphic.
          </p> */}

          <div className="mt-12 flex flex-col gap-20 lg:gap-24 sm:mt-14">
            <div id="feat-trace" className="scroll-mt-24">
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
            </div>

            <div id="feat-diff" className="scroll-mt-24">
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
            </div>

            <div id="feat-feedback" className="scroll-mt-24">
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
            </div>

            <div id="feat-cli" className="scroll-mt-24">
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
            </div>

            <div id="feat-dashboard" className="scroll-mt-24">
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
            </div>

            <div id="feat-agnostic" className="scroll-mt-24">
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
            </div>

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

            {/* <div
              className="grid gap-6 rounded-2xl border p-6 sm:grid-cols-2 sm:p-8"
              style={{ borderColor: BORDER, background: SURFACE_ELEV }}
            > */}
            {/* <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu size={18} style={{ color: PURPLE }} />
                  <h3 className="font-semibold text-slate-100">
                    Run Control Plane (API)
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  Projects, runs, and notes are served over HTTP. The dashboard
                  and any script you write see the same JSON and history, so
                  automation and humans stay aligned.
                </p>
              </div> */}
            {/* <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} style={{ color: CYAN }} />
                  <h3 className="font-semibold text-slate-100">
                    Run Inspection
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  Open{" "}
                  <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-cyan-300/90">
                    /run/[tag]
                  </code>{" "}
                  for one version: every sample, pass or fail, latency, cost,
                  and expandable execution detail when tracing is available.
                </p>
              </div> */}
            {/* <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ScanLine size={18} style={{ color: PURPLE }} />
                  <h3 className="font-semibold text-slate-100">
                    Trace deep links
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  When a run stores a trace URL per sample, you can open it from
                  the run or diff views to inspect full tool timelines next to
                  AgentLab&apos;s summary metrics.
                </p>
              </div> */}
            {/* </div> */}
          </div>
        </div>
      </section>

      {/* ── VERA section ───────────────────────────────────────────────────── */}
      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: SURFACE_ELEV }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-start gap-8 sm:flex-nowrap sm:items-center">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border"
            style={{
              background: "rgba(124,58,237,0.15)",
              borderColor: "rgba(167,139,250,0.3)",
            }}
          >
            <VeraMascot size={60} showFootnote={false} title="VERA" animate />
          </div>
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50">
              VERA, your eval guide
            </h2>
            <p
              className="mt-3 w-full text-justify text-sm leading-relaxed sm:text-[0.9375rem] sm:leading-[1.7] hyphens-auto"
              style={{ color: MUTED, textWrap: "pretty" as const }}
            >
              VERA is AgentLab&apos;s mascot and built-in assistant. She
              surfaces insights from your eval runs, flags regressions before
              you deploy, and explains what changed between versions in plain
              language. When scores drop, VERA tells you why.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: "#1a1628" }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              How it works
            </h2>
          </div>
          <div className="mt-10 flex flex-col gap-8">
            {[
              {
                n: "1",
                title: "Add agent-eval.yml to your repo",
                body: "Point it at your agent file, your eval dataset, and your local Langfuse. No changes to your agent code.",
              },
              {
                n: "2",
                title: "Cut a version",
                body: "Run agentlab eval --tag v1. AgentLab snapshots your full agent state into SQLite with a content hash and a diff from the previous version.",
                code: "agentlab eval --tag v1",
              },
              {
                n: "3",
                title: "Run eval against the dataset",
                body: "Every dataset item gets a trace in Langfuse. Scores, latency, and cost are attached automatically per sample.",
              },
              {
                n: "4",
                title: "Change something, diff the results",
                body: "Cut v2 with a new prompt or model. Run eval again. Compare correctness, latency, and cost side-by-side in the dashboard.",
                code: "agentlab ui",
              },
            ].map(({ n, title, body, code }) => (
              <div key={n} className="flex gap-5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ background: PURPLE_DIM }}
                >
                  {n}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="font-semibold text-slate-100">{title}</h3>
                  <p
                    className="mt-1.5 text-sm leading-relaxed"
                    style={{ color: MUTED }}
                  >
                    {body}
                  </p>
                  {code && (
                    <code
                      className="mt-2 inline-block rounded-lg px-3 py-1.5 text-xs font-mono"
                      style={{
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        color: EMERALD,
                      }}
                    >
                      {code}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What gets versioned ────────────────────────────────────────────── */}
      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: SURFACE_ELEV }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            What gets versioned
          </h2>
          <p
            className="mx-auto mt-3 max-w-lg text-sm leading-relaxed"
            style={{ color: MUTED }}
          >
            A version snapshot is not just a prompt. It is the full
            configuration of your agent at a point in time.
          </p>

          <div
            className="mx-auto mt-8 max-w-xl rounded-2xl p-6 text-left"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <pre
              className="text-[13px] leading-8"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: MUTED,
              }}
            >
              <span style={{ color: PURPLE }}>prompt</span>
              {"      "}→{"  "}system instructions &amp; persona{"\n"}
              <span style={{ color: PURPLE }}>model</span>
              {"       "}→{"  "}Claude 4, Claude 3.5 Sonnet, Opus…{"\n"}
              <span style={{ color: PURPLE }}>tools</span>
              {"       "}→{"  "}web_search, calculator, RAG…{"\n"}
              <span style={{ color: EMERALD }}>temperature</span>
              {"  "}→{"  "}0.3, 0.7, 1.0{"\n"}
              <span style={{ color: EMERALD }}>memory</span>
              {"      "}→{"  "}strategy, max_tokens{"\n"}
              <span style={{ color: EMERALD }}>rag_config</span>
              {"   "}→{"  "}index, top_k, chunk_overlap{"\n"}
              <span style={{ color: "#f59e0b" }}>eval_summary</span>
              {"  "}→{"  "}scores, latency, cost (Langfuse)
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "faithfulness",
              "answer_relevancy",
              "correctness",
              "latency_ms",
              "total_cost_usd",
              "tool_calls_seen",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border px-3 py-1 text-[11px] font-mono"
                style={{ borderColor: BORDER, color: MUTED }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Version diff example ───────────────────────────────────────────── */}
      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: "#1a1628" }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Example version diff
          </h2>
          <p
            className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
            style={{ color: MUTED }}
          >
            Running{" "}
            <code
              className="rounded px-1.5 py-0.5 font-mono text-xs"
              style={{ background: SURFACE, color: EMERALD }}
            >
              agentlab ui
            </code>{" "}
            and comparing v1 → v3 gives you this.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "correctness",
                val: "+0.12 ↑",
                sub: "0.79 → 0.91",
                color: EMERALD,
              },
              {
                label: "latency",
                val: "+4.2 s ↑",
                sub: "2.8 s → 7.0 s",
                color: "#f87171",
              },
              {
                label: "cost / run",
                val: "+$0.004",
                sub: "$0.001 → $0.005",
                color: "#f87171",
              },
              {
                label: "tools added",
                val: "web_search",
                sub: "v1 had none",
                color: PURPLE,
              },
            ].map(({ label, val, sub, color }) => (
              <div
                key={label}
                className="rounded-2xl p-5 text-center"
                style={{
                  background: SURFACE_ELEV,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <p
                  className="text-[11px] uppercase tracking-widest"
                  style={{ color: MUTED }}
                >
                  {label}
                </p>
                <p className="mt-2 text-xl font-semibold" style={{ color }}>
                  {val}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built for the rubric ─────────────────────────────────────────────
      <section
        className="border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        style={{ borderColor: BORDER, background: SURFACE_ELEV }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Built for the rubric
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                pts: "25 pts",
                label: "Impact",
                color: "#f87171",
                border: "#f87171",
                body: "Solves a real pain felt by every AI developer team: no reliable way to know if agent changes improved or broke things.",
              },
              {
                pts: "30 pts",
                label: "Technical execution",
                color: "#60a5fa",
                border: "#60a5fa",
                body: "Dual-DB system (SQLite + Langfuse), eval runner, snapshot versioning, FastAPI bridge, and Next.js dashboard. Fully runnable demo.",
              },
              {
                pts: "25 pts",
                label: "Ethical alignment",
                color: EMERALD,
                border: EMERALD,
                body: "Transparency by design. Every decision is traceable. Regression detection prevents silent failures from reaching production.",
              },
              {
                pts: "20 pts",
                label: "Presentation",
                color: "#f59e0b",
                border: "#f59e0b",
                body: "CLI + dashboard + Langfuse UI. One command to version, one command to eval, one dashboard to compare. Easy to demo live.",
              },
            ].map(({ pts, label, color, border, body }) => (
              <div
                key={label}
                className="rounded-r-2xl border p-5"
                style={{
                  borderColor: BORDER,
                  borderLeft: `3px solid ${border}`,
                  background: SURFACE,
                }}
              >
                <p className="text-xl font-semibold" style={{ color }}>
                  {pts}
                </p>
                <p className="text-sm font-semibold text-slate-300">{label}</p>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: MUTED }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* ── CTA + install ──────────────────────────────────────────────────── */}
      <section
        className="border-t px-4 pb-24 pt-14 sm:px-6 sm:pt-16 lg:px-10 text-center"
        style={{ borderColor: BORDER, background: "#1a1628" }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Ready to version your agent?
          </h2>
          <p
            className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
            style={{ color: MUTED }}
          >
            Add AgentLab to any existing agent repo. Your agent code stays
            untouched.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #5b21b6, #7c3aed)",
              }}
            >
              <Boxes size={16} />
              Open evaluation dashboard
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/[0.04]"
              style={{ border: `1px solid ${BORDER}`, color: CYAN }}
            >
              Read the docs
            </Link>
          </div>

          <div
            className="mx-auto mt-8 inline-block rounded-2xl p-5 text-left"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <pre
              className="text-[13px] leading-7"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: MUTED,
              }}
            >
              <span style={{ color: MUTED }}>$</span>{" "}
              <span style={{ color: EMERALD }}>agentlab init</span>
              {"\n"}
              <span style={{ color: MUTED }}>$</span>{" "}
              <span style={{ color: EMERALD }}>agentlab eval --tag v1</span>
              {"\n"}
              <span style={{ color: MUTED }}>$</span>{" "}
              <span style={{ color: EMERALD }}>agentlab eval --tag v2</span>
              {"\n"}
              <span style={{ color: MUTED }}>$</span>{" "}
              <span style={{ color: EMERALD }}>agentlab ui</span>{" "}
              <span style={{ color: MUTED }}># compare at localhost:3001</span>
            </pre>
          </div>

          <p className="mt-8 space-y-2 text-[12px] leading-relaxed" style={{ color: MUTED }}>
            <span className="block">
              <a
                href="https://www.anthropic.com/claude"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2 transition-colors hover:text-[#e8a090]"
                style={{
                  color: CLAUDE_ORANGE,
                  textDecorationColor: CLAUDE_ORANGE_BORDER,
                }}
              >
                Powered by Claude
              </a>
              <span className="text-slate-500"> · Anthropic</span>
            </span>
            <span className="block">
              AgentLab &mdash; VERA &mdash; HackASU 2026 &mdash; Claude Builder
              Club &mdash; March 20&ndash;22, 2026
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
