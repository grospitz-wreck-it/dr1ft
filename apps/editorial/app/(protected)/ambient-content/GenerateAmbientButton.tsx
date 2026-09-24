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
            <span>Gemini erstellt gerade die Feed-Inhalte.</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Anschließend werden passende Visuals erzeugt und alles als DRAFT gespeichert.</span>
          </div>
          <p className="text-[10px] text-slate-600">Je nach Anzahl und Bildanteil kann das etwas dauern. Bitte dieses Fenster geöffnet lassen.</p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 text-center">Alle Ergebnisse werden als DRAFT gespeichert. Nichts wird automatisch veröffentlicht.</p>
      )}
    </div>
  );
}
