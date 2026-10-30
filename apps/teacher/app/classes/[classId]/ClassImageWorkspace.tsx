"use client";

import { useState, useTransition } from "react";
import { CalendarDays, GraduationCap, Pencil, ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateClassDetails } from "../actions";
import ClassImageEditor from "./ClassImageEditor";

type Props = {
  classId: string;
  className: string;
  gradeLevel: number | null;
  schoolYear: string;
  heroImageUrl: string | null;
  heroPositionX: number;
  heroPositionY: number;
  heroZoom: number;
  classImagePath: string | null;
  classImageUrl: string | null;
  classImagePositionX: number;
  classImagePositionY: number;
  classImageZoom: number;
  canEditClassImage: boolean;
};

export default function ClassImageWorkspace({
  classId,
  className,
  gradeLevel,
  schoolYear,
  heroImageUrl,
  heroPositionX,
  heroPositionY,
  heroZoom,
  classImagePath,
  classImageUrl,
  classImagePositionX,
  classImagePositionY,
  classImageZoom,
  canEditClassImage,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, startProfileTransition] = useTransition();
  const router = useRouter();

  async function saveProfile(formData: FormData) {
    setProfileMessage("");
    startProfileTransition(() => {
      void (async () => {
      try {
        await updateClassDetails(classId, formData);
        setProfileMessage("Klassenprofil gespeichert.");
        router.refresh();
      } catch (error) {
        setProfileMessage(error instanceof Error ? error.message : "Änderungen konnten nicht gespeichert werden.");
      }
      })();
    });
  }

  return (
    <>
      <section className="group relative mt-4 min-h-[270px] overflow-hidden rounded-[2rem] bg-[#090B2C] text-white shadow-[0_24px_70px_-35px_rgba(54,37,150,.75)] sm:min-h-[300px]">
        {heroImageUrl ? (
          <img src={heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: String(heroPositionX) + "% " + String(heroPositionY) + "%", transform: "scale(" + heroZoom + ")" }} />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(0,220,255,.3),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(124,58,237,.55),transparent_42%),linear-gradient(120deg,#090B2C,#25206B_55%,#101A50)]" />
        )}

        <img src="/classes_layer.webp" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />

        <div className="relative flex min-h-[270px] flex-col justify-between p-6 sm:min-h-[300px] sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/65">DR1FT <span className="text-cyan-300">✦</span> KLASSENRAUM</p>
            </div>
            {canEditClassImage && (
              <button type="button" onClick={() => { setEditorOpen(true); setImageEditorOpen(false); setProfileMessage(""); }} aria-label="Klasse bearbeiten" title="Klasse bearbeiten" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/35 bg-white/15 text-white shadow-[0_8px_30px_rgba(0,0,0,.18)] backdrop-blur-xl transition hover:border-white/60 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <Pencil className="h-4 w-4" />
              </button>
            )}
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
      </section>

      {editorOpen && canEditClassImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="class-editor-title">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/15 bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Klassenraum gestalten</p>
                <h2 id="class-editor-title" className="mt-1 text-lg font-semibold text-slate-950">Klassenprofil bearbeiten</h2>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} aria-label="Schließen" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid gap-6 p-5 sm:p-7">
              <form action={saveProfile} className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-slate-600">Klassenname
                  <input name="name" defaultValue={className} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </label>
                <label className="text-xs font-semibold text-slate-600">Jahrgang
                  <input name="gradeLevel" type="number" min="1" max="13" defaultValue={gradeLevel ?? ""} placeholder="Jahrgang" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </label>
                <label className="text-xs font-semibold text-slate-600">Schuljahr
                  <input name="schoolYear" defaultValue={schoolYear} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </label>
                <div className="flex items-center gap-3 sm:col-span-3">
                  <button type="submit" disabled={savingProfile} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">{savingProfile ? "Speichert …" : "Klassenprofil speichern"}</button>
                  {profileMessage && <span role="status" className="text-xs text-emerald-700">{profileMessage}</span>}
                </div>
              </form>

              <div className="border-t border-slate-200 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-slate-900">Klassenbild</h3><p className="mt-0.5 text-xs text-slate-500">Eigenes Foto hochladen und den Ausschnitt passend zum DR1FT-Header setzen.</p></div>
                  <button type="button" onClick={() => setImageEditorOpen((open) => !open)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"><ImagePlus className="h-4 w-4" />{imageEditorOpen ? "Bildeditor schließen" : "Bild ändern"}</button>
                </div>
                {imageEditorOpen && (
                  <ClassImageEditor
                    classId={classId}
                    imagePath={classImagePath}
                    imageUrl={classImageUrl}
                    positionX={classImagePositionX}
                    positionY={classImagePositionY}
                    zoom={classImageZoom}
                    onClose={() => setImageEditorOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
