"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Radio } from "lucide-react";

export type DriftDirection = "center" | "influencer" | "mobbing";

export function DriftSignal({ direction = "center" }: { direction?: DriftDirection }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setPulse((value) => !value), 2200);
    return () => window.clearInterval(id);
  }, []);

  const influencer = direction === "influencer";
  const mobbing = direction === "mobbing";

  return <div className="relative overflow-hidden rounded-[26px] border border-white/80 bg-gradient-to-br from-[#1d1430] via-[#2e1850] to-[#172d4b] px-5 py-4 text-white shadow-[0_18px_52px_rgba(42,20,75,.18)]">
    <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-fuchsia-500/25 blur-3xl" />
    <div className="absolute -left-12 bottom-[-70px] h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl" />
    <div className="relative">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/55"><Radio className="h-3 w-3 text-cyan-300" /> DR1FT-Signal</span>
        <span className="font-mono text-[9px] text-emerald-300/75">● LIVE</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <ArrowLeft className={`h-4 w-4 transition ${mobbing ? "text-fuchsia-300" : "text-white/25"}`} />
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-400/35 via-white/15 to-cyan-300/35">
          <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white/90 bg-gradient-to-br from-fuchsia-400 to-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.65)] transition-all duration-700 ${mobbing ? "left-[10%]" : influencer ? "left-[88%]" : "left-1/2"} ${pulse ? "scale-125" : "scale-100"}`} />
        </div>
        <ArrowRight className={`h-4 w-4 transition ${influencer ? "text-cyan-300" : "text-white/25"}`} />
      </div>
      <div className="mt-2 flex justify-between text-[9px] font-semibold text-white/45"><span>Social Mobbing</span><span className="text-white/25">Balance</span><span>Influencer Game</span></div>
      <p className="mt-3 text-[11px] leading-4 text-white/55">Dein Feed reagiert auf Entscheidungen. Der Drift ist keine Punktzahl — er verändert, welche Welt dir begegnet.</p>
    </div>
  </div>;
}
