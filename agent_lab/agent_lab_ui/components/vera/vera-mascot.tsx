"use client";

import type { CSSProperties } from "react";
import { useId } from "react";

export type VeraMascotProps = {
  /** Width in pixels; height scales with viewBox aspect ratio */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Screen-reader label */
  title?: string;
  /** Adds subtle CSS float animation (see `.vera-mascot--float` in globals.css) */
  animate?: boolean;
  /** Show tiny monospace footnote (hidden automatically when size is under 72px) */
  showFootnote?: boolean;
  /** Fill parent width (max width = size). Good for responsive hero columns */
  fluid?: boolean;
};

/**
 * VERA: Versioning guide. Soft isometric companion (warm shell, gentle visor, readable 24px–320px).
 */
export function VeraMascot({
  size = 200,
  className = "",
  style,
  title = "VERA, the versioning agent",
  animate = false,
  showFootnote,
  fluid = false,
}: VeraMascotProps) {
  const uid = useId().replace(/:/g, "");
  const h = (size * 240) / 200;
  const foot = showFootnote ?? size >= 72;

  const metal = `vera-metal-${uid}`;
  const plate = `vera-plate-${uid}`;
  const accent = `vera-accent-${uid}`;
  const cyan = `vera-cyan-${uid}`;
  const visorGlass = `vera-visor-glass-${uid}`;
  const rightShade = `vera-right-${uid}`;
  const glow = `vera-glow-${uid}`;
  const soft = `vera-soft-${uid}`;

  const svgStyle: CSSProperties = fluid
    ? { width: "100%", height: "auto", aspectRatio: "200 / 240", maxWidth: size, ...style }
    : { ...style };

  return (
    <svg
      role="img"
      aria-label={title}
      width={fluid ? undefined : size}
      height={fluid ? undefined : h}
      viewBox="0 0 200 240"
      preserveAspectRatio="xMidYMid meet"
      className={`shrink-0 select-none ${animate ? "vera-mascot--float" : ""} ${className}`.trim()}
      style={svgStyle}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={metal} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5b5478" />
          <stop offset="45%" stopColor="#3d3758" />
          <stop offset="100%" stopColor="#252038" />
        </linearGradient>
        <linearGradient id={plate} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6d6494" />
          <stop offset="55%" stopColor="#45405c" />
          <stop offset="100%" stopColor="#2a2638" />
        </linearGradient>
        <linearGradient id={rightShade} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3a3450" />
          <stop offset="100%" stopColor="#221e32" />
        </linearGradient>
        <linearGradient id={accent} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id={cyan} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <radialGradient id={visorGlass} cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="rgba(204,251,241,0.5)" />
          <stop offset="50%" stopColor="rgba(94,234,212,0.22)" />
          <stop offset="100%" stopColor="rgba(30,27,46,0.92)" />
        </radialGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={soft} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>

      {/* Ground + contact shadow */}
      <ellipse cx="100" cy="218" rx="56" ry="11" fill="rgba(30,27,46,0.35)" filter={`url(#${soft})`} />
      <ellipse cx="100" cy="216" rx="40" ry="6" fill="rgba(167,139,250,0.12)" />

      {/* Legs: back / depth */}
      <path
        d="M80 172 L80 198 L90 203 L92 176 Z"
        fill={`url(#${rightShade})`}
        stroke="#2a2440"
        strokeWidth="0.6"
      />
      <path
        d="M120 172 L120 198 L110 203 L108 176 Z"
        fill={`url(#${rightShade})`}
        stroke="#2a2440"
        strokeWidth="0.6"
      />

      {/* Legs: front faces */}
      <path
        d="M78 170 L78 200 L88 205 L88 175 Z"
        fill={`url(#${metal})`}
        stroke="#3d3558"
        strokeWidth="0.75"
      />
      <path
        d="M122 170 L122 200 L112 205 L112 175 Z"
        fill={`url(#${metal})`}
        stroke="#3d3558"
        strokeWidth="0.75"
      />
      <path d="M85 200 L95 208 L105 208 L115 200" fill="none" stroke="#22d3ee" strokeOpacity="0.28" strokeWidth="1" />

      {/* Torso: right extruded face (depth) */}
      <path
        d="M135 95 L145 105 L145 165 L135 165 Z"
        fill={`url(#${rightShade})`}
        stroke="#3d3558"
        strokeWidth="0.7"
      />
      {/* Torso: top plane */}
      <path
        d="M65 95 L135 95 L145 105 L55 105 Z"
        fill="#3d3460"
        stroke="#5b5378"
        strokeWidth="0.6"
        opacity="0.95"
      />
      {/* Torso: front */}
      <path
        d="M65 95 L135 95 L135 165 L55 165 L55 105 Z"
        fill={`url(#${plate})`}
        stroke="#4c4670"
        strokeWidth="1"
      />
      {/* Front bevel light */}
      <path
        d="M58 108 L58 162 L62 160 L62 110 Z"
        fill="rgba(167,139,250,0.12)"
      />

      {/* Chest port (inset) */}
      <rect x="82" y="118" width="36" height="28" rx="6" fill="#1a1628" stroke="#5b5480" strokeWidth="0.75" />
      <rect
        x="84"
        y="120"
        width="32"
        height="4"
        rx="1"
        fill={`url(#${accent})`}
        opacity="0.95"
        filter={`url(#${glow})`}
      />
      <rect x="88" y="128" width="24" height="5" rx="1" fill="#1a1530" stroke="#3d3558" strokeWidth="0.5" />
      <circle cx="100" cy="138" r="3.2" fill="#34d399" filter={`url(#${glow})`} />

      {/* Arms: depth */}
      <path d="M145 112 L158 120 L160 142 L152 144 Z" fill="#14101f" stroke="#2a2440" strokeWidth="0.5" />
      <path d="M55 112 L42 120 L40 142 L48 144 Z" fill="#14101f" stroke="#2a2440" strokeWidth="0.5" />

      {/* Arms: front */}
      <path
        d="M55 110 L38 118 L35 145 L45 148 L52 120 Z"
        fill={`url(#${metal})`}
        stroke="#3d3860"
        strokeWidth="0.8"
      />
      <path
        d="M145 110 L162 118 L165 145 L155 148 L148 120 Z"
        fill={`url(#${metal})`}
        stroke="#3d3860"
        strokeWidth="0.8"
      />
      <circle cx="38" cy="132" r="5.5" fill="#12101a" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="0.9" />
      <circle cx="162" cy="132" r="5.5" fill="#12101a" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="0.9" />

      {/* Neck cylinder */}
      <ellipse cx="100" cy="90" rx="13" ry="4" fill="#2d2648" stroke="#4c4670" strokeWidth="0.6" />
      <rect x="87" y="90" width="26" height="10" rx="2" fill="#252040" stroke="#4c4670" strokeWidth="0.6" />

      {/* Head: top */}
      <path
        d="M72 55 L128 55 L138 65 L62 65 Z"
        fill="#45406a"
        stroke="#6b6394"
        strokeWidth="0.7"
      />
      {/* Head: right face */}
      <path
        d="M128 55 L138 65 L138 88 L128 88 Z"
        fill={`url(#${rightShade})`}
        stroke="#4c4670"
        strokeWidth="0.7"
      />
      {/* Head: front */}
      <path
        d="M72 55 L128 55 L128 88 L72 88 Z"
        fill={`url(#${plate})`}
        stroke="#5b5378"
        strokeWidth="1"
      />
      {/* Head highlight */}
      <path d="M76 58 L108 58 L118 64 L78 64 Z" fill="rgba(255,255,255,0.06)" />

      {/* Visor housing */}
      <path
        d="M74 62 H126 L130 72 L126 80 H74 L70 72 Z"
        fill={`url(#${visorGlass})`}
        stroke={`url(#${cyan})`}
        strokeWidth="1.3"
        filter={`url(#${glow})`}
      />
      <ellipse cx="92" cy="71" rx="10" ry="4.5" fill="rgba(153,246,228,0.28)" filter={`url(#${glow})`} />
      <ellipse cx="114" cy="71" rx="8" ry="3.5" fill="rgba(34,211,238,0.14)" />
      <path
        d="M92 74 Q100 78 108 74"
        fill="none"
        stroke="rgba(167,139,250,0.45)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Soft halo nub on crown (no tall spike) */}
      <circle cx="100" cy="46" r="8" fill="#ddd6fe" stroke="#a78bfa" strokeOpacity="0.45" strokeWidth="0.7" />
      <circle cx="100" cy="46" r="4.5" fill={`url(#${accent})`} opacity="0.88" filter={`url(#${glow})`} />
      <circle cx="98.5" cy="44.5" r="1.1" fill="rgba(255,255,255,0.55)" />

      {/* Shoulder pylons */}
      <rect x="48" y="98" width="14" height="18" rx="3" fill="#2a2540" stroke="#4c4670" strokeWidth="0.6" />
      <rect x="138" y="98" width="14" height="18" rx="3" fill="#2a2540" stroke="#4c4670" strokeWidth="0.6" />
      <path d="M48 98 L52 96 L52 114 L48 116 Z" fill="rgba(255,255,255,0.04)" />

      {foot && (
        <text
          x="100"
          y="158"
          textAnchor="middle"
          fill="#7c7494"
          fontSize="7"
          fontFamily="var(--font-mono, ui-monospace, monospace)"
          letterSpacing="0.08em"
        >
          v_tag · sha
        </text>
      )}
    </svg>
  );
}
