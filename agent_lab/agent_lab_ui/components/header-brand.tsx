"use client";

import { usePathname } from "next/navigation";

/** Hides the VERA suffix on the documentation route only. */
export function HeaderVeraSuffix() {
  const pathname = usePathname();
  if (pathname === "/docs" || pathname?.startsWith("/docs/")) return null;
  return (
    <span className="hidden text-[11px] font-medium sm:inline" style={{ color: "#8B87A8" }}>
      {" "}
      · VERA
    </span>
  );
}
