"use client";

import { useState } from "react";
import { Image, Link2, Trash2 } from "lucide-react";

type Format = "photo" | "embed";

export function ContentAttachmentEditor({ scenarioId, contentItemId, mediaUrl, mediaType, embedUrl }: { scenarioId: string; contentItemId: string; mediaUrl?: string | null; mediaType?: string | null; embedUrl?: string | null }) {
  const [format, setFormat] = useState<Format>(embedUrl ? "embed" : "photo");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const hasMedia = Boolean(mediaUrl || embedUrl);

  async function request(method: "POST" | "DELETE", body: object) {
    setBusy(true);
    try {
      const response = await fetch("/api/scenarios/" + scenarioId + "/content-item", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId, ...body }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Medium konnte nicht aktualisiert werden.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Medium konnte nicht aktualisiert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-800">Medien</h3>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{hasMedia ? (embedUrl ? "Externer Embed hinterlegt" : mediaType === "video" ? "Video hinterlegt" : "Bild hinterlegt") : "Kein Medium hinterlegt"}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {hasMedia && <button type="button" disabled={busy} onClick={() => request("DELETE", {})} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1.5 text-[11px] font-semibold text-rose-700 disabled:opacity-50"><Trash2 className="h-3 w-3" /> Entfernen</button>}
          <button type="button" onClick={() => setOpen(!open)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">{open ? "Schließen" : hasMedia ? "Ändern" : "+ Hinzufügen"}</button>
        </div>
      </div>
      {mediaUrl && mediaType === "image" && <img src={mediaUrl} alt="" className="mt-3 max-h-40 w-full rounded-lg bg-slate-50 object-contain" />}
      {embedUrl && <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-slate-100"><iframe src={embedUrl} title="Eingebettetes Video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
      {open && <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setFormat("photo")} className={"inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold " + (format === "photo" ? "bg-accent text-white" : "border border-slate-200 bg-white text-slate-600")}><Image className="h-3 w-3" /> Foto</button>
          <button type="button" onClick={() => setFormat("embed")} className={"inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold " + (format === "embed" ? "bg-accent text-white" : "border border-slate-200 bg-white text-slate-600")}><Link2 className="h-3 w-3" /> YouTube / Embed</button>
        </div>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={format === "embed" ? "YouTube-URL oder iframe-Code einfügen" : "Bild-URL"} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs" />
        <button type="button" disabled={busy || !value.trim()} onClick={() => request("POST", { format, url: value.trim(), ai: false })} className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40">{busy ? "Wird gespeichert …" : "Übernehmen"}</button>
      </div>}
    </div>
  );
}
