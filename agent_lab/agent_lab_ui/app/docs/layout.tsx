import type { ReactNode } from "react";

/** Full-bleed white surface so the doc reads as a standalone published page against the app chrome. */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white text-slate-800 shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]">
      {children}
    </div>
  );
}
