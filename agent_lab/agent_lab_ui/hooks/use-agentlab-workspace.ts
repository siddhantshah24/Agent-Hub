"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  API,
  type Project,
  type Run,
} from "@/components/agent-lab/workspace-ui";

/**
 * Loads `/api/projects` + `/api/versions` and resolves `?project=` the same way on every workspace page.
 * `basePath` is where `router.replace` sends the user (e.g. `/dashboard`, `/version-history`).
 */
export function useAgentLabWorkspace(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProject = searchParams.get("project") ?? "default";
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsReady, setProjectsReady] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const resolvedProject = useMemo(() => {
    if (!projectsReady) return null;
    if (projects.length === 0) return urlProject;
    const known = projects.some(p => p.name === urlProject);
    if (known) return urlProject;
    const sorted = [...projects].sort(
      (a, b) => b.run_count - a.run_count || a.name.localeCompare(b.name),
    );
    return sorted[0]!.name;
  }, [projectsReady, projects, urlProject]);

  function setSelectedProject(p: string) {
    router.replace(
      p === "default"
        ? basePath
        : `${basePath}?project=${encodeURIComponent(p)}`,
      { scroll: false },
    );
  }

  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then((d: unknown) => {
        const list = Array.isArray(d) ? d : (d as { projects?: Project[] }).projects ?? [];
        setProjects(list);
      })
      .catch(() => {})
      .finally(() => setProjectsReady(true));
  }, []);

  useEffect(() => {
    if (!projectsReady || projects.length === 0) return;
    if (resolvedProject == null || resolvedProject === urlProject) return;
    router.replace(
      resolvedProject === "default"
        ? basePath
        : `${basePath}?project=${encodeURIComponent(resolvedProject)}`,
      { scroll: false },
    );
  }, [projectsReady, projects.length, resolvedProject, urlProject, router, basePath]);

  useEffect(() => {
    if (resolvedProject == null) return;
    setLoading(true);
    const url =
      resolvedProject === "default"
        ? `${API}/api/versions`
        : `${API}/api/versions?project=${encodeURIComponent(resolvedProject)}`;
    fetch(url)
      .then(r => r.json())
      .then((d: unknown) => {
        const list = Array.isArray(d) ? d : (d as { runs?: Run[] }).runs ?? [];
        setRuns(list as Run[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [resolvedProject]);

  const projectQs =
    resolvedProject != null && resolvedProject !== "default"
      ? `?project=${encodeURIComponent(resolvedProject)}`
      : "";

  const showLoading = !projectsReady || resolvedProject == null || loading;

  return {
    urlProject,
    resolvedProject,
    projects,
    runs,
    showLoading,
    setSelectedProject,
    projectQs,
  };
}
