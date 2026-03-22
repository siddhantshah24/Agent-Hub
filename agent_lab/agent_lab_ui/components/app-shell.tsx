"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Github } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { VeraMascot } from "@/components/vera";

/** Aligned with docs page peach theme */
const PEACH = {
  page: "#faf6f1",
  pageTop: "#fffbf7",
  headerBg: "rgba(255, 251, 247, 0.88)",
  border: "#e8ddd4",
  text: "#44403c",
  textMuted: "#78716c",
} as const;

const DARK = {
  page: "#1a1628",
  surf: "#231F3A",
  bdr: "#3D3860",
  text: "#EDE9F8",
} as const;

function isDocsPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/docs" || pathname.startsWith("/docs/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const docs = isDocsPath(pathname);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const bg = docs ? PEACH.page : DARK.page;
    html.style.backgroundColor = bg;
    body.style.backgroundColor = bg;
    body.style.color = docs ? PEACH.text : DARK.text;

    // overflow-x:hidden on html/body breaks position:sticky for the docs TOC
    if (docs) {
      html.style.overflowX = "visible";
      body.style.overflowX = "visible";
    } else {
      html.style.overflowX = "";
      body.style.overflowX = "";
    }

    html.classList.toggle("docs-peach-theme", docs);
    return () => {
      html.classList.remove("docs-peach-theme");
      html.style.overflowX = "";
      body.style.overflowX = "";
    };
  }, [docs]);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={
          docs
            ? {
                borderColor: PEACH.border,
                backgroundColor: PEACH.headerBg,
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
              }
            : {
                borderColor: DARK.bdr,
                backgroundColor: `${DARK.surf}CC`,
              }
        }
      >
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:gap-5 sm:px-6 sm:py-0">
          <a href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl transition-all"
              style={
                docs
                  ? {
                      background:
                        "linear-gradient(145deg, rgba(167,139,250,0.22), rgba(250,246,241,0.9))",
                      boxShadow:
                        "0 0 0 1px rgba(167,139,250,0.28), 0 6px 18px rgba(28,25,23,0.08)",
                    }
                  : {
                      background: "linear-gradient(145deg, rgba(124,58,237,0.35), #1a1628)",
                      boxShadow:
                        "0 0 0 1px rgba(167,139,250,0.25), 0 8px 24px rgba(0,0,0,0.35)",
                    }
              }
            >
              <VeraMascot size={34} showFootnote={false} title="AgentLab: home" />
            </div>
            <span
              className="text-base font-semibold tracking-tight"
              style={{ color: docs ? "#292524" : DARK.text }}
            >
              AgentLab
            </span>
          </a>

          <span
            className="rounded-full border px-2 py-0.5 text-[11px]"
            style={{
              fontFamily: "var(--font-mono)",
              color: docs ? "#6d28d9" : "#A78BFA",
              borderColor: docs ? "rgba(109,40,217,0.25)" : "rgba(167,139,250,0.30)",
              background: docs ? "rgba(109,40,217,0.06)" : "rgba(167,139,250,0.08)",
            }}
          >
            v1.0
          </span>

          <MainNav docsPeach={docs} />
        </div>
      </header>

      <main
        className={
          docs
            ? "relative z-10 mx-auto min-w-0 w-full max-w-7xl flex-1 overflow-x-visible px-6 py-8"
            : "relative z-10 mx-auto min-w-0 w-full max-w-7xl flex-1 overflow-x-hidden px-6 py-8"
        }
      >
        {children}
      </main>

      <footer
        className="relative z-10 mt-auto border-t"
        style={
          docs
            ? {
                borderColor: PEACH.border,
                backgroundColor: PEACH.pageTop,
              }
            : {
                borderColor: DARK.bdr,
                backgroundColor: `${DARK.surf}99`,
              }
        }
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 sm:py-5">
          <p
            className="text-center text-xs sm:text-left"
            style={{ color: docs ? PEACH.textMuted : "#A59BC8" }}
          >
            © {new Date().getFullYear()} team SSH.exe
          </p>
          <a
            href="https://github.com/siddhantshah24/Agent-Hub"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-xs font-medium sm:text-sm ${
              docs
                ? "text-stone-600 transition-colors hover:text-stone-900"
                : "nav-link"
            }`}
          >
            <Github size={15} className="shrink-0 opacity-90" aria-hidden />
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
