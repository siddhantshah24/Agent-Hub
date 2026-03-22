"use client";

import dynamic from "next/dynamic";

/** Genkub greeting bot (Spline). White-forward, soft presentation; name VERA in caption. */
const VERA_SPLINE_SCENE = "https://prod.spline.design/o0gDyEcaiU1Fit9i/scene.splinecode";

const Spline = dynamic(() => import("@splinetool/react-spline").then(m => m.default), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[min(50vh,420px)] w-full flex-1 items-center justify-center md:min-h-0"
      aria-busy="true"
      aria-label="Loading VERA"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400"
        aria-hidden
      />
    </div>
  ),
});

/** Spline VERA bot — vertically centred, no card wrapper, seamless background. */
export function VeraHero() {
  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Purple radial glow behind the robot */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 65% 55% at 50% 46%, rgba(124,58,237,0.20) 0%, transparent 68%)" }}
        aria-hidden
      />

      {/* Spline fills available height; flex-1 pushes caption to bottom */}
      <div className="relative flex-1 [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:object-contain">
        <Spline
          scene={VERA_SPLINE_SCENE}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="VERA, your versioning guide"
        />
      </div>

      {/* Caption pinned just above the fold bottom */}
      <div className="relative z-[1] shrink-0 py-5 text-center">
        <p className="text-sm tracking-tight sm:text-base">
          <span className="font-bold text-white">VERA</span>{" "}
          <span className="font-medium" style={{ color: "#a78bfa" }}>Your friendly versioning guide</span>
        </p>
      </div>
    </div>
  );
}
