"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crop, ImagePlus, Sparkles, Wand2 } from "lucide-react";
import { regenerateLearningImage } from "../learning-content-actions";

const PRESETS = [
  { id: "enhance", label: "Verbessern", icon: Sparkles, prompt: "Improve the image quality, lighting and overall visual clarity while preserving the depicted situation and composition." },
  { id: "reframe", label: "Ausschnitt", icon: Crop, prompt: "Create a stronger, more balanced social-media composition with a natural, well-framed subject." },
  { id: "detail", label: "Details", icon: ImagePlus, prompt: "Preserve the scene and improve natural detail, focus and visual clarity." },
] as const;

export function ImageEditPopover({ contentItemId, scenarioId }: { contentItemId: string; scenarioId: string }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState("");
  const [feedback, setFeedback] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const selectedPrompt = PRESETS.find((item) => item.id === preset)?.prompt ?? "";
  const combinedFeedback = [selectedPrompt, feedback.trim()].filter(Boolean).join(" ");

  return (
    <div ref={ref} className="absolute right-3 top-3 z-20">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex items-center gap-2 rounded-xl bg-slate-950/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:bg-violet-600">
        <Wand2 className="h-4 w-4" /><span className="hidden sm:inline">Bild bearbeiten</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(23rem,calc(100vw-3rem))] rounded-2xl border border-violet-100 bg-white p-3 shadow-2xl">
          <div className="mb-1 text-xs font-bold text-slate-900">Bild aktualisieren</div>
          <p className="mb-3 text-[11px] leading-4 text-slate-500">Schnelle Anpassung wählen oder einen eigenen Wunsch ergänzen.</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {PRESETS.map((item) => {
              const Icon = item.icon; const active = preset === item.id;
              return <button key={item.id} type="button" onClick={() => setPreset(active ? "" : item.id)} className={"flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-semibold transition " + (active ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50/50")}>
                <span className={"grid h-6 w-6 place-items-center rounded-lg " + (active ? "bg-violet-600 text-white" : "bg-slate-100")}><Icon className="h-3.5 w-3.5" /></span>{item.label}
              </button>;
            })}
          </div>
          <form action={async (formData) => { formData.set("feedback", combinedFeedback); await regenerateLearningImage(contentItemId, scenarioId, formData); setOpen(false); }} className="space-y-2">
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Eigener Wunsch (optional)" rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-violet-700"><Check className="h-4 w-4" />{preset || feedback.trim() ? "Bild aktualisieren" : "Bild neu generieren"}</button>
          </form>
        </div>
      )}
    </div>
  );
}