"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Code2, ChevronRight, ChevronUp, Cpu, MessageSquare, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PURPLE = "#A78BFA";
const EMERALD = "#4ADE80";
const AMB = "#F59E0B";
const BORDER = "#3D3860";
const MUTED = "#9B97BB";
const BG = "#1a1628";
const MONO = "var(--font-mono), 'JetBrains Mono', monospace";

export interface ToolDef {
  name: string;
  description: string;
  source: "inline" | "external";
  schema: Record<string, unknown>;
}

/** Same shape as `GET /api/snapshot/{tag}` */
export interface AgentSnapshotData {
  available: boolean;
  tag?: string;
  filename?: string;
  content?: string;
  files?: string[];
  reason?: string;
  system_prompts?: Record<string, string>;
  model?: Record<string, unknown>;
  tools?: ToolDef[];
  content_hash?: string;
}

function SectionHeader({ icon: Icon, color, title, badge }: {
  icon: LucideIcon; color: string; title: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER}`, background: "#1A1729" }}>
      <Icon size={14} style={{ color }} />
      <span className="text-sm font-semibold text-slate-200">{title}</span>
      {badge}
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolDef }) {
  const [open, setOpen] = useState(false);
  const isInline = tool.source === "inline";
  const hasSchema = tool.schema && Object.keys(tool.schema).length > 0;
  const color = isInline ? EMERALD : AMB;

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <button
        type="button"
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

type AgentSnapshotViewProps = {
  snap: AgentSnapshotData | null;
  /** Agent Code section starts expanded (default: false, same as run tab) */
  agentCodeInitiallyOpen?: boolean;
  /** Tighter outer wrapper for embedding in cards */
  className?: string;
};

/**
 * Full agent snapshot: system prompts, model, tools, collapsible source — same as Run → Agent Snapshot tab.
 */
export function AgentSnapshotView({
  snap,
  agentCodeInitiallyOpen = false,
  className = "",
}: AgentSnapshotViewProps) {
  const [agentCodeOpen, setAgentCodeOpen] = useState(agentCodeInitiallyOpen);
  const prompts = snap?.system_prompts ?? {};
  const model = snap?.model ?? {};
  const tools = snap?.tools ?? [];
  const promptEntries = Object.entries(prompts).filter(([k]) => k !== "_active");
  const modelEntries = Object.entries(model).filter(([k]) => k !== "class");
  const active = prompts["_active"];
  const inlineCount = tools.filter(t => t.source === "inline").length;
  const extCount = tools.filter(t => t.source === "external").length;

  if (!snap) {
    return (
      <p className="px-4 py-8 text-center text-sm" style={{ color: MUTED }}>
        Loading snapshot…
      </p>
    );
  }

  if (!snap.available) {
    return (
      <p className="px-4 py-8 text-center text-sm" style={{ color: MUTED }}>
        {snap.reason ?? "No snapshot captured for this version."}
      </p>
    );
  }

  return (
    <div className={`divide-y rounded-lg overflow-hidden ${className}`.trim()} style={{ borderColor: BORDER, border: `1px solid ${BORDER}` }}>
      <div>
        <SectionHeader icon={MessageSquare} color={PURPLE} title="System Prompt"
          badge={active ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-1"
              style={{ color: PURPLE, background: "rgba(167,139,250,0.12)", border: `1px solid rgba(167,139,250,0.3)` }}>
              active: {active}
            </span>
          ) : null}
        />
        <div className="p-5 space-y-4" style={{ background: BG }}>
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
                  <pre className="px-4 py-3 text-sm leading-relaxed overflow-auto max-h-64"
                    style={{ fontFamily: MONO, color: "#C9D1D9", background: BG, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {text}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <SectionHeader icon={Cpu} color={AMB} title="Model Configuration"
          badge={model.model ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-1"
              style={{ color: AMB, background: "rgba(245,158,11,0.12)", border: `1px solid rgba(245,158,11,0.3)` }}>{String(model.model)}</span>
          ) : null}
        />
        <div className="p-5" style={{ background: BG }}>
          {Object.keys(model).length === 0 ? (
            <p className="text-sm italic" style={{ color: MUTED }}>No model config detected.</p>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              <table className="w-full text-sm">
                <tbody>
                  {model.class != null && (
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: MUTED, width: "140px" }}>class</td>
                      <td className="px-4 py-3 font-mono font-bold" style={{ color: PURPLE }}>{String(model.class)}</td>
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

      <div>
        <SectionHeader icon={Wrench} color={EMERALD} title="Tools"
          badge={
            <div className="flex items-center gap-2 ml-2 flex-wrap">
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
        <div className="p-5" style={{ background: BG }}>
          {tools.length === 0 ? (
            <p className="text-sm italic" style={{ color: MUTED }}>No tools captured. Run a fresh eval to populate tool metadata.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {tools.map(t => <ToolCard key={t.name} tool={t} />)}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-b-lg">
        <button
          type="button"
          onClick={() => setAgentCodeOpen(o => !o)}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
          style={{ background: "#1A1729", borderBottom: agentCodeOpen ? `1px solid ${BORDER}` : undefined }}
        >
          <Code2 size={14} style={{ color: PURPLE }} />
          <span className="text-sm font-semibold text-slate-200 shrink-0">Agent Code</span>
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap justify-end">
            {snap.files && snap.files.length > 1 && (
              <span className="text-[10px] truncate max-w-[40%]" style={{ color: MUTED }} title={snap.files.join(", ")}>
                {snap.files.join(", ")}
              </span>
            )}
            {snap.filename && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0"
                style={{ background: "rgba(139,92,246,0.15)", color: PURPLE, border: `1px solid rgba(139,92,246,0.3)` }}>
                {snap.filename}
              </span>
            )}
            <span className="text-[10px] font-medium shrink-0" style={{ color: MUTED }}>
              {agentCodeOpen ? "Hide" : "Show"} source
            </span>
            {agentCodeOpen ? <ChevronUp size={16} style={{ color: MUTED }} className="shrink-0" />
              : <ChevronRight size={16} style={{ color: MUTED }} className="shrink-0" />}
          </div>
        </button>
        {agentCodeOpen && (
          <div>
            {!snap.content ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 px-5" style={{ background: BG }}>
                <p className="text-sm text-center" style={{ color: MUTED }}>No source file in snapshot.</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[min(70vh,720px)]">
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
        )}
      </div>
    </div>
  );
}
