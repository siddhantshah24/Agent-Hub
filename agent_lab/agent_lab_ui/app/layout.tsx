import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Cpu, ExternalLink, GitBranch } from "lucide-react";
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
  title: "Agent Lab",
  description: "Local MLOps platform for LangGraph agents",
};

const BG   = "#1C1830";
const SURF = "#231F3A";
const BDR  = "#3D3860";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}
        style={{ backgroundColor: BG, color: "#EDE9F8", fontFamily: "var(--font-inter), sans-serif" }}
      >
        {/* Subtle grid */}
        <div className="fixed inset-0 bg-grid pointer-events-none" aria-hidden />

        {/* Top purple bloom */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% -5%, rgba(167,139,250,0.14) 0%, transparent 75%)" }}
          aria-hidden
        />

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{ borderColor: BDR, backgroundColor: `${SURF}CC` }}
        >
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-5">

            <a href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
                  boxShadow: "0 0 14px rgba(167,139,250,0.30)",
                }}
              >
                <Cpu size={14} className="text-white" />
              </div>
              <span className="font-semibold text-base tracking-tight" style={{ color: "#EDE9F8" }}>
                Agent Lab
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
              v0.1.0
            </span>

            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs" style={{ color: "#9B97BB" }}>local</span>
            </div>

            <nav className="ml-auto flex items-center gap-1">
              <a href="/"
                className="nav-link flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors">
                <GitBranch size={13} /> Overview
              </a>
              <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer"
                className="nav-link flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors">
                <ExternalLink size={13} /> Langfuse
              </a>
            </nav>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
