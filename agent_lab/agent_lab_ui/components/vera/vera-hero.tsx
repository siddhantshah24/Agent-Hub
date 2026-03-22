"use client";

import dynamic from "next/dynamic";

/** Genkub greeting bot (Spline). White-forward, soft presentation; name VERA in caption. */
const VERA_SPLINE_SCENE = "https://prod.spline.design/o0gDyEcaiU1Fit9i/scene.splinecode";

const Spline = dynamic(() => import("@splinetool/react-spline").then(m => m.default), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[min(45vh,380px)] w-full flex-1 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] md:min-h-0"
      aria-busy="true"
      aria-label="Loading VERA"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-rose-200/25 border-t-fuchsia-300/80"
        aria-hidden
      />
    </div>
  ),
});

/** Spline Genkub-style greeting bot: light, feminine-adjacent chrome, labeled VERA. */
export function VeraHero() {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(253,242,248,0.18),rgba(196,181,253,0.12),transparent_60%)]" />

      <div className="relative flex min-h-0 w-full flex-1 flex-col items-stretch justify-center">
        <div
          className="relative min-h-[min(45vh,380px)] w-full flex-1 overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-rose-50/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] md:min-h-0"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(244,114,182,0.08), 0 18px 50px rgba(15,10,25,0.35)",
          }}
        >
          {/* Lighten scene toward white; soft rose undertone reads a little feminine without recoloring the GLB */}
          <div
            className="absolute inset-0 h-full w-full min-h-[200px] [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:object-contain"
            style={{
              filter: "brightness(1.12) saturate(0.82) contrast(1.02)",
            }}
          >
            <Spline
              scene={VERA_SPLINE_SCENE}
              className="h-full w-full min-h-[min(45vh,380px)]"
              role="img"
              aria-label="VERA, your versioning guide"
            />
          </div>
        </div>
      </div>

      <div className="relative z-[1] mt-4 w-full shrink-0 px-2 text-center md:mt-5">
        <p className="text-sm tracking-tight sm:text-base">
          <span className="font-bold text-white">VERA</span>{" "}
          <span className="font-medium text-rose-100/90">Your friendly versioning guide</span>
        </p>
      </div>
    </div>
  );
}
