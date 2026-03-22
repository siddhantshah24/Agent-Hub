"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Code2, GitBranch, ChevronRight, ChevronUp } from "lucide-react";
import {
  API,
  BORDER,
  CYAN,
  MUTED,
  PURPLE,
  SURFACE,
  ProjectSelector,
  VersionHistoryRunTable,
  WorkspaceShell,
} from "@/components/agent-lab/workspace-ui";
import { AgentSnapshotView, type AgentSnapshotData } from "@/components/agent-lab/agent-snapshot-view";
import { VeraMascot } from "@/components/vera";
import { useAgentLabWorkspace } from "@/hooks/use-agentlab-workspace";
import { fetchAgentSnapshot } from "@/lib/fetch-agent-snapshot";

function VersionHistoryContent() {
  const router = useRouter();
  const {
    urlProject,
    resolvedProject,
    projects,
    runs,
    showLoading,
    setSelectedProject,
    projectQs,
  } = useAgentLabWorkspace("/version-history");

  const project = resolvedProject ?? urlProject;
  const [historyTag, setHistoryTag] = useState("");
  const [snapPreview, setSnapPreview] = useState<AgentSnapshotData | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);
  /** Agent snapshot panel (same as Run → Agent Snapshot tab) */
  const [snapExpanded, setSnapExpanded] = useState(true);

  useEffect(() => {
    if (runs.length === 0) {
      setHistoryTag("");
      return;
    }
    setHistoryTag(runs[runs.length - 1].version_tag);
  }, [runs]);

  useEffect(() => {
    setSnapExpanded(true);
  }, [historyTag]);

  useEffect(() => {
    setSnapPreview(null);
  }, [project]);

  useEffect(() => {
    if (!historyTag) {
      setSnapPreview(null);
      return;
    }
    setSnapLoading(true);
    setSnapPreview(null);
    fetchAgentSnapshot(historyTag, project, API)
      .then((d: AgentSnapshotData) => setSnapPreview(d))
      .finally(() => setSnapLoading(false));
  }, [historyTag, project]);

  const selectedRun = runs.find(r => r.version_tag === historyTag);

  function openRun() {
    if (!historyTag) return;
    const proj = project !== "default" ? `?project=${encodeURIComponent(project)}` : "";
    router.push(`/run/${encodeURIComponent(historyTag)}${proj}`);
  }

  if (showLoading) {
    return (
      <WorkspaceShell>
        <div className="flex min-h-[18rem] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${CYAN}66`, borderTopColor: "transparent" }}
          />
          <p className="ml-3 text-sm text-slate-500">Loading version history…</p>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/dashboard${projectQs}`}
            className="nav-link inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ProjectSelector
            projects={projects}
            selected={resolvedProject ?? urlProject}
            onChange={setSelectedProject}
          />
        </div>

        <div className="flex items-start gap-4">
          <VeraMascot size={44} showFootnote={false} className="hidden sm:block shrink-0" title="VERA" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: CYAN }}>
              VERA · versioning agent
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-200">Version history</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pick a version (with notes), then open the run or expand the agent snapshot (prompts, model, tools, code).
            </p>
          </div>
        </div>

        {runs.length === 0 ? (
          <p className="text-center text-slate-500">No runs for this project yet.</p>
        ) : (
          <div
            className="flex min-h-0 flex-col gap-4 rounded-xl border p-5 sm:p-6"
            style={{ background: SURFACE, borderColor: BORDER }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${PURPLE}18`, boxShadow: `0 0 12px ${PURPLE}22` }}
              >
                <GitBranch size={20} style={{ color: PURPLE }} />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-200">Runs</h2>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: MUTED }}>
                  Golden samples, costs, and trace call logs per task open from the run view.
                </p>
              </div>
            </div>
            <VersionHistoryRunTable runs={runs} selectedTag={historyTag} onSelect={setHistoryTag} />
            <div
              className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center"
              style={{ borderColor: `${BORDER}99` }}
            >
              <button
                type="button"
                disabled={!historyTag}
                onClick={openRun}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #7C3AED, #8B5CF6)", color: "#fff" }}
              >
                View run &amp; traces
              </button>
            </div>

            {/* Agent snapshot: same structured view as Run → Agent Snapshot tab */}
            {historyTag && (
              <div
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: BORDER, background: "#14101f" }}
              >
                <button
                  type="button"
                  onClick={() => setSnapExpanded(e => !e)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                  style={{ borderBottom: snapExpanded ? `1px solid ${BORDER}` : undefined }}
                >
                  <Code2 size={18} style={{ color: PURPLE }} />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-200">Agent snapshot</span>
                    <span className="block text-[11px] mt-0.5 truncate" style={{ color: MUTED }}>
                      Prompts, model, tools &amp; code ·{" "}
                      {selectedRun?.snapshot_path?.split("/").pop() ?? snapPreview?.filename ?? historyTag}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium shrink-0" style={{ color: MUTED }}>
                    {snapExpanded ? "Hide" : "Show"}
                  </span>
                  {snapExpanded ? <ChevronUp size={18} style={{ color: MUTED }} /> : <ChevronRight size={18} style={{ color: MUTED }} />}
                </button>
                {snapExpanded && (
                  <div className="min-h-0 p-3 sm:p-4" style={{ background: SURFACE }}>
                    {snapLoading ? (
                      <div className="flex items-center justify-center py-16 gap-3">
                        <div
                          className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
                          style={{ borderColor: PURPLE, borderTopColor: "transparent" }}
                        />
                        <span className="text-sm" style={{ color: MUTED }}>Loading agent snapshot…</span>
                      </div>
                    ) : snapPreview === null ? (
                      <p className="px-2 py-8 text-center text-sm" style={{ color: MUTED }}>
                        Could not load snapshot.
                      </p>
                    ) : (
                      <AgentSnapshotView key={historyTag} snap={snapPreview} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

export default function VersionHistoryPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceShell>
          <div className="flex min-h-[18rem] items-center justify-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${CYAN}66`, borderTopColor: "transparent" }}
            />
          </div>
        </WorkspaceShell>
      }
    >
      <VersionHistoryContent />
    </Suspense>
  );
}
