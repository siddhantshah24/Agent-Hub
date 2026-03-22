"use client";

import { Application } from "@splinetool/runtime";
import { useEffect, useRef } from "react";

type Props = {
  scene: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Loads a Spline scene with renderMode "manual" and drives requestRender via rAF.
 * Avoids some runtime tick/timeline issues seen with the default react-spline
 * continuous loop against certain exported scenes.
 *
 * "Missing property" can come from broken timeline audio/state data in the published
 * scene. `scripts/patch-spline-runtime.mjs` (postinstall) patches the runtime: missing
 * audio warns instead of throwing; swallowed timeline errors no longer call `console.error`.
 */
export function VeraSplineCanvas({ scene, className, "aria-label": ariaLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    const app = new Application(canvas, {
      renderMode: "manual",
    });
    appRef.current = app;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) app.setSize(width, height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let cancelled = false;

    const loop = () => {
      if (cancelled) return;
      app.requestRender();
      rafRef.current = requestAnimationFrame(loop);
    };

    app.load(scene)
      .then(() => {
        if (!cancelled) rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => {
        /* load errors surface via Spline; keep canvas empty */
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      try {
        app.dispose();
      } catch {
        /* ignore */
      }
      appRef.current = null;
      canvas.remove();
    };
  }, [scene]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
