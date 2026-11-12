"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

export function GenerateAmbientButton() {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full rounded-xl bg-white text-slate-900 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70 px-5 py-3 font-semibold text-sm flex items-center justify-center gap-2 transition"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {pending ? "Ambient Feed wird generiert …" : "Ambient Feed generieren"}
      </button>
      {pending ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Ambient-Feed wird aufgebaut …</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full w-1/3 rounded-full bg-white/70 animate-[ambient-progress_1.4s_ease-in-out_infinite]" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <span className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-slate-200">① Texte</span>
            <span className="rounded-lg bg-white/5 px-2 py-1.5 text-center text-slate-400">② Visuals</span>
            <span className="rounded-lg bg-white/5 px-2 py-1.5 text-center text-slate-400">③ Speichern</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>FLUX erzeugt passende Bilder; anschließend werden alle Ergebnisse als DRAFT gespeichert.</span>
          </div>
          <p className="text-[10px] text-slate-600">Je nach Anzahl und Bildanteil kann das etwas dauern. Bitte dieses Fenster geöffnet lassen.</p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 text-center">Alle Ergebnisse werden als DRAFT gespeichert. Nichts wird automatisch veröffentlicht.</p>
      )}
    </div>
  );
}
