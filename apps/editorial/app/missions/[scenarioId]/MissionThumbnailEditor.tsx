"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Sparkles } from "lucide-react";
import { generateMissionThumbnail, saveMissionThumbnail } from "./actions";

export function MissionThumbnailEditor({
  missionId,
  scenarioId,
  title,
  thumbnailUrl,
}: {
  missionId: string;
  scenarioId: string;
  title: string;
  thumbnailUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [url, setUrl] = useState(thumbnailUrl ?? "");

  function generate() {
    setError("");
    startTransition(async () => {
      try {
        await generateMissionThumbnail(missionId, scenarioId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Das Bild konnte nicht generiert werden.");
      }
    });
  }

  return (
    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-400">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={`Missionsillustration: ${title}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-white">
            <ImagePlus className="h-7 w-7 opacity-90" />
            <span className="mt-1 text-[9px] font-bold tracking-[.16em]">NOCH KEIN COVER</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={generate} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 disabled:cursor-wait disabled:opacity-60">
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {pending ? "Teaserbild wird erstellt …" : thumbnailUrl ? "Teaserbild neu erstellen" : "Teaserbild erstellen"}
          </button>
          <span className="text-[11px] text-slate-400">KI-Cover aus Szenario-Briefing und Missionsbeschreibung</span>
        </div>
        {pending && <p className="mt-2 text-xs text-violet-700">Flux erstellt eine Illustration und speichert sie direkt an dieser Mission. Das kann kurz dauern.</p>}
        {error && <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <form action={saveMissionThumbnail.bind(null, missionId, scenarioId)} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="url" name="thumbnailUrl" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Oder eigene Bild-URL einfügen …" aria-label={`Thumbnail-URL für ${title}`} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs" />
          <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-200 hover:text-violet-700">URL speichern</button>
        </form>
      </div>
    </div>
  );
}
