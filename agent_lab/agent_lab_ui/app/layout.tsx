import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Github } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { VeraMascot } from "@/components/vera";
import "./globals.css";

// Inter — best-in-class readability for UI text
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// JetBrains Mono — crisp monospace for code, prompts, tool calls
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AgentLab",
  description: "Golden evals, versioning, and observability for LangGraph-style agents. VERA is your versioning guide across runs and diffs.",
};

/** Solid dark purple canvas (no grid overlay) */
const BG   = "#1a1628";
const SURF = "#231F3A";
const BDR  = "#3D3860";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} flex min-h-screen flex-col overflow-x-hidden antialiased`}
        style={{ backgroundColor: BG, color: "#EDE9F8", fontFamily: "var(--font-inter), sans-serif" }}
      >
        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{ borderColor: BDR, backgroundColor: `${SURF}CC` }}
        >
          <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:gap-5 sm:px-6 sm:py-0">

            <a href="/" className="flex min-w-0 items-center gap-2.5 shrink-0 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden transition-all"
                style={{
                  background: "linear-gradient(145deg, rgba(124,58,237,0.35), #1a1628)",
                  boxShadow: "0 0 0 1px rgba(167,139,250,0.25), 0 8px 24px rgba(0,0,0,0.35)",
                }}
              >
                <VeraMascot size={34} showFootnote={false} title="AgentLab: home" />
              </div>
              <span className="font-semibold text-base tracking-tight" style={{ color: "#EDE9F8" }}>
                AgentLab
              </span>
            </a>

            <span
              className="text-[11px] px-2 py-0.5 rounded-full border"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#A78BFA",
                borderColor: "rgba(167,139,250,0.30)",
                background: "rgba(167,139,250,0.08)",
              }}
            >
              v1.0
            </span>

            <MainNav />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>

        <footer
          className="relative z-10 mt-auto border-t"
          style={{ borderColor: BDR, backgroundColor: `${SURF}99` }}
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 sm:py-5">
            <p className="text-center text-xs sm:text-left" style={{ color: "#A59BC8" }}>
              © {new Date().getFullYear()} team SSH.exe
            </p>
            <a
              href="https://github.com/siddhantshah24/Agent-Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link inline-flex items-center gap-2 text-xs font-medium sm:text-sm"
            >
              <Github size={15} className="shrink-0 opacity-90" aria-hidden />
              GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
