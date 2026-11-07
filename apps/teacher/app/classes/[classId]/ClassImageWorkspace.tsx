"use client";

import { useState } from "react";
import { CalendarDays, GraduationCap, Pencil, X, Palette, Check, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { setClassVisual, regenerateClassInstanceAccessCode } from "../actions";
import { CLASS_VISUALS, ClassVisual, getFallbackClassVisualId } from "./ClassVisual";

type Props = {
  classId: string;
  className: string;
  accessCode: string;
  canRegenerateAccessCode: boolean;
  gradeLevel: number | null;
  schoolYear: string;
  heroImageUrl: string | null;
  heroPositionX: number;
  heroPositionY: number;
  heroZoom: number;
  classVisualId: string | null;
  canEditClassImage: boolean;
};

export default function ClassImageWorkspace({
  classId, className, accessCode, canRegenerateAccessCode, gradeLevel, schoolYear, heroImageUrl,
  heroPositionX, heroPositionY, heroZoom, classVisualId, canEditClassImage,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentAccessCode, setCurrentAccessCode] = useState(accessCode);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingVisual, setSavingVisual] = useState(false);
  const [visualMessage, setVisualMessage] = useState("");
  const router = useRouter();
  const activeVisual = classVisualId ?? getFallbackClassVisualId(classId);

  async function rerollAccessCode() {
    if (!window.confirm("Neuen Klassencode generieren? Der bisherige Code wird sofort ungültig.")) return;
    setRegeneratingCode(true);
    setCodeMessage("");
    try {
      const nextCode = await regenerateClassInstanceAccessCode(classId);
      setCurrentAccessCode(nextCode);
      router.refresh();
    } catch (error) {
      setCodeMessage(error instanceof Error ? error.message : "Klassencode konnte nicht erneuert werden.");
    } finally {
      setRegeneratingCode(false);
    }
  }
  async function chooseVisual(visualId: string) {
    setSavingVisual(true);
    setVisualMessage("");
    try {
      await setClassVisual(classId, visualId || null);
      setEditorOpen(false);
      setPickerOpen(false);
      router.refresh();
    } catch (error) {
      setVisualMessage(error instanceof Error ? error.message : "Motiv konnte nicht gespeichert werden.");
    } finally {
      setSavingVisual(false);
    }
  }

  return (
    <>
      <section className="group relative mt-4 min-h-[270px] overflow-hidden rounded-[2rem] bg-[#090B2C] text-white shadow-[0_24px_70px_-35px_rgba(54,37,150,.75)] sm:min-h-[300px]">
        {classVisualId ? (
          <div className="absolute inset-0"><ClassVisual visualId={classVisualId} className="absolute inset-0 h-full w-full" /></div>
        ) : heroImageUrl ? (
          <img src={heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: String(heroPositionX) + "% " + String(heroPositionY) + "%", transform: "scale(" + heroZoom + ")" }} />
        ) : (
          <ClassVisual visualId={activeVisual} className="absolute inset-0 h-full w-full" />
        )}
        <div className="relative flex min-h-[270px] flex-col justify-between p-6 sm:min-h-[300px] sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/65">DR1FT <span className="text-cyan-300">✦</span> KLASSENRAUM</p>
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-white/25 bg-slate-950/25 px-3 py-2 text-right backdrop-blur-md">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/60">Klassen-Code</p>
                <p className="font-mono text-sm font-bold tracking-[0.16em] text-white">{currentAccessCode}</p>
              </div>
              {canRegenerateAccessCode && (
                <button type="button" onClick={() => void rerollAccessCode()} disabled={regeneratingCode} aria-label="Klassencode neu generieren" title="Klassencode neu generieren" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/35 bg-white/15 text-white shadow-[0_8px_30px_rgba(0,0,0,.18)] backdrop-blur-xl transition hover:border-white/60 hover:bg-white/25 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <RefreshCw className={"h-4 w-4 " + (regeneratingCode ? "animate-spin" : "")} />
                </button>
              )}
              {canEditClassImage && (
                <button type="button" onClick={() => { setEditorOpen(true); setPickerOpen(false); setVisualMessage(""); }} aria-label="Klassenmotiv ändern" title="Klassenmotiv ändern" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/35 bg-white/15 text-white shadow-[0_8px_30px_rgba(0,0,0,.18)] backdrop-blur-xl transition hover:border-white/60 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative max-w-xl">
              <h1 className="relative z-10 text-6xl font-black leading-[.9] tracking-[-0.06em] text-white drop-shadow-[0_5px_20px_rgba(0,0,0,.45)] sm:text-7xl">{className}</h1>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/85 sm:text-sm">
                <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4 text-cyan-200" />Jahrgang {gradeLevel ?? "—"}</span>
                <span className="hidden h-4 w-px bg-white/25 sm:block" />
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-200" />Schuljahr {schoolYear}</span>
              </div>
            </div>
          </div>
        </div>
        {codeMessage && <p role="alert" className="absolute bottom-3 right-6 rounded-lg bg-red-950/70 px-3 py-1.5 text-xs text-white">{codeMessage}</p>}
      </section>

      {editorOpen && canEditClassImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="class-visual-title">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/15 bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Klassenraum gestalten</p><h2 id="class-visual-title" className="mt-1 text-lg font-semibold text-slate-950">Klassenmotiv auswählen</h2><p className="mt-1 text-xs text-slate-500">Hier änderst du ausschließlich das Bildmotiv – nicht die Klassendaten.</p></div>
              <button type="button" onClick={() => setEditorOpen(false)} aria-label="Schließen" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-semibold text-slate-900">Schulmotiv oder DR1FT-Visual</h3><p className="mt-0.5 text-xs text-slate-500">Wähle das hinterlegte Schulbild oder eines der gestalteten Motive.</p></div>
                <button type="button" disabled={savingVisual} onClick={() => void chooseVisual("")} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Schulbild verwenden</button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CLASS_VISUALS.map((visual) => (
                  <button key={visual.id} type="button" disabled={savingVisual} onClick={() => void chooseVisual(visual.id)} className={"group overflow-hidden rounded-2xl border-2 text-left transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 " + (activeVisual === visual.id ? "border-violet-600 ring-2 ring-violet-100" : "border-slate-200")}>
                    <ClassVisual visualId={visual.id} className="aspect-[16/10] w-full" />
                    <span className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700">{visual.name}{activeVisual === visual.id && <Check className="h-4 w-4 text-violet-600" />}</span>
                  </button>
                ))}
              </div>
              {visualMessage && <p role="alert" className="mt-3 text-xs text-red-600">{visualMessage}</p>}
              <p className="mt-4 text-[11px] text-slate-400">Es wird nur die Motiv-Auswahl gespeichert. Klassenname, Jahrgang und Schuljahr werden hier nicht verändert.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
