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

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/75 px-5 py-4 shadow-[0_12px_38px_rgba(38,50,74,0.06)] backdrop-blur-xl">
      <div className={`absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#dcecff]/70 to-transparent blur-2xl transition-transform duration-1000 ${pulse ? "scale-x-125" : "scale-x-75"}`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/35"><Radio className="h-3 w-3" /> DR1FT-Signal</span>
          <span className="font-mono text-[9px] text-ink/25">LIVE</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ArrowLeft className={`h-4 w-4 transition ${mobbing ? "text-[#d66f6f]" : "text-ink/25"}`} />
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gradient-to-r from-[#f2d8dc] via-[#e6e8f4] to-[#dbe9f8]">
            <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#789bd0] shadow-[0_2px_10px_rgba(38,50,74,0.18)] transition-all duration-700 ${mobbing ? "left-[12%]" : influencer ? "left-[88%]" : "left-1/2"}`} />
          </div>
          <ArrowRight className={`h-4 w-4 transition ${influencer ? "text-[#948acb]" : "text-ink/25"}`} />
        </div>
        <div className="mt-2 flex justify-between text-[9px] font-medium text-ink/35">
          <span>Social Mobbing</span><span className="text-ink/25">Balance</span><span>Influencer Game</span>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-ink/55">Dein Feed reagiert auf Entscheidungen. Der Drift ist keine Punktzahl — er verändert, welche Welt dir begegnet.</p>
      </div>
    </div>
  );
}
