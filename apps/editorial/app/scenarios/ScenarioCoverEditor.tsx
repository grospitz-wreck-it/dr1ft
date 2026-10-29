"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Sparkles } from "lucide-react";
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

  function generate() {
    setError("");
    startTransition(async () => {
      try {
        await generateScenarioCover(scenarioId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Das Cover konnte nicht generiert werden.");
      }
    });
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/70 p-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white bg-gradient-to-br from-violet-800 via-indigo-600 to-cyan-400 shadow-sm">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt={`Szenario-Illustration: ${title}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-white">
            <ImagePlus className="h-8 w-8 opacity-90" />
            <span className="mt-2 text-[9px] font-bold tracking-[.18em]">SCENARIO ARTWORK</span>
          </div>
        )}
        {pending && <div className="absolute inset-0 grid place-items-center bg-slate-950/45 text-white"><LoaderCircle className="h-8 w-8 animate-spin" /></div>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-700">Szenario-Illustration</p>
        <p className="mt-1 text-sm leading-5 text-slate-600">FLUX erstellt ein gemeinsames Cover für alle Altersvarianten – direkt aus dem hinterlegten Szenario-Briefing.</p>
        <button type="button" onClick={generate} disabled={pending} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-500/15 hover:from-violet-700 hover:to-indigo-700 disabled:cursor-wait disabled:opacity-60">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {pending ? "FLUX erstellt die Illustration …" : coverImageUrl ? "Mit FLUX neu generieren" : "Illustration mit FLUX erstellen"}
        </button>
        <form action={saveScenarioCoverUrl.bind(null, scenarioId)} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="url" name="coverImageUrl" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Oder eigene Bild-URL …" aria-label={`Cover-URL für ${title}`} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
          <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-200 hover:text-violet-700">URL speichern</button>
        </form>
        {error && <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </div>
    </div>
  );
}
