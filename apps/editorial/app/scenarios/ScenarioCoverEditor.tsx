"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Sparkles, Link2 } from "lucide-react";
import { generateScenarioCover, saveScenarioCoverUrl } from "./actions";

export function ScenarioCoverEditor({
  scenarioId,
  title,
  coverImageUrl,
}: {
  scenarioId: string;
  title: string;
  coverImageUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [url, setUrl] = useState(coverImageUrl ?? "");
  const [savedMessage, setSavedMessage] = useState("");

  function generate() {
    setError("");
    setSavedMessage("");
    startTransition(async () => {
      try {
        await generateScenarioCover(scenarioId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Teaserbild konnte nicht erstellt werden.");
      }
    });
  }

  function saveUrl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSavedMessage("");
    const formData = new FormData();
    formData.set("coverImageUrl", url);
    startTransition(async () => {
      try {
        await saveScenarioCoverUrl(scenarioId, formData);
        setSavedMessage("Teaserbild gespeichert.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Teaserbild konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-cyan-50/80 p-3 sm:p-4">
      <div className="grid items-center gap-4 md:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.35fr)]">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-400 shadow-sm">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt={`Teaserbild: ${title}`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <ImagePlus className="h-8 w-8 opacity-90" />
              <span className="mt-2 text-[9px] font-bold tracking-[.2em]">16:9 TEASERBILD</span>
            </div>
          )}
          {pending && <div className="absolute inset-0 grid place-items-center bg-slate-950/45 text-white"><LoaderCircle className="h-8 w-8 animate-spin" /></div>}
          {coverImageUrl && <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/75 px-2 py-1 text-[10px] font-semibold text-white">Szenario-Cover · 16:9</span>}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-violet-700">Szenario-Teaserbild</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Ein gemeinsames Motiv für alle Altersvarianten – erstellt aus dem Szenario-Briefing.</p>
            </div>
            {coverImageUrl && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Bild hinterlegt</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={generate} disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-wait disabled:opacity-60">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {pending ? "Teaserbild wird erstellt …" : coverImageUrl ? "Teaserbild neu erstellen" : "Teaserbild erstellen"}
            </button>
            {coverImageUrl && <a href={coverImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-violet-200 hover:text-violet-700">Bild ansehen ↗</a>}
          </div>

          <form onSubmit={saveUrl} className="mt-3 flex min-w-0 gap-2">
            <label className="relative min-w-0 flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="url" name="coverImageUrl" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Eigene Bild-URL (optional)" aria-label={`Teaserbild-URL für ${title}`} className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 pl-9 text-xs outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
            </label>
            <button type="submit" disabled={pending} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700 disabled:opacity-50">URL speichern</button>
          </form>
          {savedMessage && <p role="status" className="mt-2 text-xs font-medium text-emerald-700">{savedMessage}</p>}
          {error && <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{error}</p>}
        </div>
      </div>
    </section>
  );
}
