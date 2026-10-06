"use client";

import { useState } from "react";
import { Image, Link2, Sparkles, Video } from "lucide-react";

export function ContentAttachmentEditor({ scenarioId, contentItemId }: { scenarioId: string; contentItemId: string }) {
  const [format, setFormat] = useState<"photo" | "meme" | "video" | "embed">("photo");
  const [value, setValue] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function save(ai: boolean) {
    setBusy(true);
    try {
      const response = await fetch("/api/scenarios/" + scenarioId + "/content-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId, format, url: value, prompt, ai }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Medien konnten nicht ergänzt werden.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Medien konnten nicht ergänzt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button type="button" onClick={() => setOpen(!open)} className="text-[11px] font-semibold text-accent hover:underline">
        + Medien / Embed ergänzen
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              ["photo","Foto",Image],
              ["meme","Meme",Sparkles],
              ["video","Video",Video],
              ["embed","Embed",Link2],
            ].map(([id,label,Icon]: any) => (
              <button key={id} type="button" onClick={() => setFormat(id)} className={"inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold " + (format === id ? "bg-accent text-white" : "bg-white border border-slate-200 text-slate-600")}>
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={format === "embed" ? "URL oder iframe-Embed-Code" : format === "video" ? "Video-URL (z. B. YouTube)" : "Optional: vorhandene URL"} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs" />
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="Optional: Was soll die KI daraus machen?" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs" />
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy || (format === "embed" && !value.trim())} onClick={() => save(false)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40">Übernehmen</button>
            {format !== "embed" && <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex items-center gap-1 rounded-lg bg-accent text-white px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"><Sparkles className="w-3 h-3" /> KI erstellen</button>}
          </div>
        </div>
      )}
    </div>
  );
}
