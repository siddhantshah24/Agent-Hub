"use client";

import { VeraSplineCanvas } from "@/components/vera/vera-spline-canvas";

/** Genkub greeting bot (Spline). White-forward, soft presentation; name VERA in caption. */
const VERA_SPLINE_SCENE = "https://prod.spline.design/o0gDyEcaiU1Fit9i/scene.splinecode";

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
        <VeraSplineCanvas
          scene={VERA_SPLINE_SCENE}
          className="absolute inset-0 h-full w-full"
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
