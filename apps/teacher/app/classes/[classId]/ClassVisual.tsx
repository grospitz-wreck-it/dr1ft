import React from "react";

export const CLASS_VISUALS = [
  { id: "aurora", name: "Aurora", background: "linear-gradient(125deg,#171044 0%,#6336a5 52%,#20c6c8 100%)" },
  { id: "nebula", name: "Nebula", background: "linear-gradient(125deg,#090d20 0%,#861b78 55%,#7656db 100%)" },
  { id: "ocean", name: "Ocean", background: "linear-gradient(125deg,#071a35 0%,#1456a0 55%,#20b6a5 100%)" },
  { id: "sunrise", name: "Sunrise", background: "linear-gradient(125deg,#9d285b 0%,#ed713c 55%,#f6cf77 100%)" },
  { id: "forest", name: "Forest", background: "linear-gradient(125deg,#073b35 0%,#17804d 55%,#b3c94c 100%)" },
  { id: "cosmos", name: "Cosmos", background: "linear-gradient(125deg,#090d20 0%,#123b70 55%,#6555ce 100%)" },
  { id: "spectrum", name: "Spectrum", background: "linear-gradient(125deg,#6334a8 0%,#dc4e91 55%,#f39a45 100%)" },
  { id: "glacier", name: "Glacier", background: "linear-gradient(125deg,#33445f 0%,#168fa9 55%,#b3e9ed 100%)" },
] as const;

export type ClassVisualId = typeof CLASS_VISUALS[number]["id"];

export function getFallbackClassVisualId(seed: string): ClassVisualId {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CLASS_VISUALS[hash % CLASS_VISUALS.length].id;
}

export function ClassVisual({ visualId, className = "" }: { visualId?: string | null; className?: string }) {
  const visual = CLASS_VISUALS.find((item) => item.id === visualId) ?? CLASS_VISUALS[0];
  return (
    <div aria-hidden="true" className={`relative isolate overflow-hidden ${className}`} style={{ background: visual.background }}>
      <div className="absolute -right-[12%] -top-[55%] h-[150%] aspect-square rounded-full border border-white/25" />
      <div className="absolute -right-[2%] -top-[38%] h-[115%] aspect-square rounded-full border-[18px] border-white/15" />
      <div className="absolute -bottom-[70%] left-[12%] h-[150%] aspect-square rounded-full bg-white/15 blur-2xl" />
      <div className="absolute bottom-[18%] left-[12%] h-3 w-3 rounded-full bg-white shadow-[0_0_28px_rgba(255,255,255,.8)]" />
      <div className="absolute bottom-[12%] left-[22%] h-px w-[42%] rotate-[-18deg] bg-white/50" />
      <div className="absolute right-[20%] top-[22%] h-2 w-2 rounded-full bg-white/90" />
    </div>
  );
}
