import React from "react";

export const CLASS_VISUALS = [
  { id: "aurora", name: "Aurora", gradient: "from-indigo-950 via-violet-700 to-cyan-500", accent: "bg-cyan-200" },
  { id: "nebula", name: "Nebula", gradient: "from-slate-950 via-fuchsia-800 to-violet-500", accent: "bg-fuchsia-200" },
  { id: "ocean", name: "Ocean", gradient: "from-slate-950 via-blue-800 to-teal-400", accent: "bg-teal-200" },
  { id: "sunrise", name: "Sunrise", gradient: "from-rose-700 via-orange-500 to-amber-200", accent: "bg-amber-100" },
  { id: "forest", name: "Forest", gradient: "from-emerald-950 via-green-700 to-lime-400", accent: "bg-lime-200" },
  { id: "cosmos", name: "Cosmos", gradient: "from-slate-950 via-sky-900 to-indigo-500", accent: "bg-sky-200" },
  { id: "spectrum", name: "Spectrum", gradient: "from-violet-700 via-pink-500 to-orange-400", accent: "bg-white" },
  { id: "glacier", name: "Glacier", gradient: "from-slate-700 via-cyan-600 to-sky-200", accent: "bg-white" },
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
    <div aria-hidden="true" className={`relative isolate overflow-hidden bg-gradient-to-br ${visual.gradient} ${className}`}>
      <div className="absolute -right-[12%] -top-[55%] h-[150%] aspect-square rounded-full border border-white/20" />
      <div className="absolute -right-[2%] -top-[38%] h-[115%] aspect-square rounded-full border-[18px] border-white/10" />
      <div className="absolute -bottom-[70%] left-[12%] h-[150%] aspect-square rounded-full bg-white/10 blur-2xl" />
      <div className={`absolute bottom-[18%] left-[12%] h-3 w-3 rounded-full ${visual.accent} shadow-[0_0_28px_rgba(255,255,255,.8)]`} />
      <div className="absolute bottom-[12%] left-[22%] h-px w-[42%] rotate-[-18deg] bg-white/40" />
      <div className="absolute right-[20%] top-[22%] h-2 w-2 rounded-full bg-white/80" />
    </div>
  );
}
