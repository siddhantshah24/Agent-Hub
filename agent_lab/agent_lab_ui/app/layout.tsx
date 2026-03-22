import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AgentLab",
  description:
    "Golden evals, versioning, and observability for LangGraph-style agents. VERA is your versioning guide across runs and diffs.",
};

const BG = "#1a1628";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: BG }}>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} flex min-h-screen flex-col overflow-x-hidden antialiased`}
        style={{
          backgroundColor: BG,
          color: "#EDE9F8",
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <AppShell>
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-slate-500 text-sm">
                Loading…
              </div>
            }
          >
            {children}
          </Suspense>
        </AppShell>
      </body>
    </html>
  );
}
