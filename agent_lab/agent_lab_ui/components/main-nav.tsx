"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GitCompare, History, LayoutDashboard } from "lucide-react";

export function MainNav({ docsPeach = false }: { docsPeach?: boolean }) {
  const pathname = usePathname();
  const onDocs = pathname === "/docs" || pathname.startsWith("/docs/");
  const onDashboard = pathname === "/dashboard";
  const onVersionHistory = pathname === "/version-history";
  const onDiffViewer = pathname === "/diff-viewer" || pathname === "/diff";

  const linkBase =
    "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors sm:px-3 sm:text-sm";
  const linkPeach =
    `${linkBase} text-stone-600 hover:bg-stone-900/[0.06] hover:text-stone-900`;
  const linkDark = `${linkBase} nav-link`;

  return (
    <nav className="ml-auto flex min-w-0 max-w-full flex-1 flex-wrap items-center justify-end gap-0.5 sm:gap-1 md:flex-none">
      {!onDashboard && (
        <Link href="/dashboard" className={docsPeach ? linkPeach : linkDark}>
          <LayoutDashboard size={13} /> Dashboard
        </Link>
      )}
      {!onVersionHistory && (
        <Link href="/version-history" className={docsPeach ? linkPeach : linkDark}>
          <History size={13} /> Version History
        </Link>
      )}
      {!onDiffViewer && (
        <Link href="/diff-viewer" className={docsPeach ? linkPeach : linkDark}>
          <GitCompare size={13} /> Diff Viewer
        </Link>
      )}
      {!onDocs && (
        <Link href="/docs" className={docsPeach ? linkPeach : linkDark}>
          <BookOpen size={13} /> Documentation
        </Link>
      )}
    </nav>
  );
}
