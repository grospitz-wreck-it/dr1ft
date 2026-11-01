"use client";

import { useState } from "react";
import { Image, Link2 } from "lucide-react";

type Format = "photo" | "embed";

export function ContentAttachmentEditor({ scenarioId, contentItemId }: { scenarioId: string; contentItemId: string }) {
  const [format, setFormat] = useState<Format>("photo");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/scenarios/" + scenarioId + "/content-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId, format, url: value.trim(), ai: false }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Inhalt konnte nicht ergänzt werden.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Inhalt konnte nicht ergänzt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button type="button" onClick={() => setOpen(!open)} className="text-[11px] font-semibold text-accent hover:underline">
        + Medien / externe Inhalte ergänzen
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setFormat("photo")} className={"inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold " + (format === "photo" ? "bg-accent text-white" : "bg-white border border-slate-200 text-slate-600")}>
              <Image className="w-3 h-3" /> Foto
            </button>
            <button type="button" onClick={() => setFormat("embed")} className={"inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold " + (format === "embed" ? "bg-accent text-white" : "bg-white border border-slate-200 text-slate-600")}>
              <Link2 className="w-3 h-3" /> Embed
            </button>
          </div>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={format === "embed" ? "URL oder unterstützter Embed-Link" : "Bild-URL"} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs" />
          <div className="mt-2">
            <button type="button" disabled={busy || !value.trim()} onClick={save} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40">
              {busy ? "Wird gespeichert …" : "Übernehmen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
