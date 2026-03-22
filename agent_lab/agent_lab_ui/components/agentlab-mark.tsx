/**
 * AgentLab app mark — same artwork as `app/icon.svg` (versions + eval bars).
 * Shown in the header; the favicon only appears in the browser tab.
 */
export function AgentLabMark({
  className = "",
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  const gid = "al-mark";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`${gid}-bg`}
          x1="2"
          y1="2"
          x2="30"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5b21b6" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gid}-bg)`} />
      <rect x="5" y="21" width="11" height="4" rx="1" fill="rgba(255,255,255,0.28)" />
      <rect x="7" y="15" width="11" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
      <rect x="9" y="9" width="11" height="4" rx="1" fill="#fff" />
      <rect x="21" y="20" width="2" height="5" rx="0.5" fill="#fff" opacity="0.45" />
      <rect x="24" y="16" width="2" height="9" rx="0.5" fill="#fff" opacity="0.72" />
      <rect x="27" y="11" width="2" height="14" rx="0.5" fill="#fff" />
    </svg>
  );
}
