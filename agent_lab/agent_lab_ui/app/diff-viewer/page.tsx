"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, GitCompare } from "lucide-react";
import {
  API,
  BORDER,
  CYAN,
  MUTED,
  PURPLE,
  SURFACE,
  type Project,
  type Run,
  DiffPickRunTable,
  ProjectSelector,
  WorkspaceShell,
} from "@/components/agent-lab/workspace-ui";
import { VeraMascot } from "@/components/vera";

function DiffViewerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("default");
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [diffV1, setDiffV1] = useState("");
  const [diffV2, setDiffV2] = useState("");

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
      setDiffV1("");
      setDiffV2("");
      return;
    }
    const last = runs[runs.length - 1];
    const prev = runs[runs.length - 2];
    setDiffV1(prev ? prev.version_tag : last.version_tag);
    setDiffV2(last.version_tag);
  }, [runs]);

  function openDiff() {
    if (!diffV1 || !diffV2 || diffV1 === diffV2) return;
    const base = `/diff?v1=${encodeURIComponent(diffV1)}&v2=${encodeURIComponent(diffV2)}`;
    const proj = selectedProject !== "default" ? `&project=${encodeURIComponent(selectedProject)}` : "";
    router.push(base + proj);
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-200">Diff Viewer</h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose two versions, then open the side-by-side compare (metrics, behavior, code diff).
            </p>
          </div>
        </div>

        {runs.length === 0 ? (
          <p className="text-center text-slate-500">No runs to compare for this project yet.</p>
        ) : (
          <div
            className="flex min-h-0 flex-col gap-4 rounded-xl border p-5 sm:p-6"
            style={{ background: SURFACE, borderColor: BORDER }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${CYAN}18`, boxShadow: `0 0 12px ${CYAN}22` }}
              >
                <GitCompare size={20} style={{ color: CYAN }} />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-200">Compare versions</h2>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: MUTED }}>
                  Select baseline and candidate rows (notes shown). This opens the full compare at{" "}
                  <span className="font-mono text-slate-400">/diff</span>.
                </p>
              </div>
            </div>
            <div className="grid min-h-0 min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <DiffPickRunTable
                runs={runs}
                selected={diffV1}
                onSelect={setDiffV1}
                label="Baseline (v1)"
                accent="v1"
              />
              <DiffPickRunTable
                runs={runs}
                selected={diffV2}
                onSelect={setDiffV2}
                label="Compare (v2)"
                accent="v2"
              />
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
              {diffV1 && diffV2 && diffV1 === diffV2
                ? "Pick two different versions."
                : !diffV1 || !diffV2
                  ? "Select one row in each table."
                  : `Ready: ${diffV1} ↔ ${diffV2}`}
            </p>
            <div className="pt-1">
              <button
                type="button"
                disabled={!diffV1 || !diffV2 || diffV1 === diffV2}
                onClick={openDiff}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)", color: "#0a1620" }}
              >
                Open compare
              </button>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

export default function DiffViewerPage() {
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
      <DiffViewerContent />
    </Suspense>
  );
}
