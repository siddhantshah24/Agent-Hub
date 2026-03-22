"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Code2, GitBranch } from "lucide-react";
import {
  API,
  BORDER,
  CYAN,
  EMERALD,
  MUTED,
  PURPLE,
  SURFACE,
  type Project,
  type Run,
  ProjectSelector,
  SnapshotModal,
  VersionHistoryRunTable,
  WorkspaceShell,
} from "@/components/agent-lab/workspace-ui";
import { VeraMascot } from "@/components/vera";

function VersionHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("default");
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyTag, setHistoryTag] = useState("");
  const [snapTag, setSnapTag] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then((ps: Project[]) => {
        setProjects(ps);
        if (ps.length > 0) {
          if (projectFromUrl && ps.some(p => p.name === projectFromUrl)) {
            setSelectedProject(projectFromUrl);
          } else {
            setSelectedProject(ps[0].name);
          }
        }
      })
      .catch(() => {});
  }, [projectFromUrl]);

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

  useEffect(() => {
    if (runs.length === 0) {
      setHistoryTag("");
      return;
    }
    setHistoryTag(runs[runs.length - 1].version_tag);
  }, [runs]);

  const selectedRun = runs.find(r => r.version_tag === historyTag);

  function openRun() {
    if (!historyTag) return;
    const proj = selectedProject !== "default" ? `?project=${encodeURIComponent(selectedProject)}` : "";
    router.push(`/run/${encodeURIComponent(historyTag)}${proj}`);
  }

  if (loading) {
    return (
      <WorkspaceShell>
        <div className="flex min-h-[18rem] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${CYAN}66`, borderTopColor: "transparent" }}
          />
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <div className="space-y-8">
        {snapTag && (
          <SnapshotModal tag={snapTag} project={selectedProject} onClose={() => setSnapTag(null)} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="nav-link inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ProjectSelector projects={projects} selected={selectedProject} onChange={setSelectedProject} />
        </div>

        <div className="flex items-start gap-4">
          <VeraMascot size={44} showFootnote={false} className="hidden sm:block shrink-0" title="VERA" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: CYAN }}>
              VERA · versioning agent
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-200">Version history</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pick a version (with notes), then open the run or frozen source for that tag.
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
              className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
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
              {selectedRun?.snapshot_path && (
                <button
                  type="button"
                  onClick={() => historyTag && setSnapTag(historyTag)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/[0.04]"
                  style={{ color: "#b8a8e6" }}
                  title="Syntax-highlighted source captured for this tag"
                >
                  <Code2 size={15} style={{ color: PURPLE, opacity: 0.95 }} />
                  <span>
                    Frozen snapshot <span style={{ color: MUTED }}>·</span>{" "}
                    <span className="font-mono text-[11px]" style={{ color: MUTED }}>
                      {selectedRun.snapshot_path?.split("/").pop()}
                    </span>
                  </span>
                </button>
              )}
            </div>
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
