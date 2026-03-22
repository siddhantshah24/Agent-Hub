"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GitCompare, History, LayoutDashboard } from "lucide-react";

export function MainNav() {
  const pathname = usePathname();
  const onDocs = pathname === "/docs";
  const onDashboard = pathname === "/dashboard";
  const onVersionHistory = pathname === "/version-history";
  const onDiffViewer = pathname === "/diff-viewer" || pathname === "/diff";

  return (
    <nav className="ml-auto flex min-w-0 max-w-full flex-1 flex-wrap items-center justify-end gap-0.5 sm:gap-1 md:flex-none">
      {!onDashboard && (
        <Link
          href="/dashboard"
          className="nav-link flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors sm:px-3 sm:text-sm"
        >
          <LayoutDashboard size={13} /> Dashboard
        </Link>
      )}
      {!onVersionHistory && (
        <Link
          href="/version-history"
          className="nav-link flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors sm:px-3 sm:text-sm"
        >
          <History size={13} /> Version History
        </Link>
      )}
      {!onDiffViewer && (
        <Link
          href="/diff-viewer"
          className="nav-link flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors sm:px-3 sm:text-sm"
        >
          <GitCompare size={13} /> Diff Viewer
        </Link>
      )}
      {!onDocs && (
        <Link
          href="/docs"
          className="nav-link flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors sm:px-3 sm:text-sm"
        >
          <BookOpen size={13} /> Documentation
        </Link>
      )}
    </nav>
  );
}
