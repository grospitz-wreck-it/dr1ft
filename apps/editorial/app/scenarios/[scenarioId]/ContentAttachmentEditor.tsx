"use client";

import { useEffect, useState } from "react";
import { Image, Link2, Trash2, X } from "lucide-react";

type Format = "photo" | "embed";

export function ContentAttachmentEditor({ scenarioId, contentItemId, mediaUrl, mediaType, embedUrl }: { scenarioId: string; contentItemId: string; mediaUrl?: string | null; mediaType?: string | null; embedUrl?: string | null }) {
  const [format, setFormat] = useState<Format>(embedUrl ? "embed" : "photo");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const hasMedia = Boolean(mediaUrl || embedUrl);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function request(method: "POST" | "DELETE", body: object) {
    setBusy(true);
    try {
      const response = await fetch("/api/scenarios/" + scenarioId + "/content-item", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentItemId, ...body }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Medium konnte nicht aktualisiert werden.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Medium konnte nicht aktualisiert werden.");
    } finally { setBusy(false); }
  }

  return <>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="group flex w-full items-center justify-between gap-4 p-3 text-left transition hover:bg-slate-50">
        <span className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">{embedUrl ? <Link2 className="h-4 w-4" /> : <Image className="h-4 w-4" />}</span><span className="min-w-0"><span className="block text-xs font-bold text-slate-900">Medien / Embed</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{embedUrl ? "Externer Embed hinterlegt" : hasMedia ? mediaType === "video" ? "Video hinterlegt" : "Bild hinterlegt" : "Kein Medium hinterlegt"}</span></span></span>
        <span className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm group-hover:bg-slate-50">Konfigurieren</span>
      </button>
    </section>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Medien und Embed konfigurieren" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-violet-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6"><div><h2 className="text-lg font-bold text-slate-950">Medien / Embed</h2><p className="mt-0.5 text-xs text-slate-500">Bild oder YouTube-Embed für diesen Beitrag verwalten.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Schließen"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-4 sm:p-5">
          {mediaUrl && mediaType === "image" && <img src={mediaUrl} alt="" className="max-h-72 w-full rounded-xl bg-slate-50 object-contain" />}
          {mediaUrl && mediaType === "video" && <video src={mediaUrl} controls playsInline preload="metadata" className="max-h-72 w-full rounded-xl bg-black" />}
          {embedUrl && <div className="aspect-video overflow-hidden rounded-xl bg-slate-100"><iframe src={embedUrl} title="Eingebettetes Video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
          {hasMedia && <button type="button" disabled={busy} onClick={() => request("DELETE", {})} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Medium entfernen</button>}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex gap-1.5"><button type="button" onClick={() => setFormat("photo")} className={"inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold " + (format === "photo" ? "bg-accent text-white" : "border border-slate-200 bg-white text-slate-600")}><Image className="h-3.5 w-3.5" /> Foto</button><button type="button" onClick={() => setFormat("embed")} className={"inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold " + (format === "embed" ? "bg-accent text-white" : "border border-slate-200 bg-white text-slate-600")}><Link2 className="h-3.5 w-3.5" /> YouTube / Embed</button></div>
            <label className="mt-3 block text-xs font-semibold text-slate-700">{format === "embed" ? "YouTube-URL oder iframe-Code" : "Bild-URL"}<input value={value} onChange={(event) => setValue(event.target.value)} placeholder={format === "embed" ? "https://www.youtube.com/watch?v=…" : "https://…"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>
            <button type="button" disabled={busy || !value.trim()} onClick={() => request("POST", { format, url: value.trim(), ai: false })} className="mt-3 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Wird gespeichert …" : "Übernehmen"}</button>
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Schließen</button></div>
      </div>
    </div>}
  </>;
}
