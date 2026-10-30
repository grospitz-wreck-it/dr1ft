"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Sparkles, Link2, X } from "lucide-react";
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
  const [previewUrl, setPreviewUrl] = useState(coverImageUrl ?? "");
  const [savedMessage, setSavedMessage] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [visualFeedback, setVisualFeedback] = useState("");

  function generate() {
    setError("");
    setSavedMessage("");
    startTransition(async () => {
      try {
        setPreviewUrl("");
        const result = await generateScenarioCover(scenarioId, visualFeedback);
        setPreviewUrl(result.coverImageUrl);
        router.refresh();
      } catch (err) {
        setPreviewUrl("");
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
        setPreviewUrl(url);
        setSavedMessage("Teaserbild gespeichert.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Teaserbild konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/80 p-3 sm:p-4">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => previewUrl && setLightboxOpen(true)}
            disabled={!previewUrl}
            aria-label={previewUrl ? `Teaserbild ${title} vergrößern` : "Noch kein Teaserbild vorhanden"}
            className={`group relative block aspect-video w-full overflow-hidden rounded-xl border border-white bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-400 text-left shadow-sm ${previewUrl ? "cursor-zoom-in" : "cursor-default"}`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt={`Teaserbild: ${title}`} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <ImagePlus className="h-10 w-10 opacity-90" />
                <span className="mt-2 text-[10px] font-bold tracking-[.2em]">16:9 TEASERBILD</span>
              </div>
            )}
            {previewUrl && <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-xs font-semibold text-white">Zum Vergrößern anklicken</span>}
            {pending && <span className="absolute inset-0 grid place-items-center bg-slate-950/45 text-white"><LoaderCircle className="h-9 w-9 animate-spin" /></span>}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={generate} disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-60">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {pending ? "Teaserbild wird erstellt …" : previewUrl ? "Teaserbild neu erstellen" : "Teaserbild erstellen"}
            </button>
            {previewUrl && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Bild hinterlegt</span>}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Bild konkretisieren (optional)</span>
            <textarea
              value={visualFeedback}
              onChange={(event) => setVisualFeedback(event.target.value)}
              maxLength={1200}
              rows={2}
              placeholder="z. B. weniger abstrakt, zwei Jugendliche im Vordergrund, Konflikt in einem Klassenchat visuell zeigen …"
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
            <span className="mt-1 block text-right text-[10px] text-slate-400">{visualFeedback.length}/1200 Zeichen · wird direkt an FLUX übergeben</span>
          </label>

          <form onSubmit={saveUrl} className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="url" name="coverImageUrl" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Eigene Bild-URL (optional)" aria-label={`Teaserbild-URL für ${title}`} className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
            </label>
            <button type="submit" disabled={pending} className="min-h-11 shrink-0 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50">URL speichern</button>
          </form>
          {savedMessage && <p role="status" className="text-sm font-medium text-emerald-700">{savedMessage}</p>}
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">{error}</p>}
        </div>
      </section>

      {lightboxOpen && previewUrl && (
        <div role="dialog" aria-modal="true" aria-label={`Teaserbild: ${title}`} onClick={() => setLightboxOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setLightboxOpen(false); }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm sm:p-8">
          <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Lightbox schließen" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-6xl">
            <img src={previewUrl} alt={`Teaserbild: ${title}`} className="max-h-[85vh] w-full rounded-2xl object-contain shadow-2xl" />
            <p className="mt-3 text-center text-sm font-medium text-white/80">{title}</p>
          </div>
        </div>
      )}
    </>
  );
}
