"use client";

import { useState } from "react";
import { Plus, Sparkles, Image, Laugh, Video, Link2, MessageCircle, Mail, PenLine, X } from "lucide-react";

type Format = "post" | "photo" | "meme" | "video" | "embed" | "comment" | "dm_message" | "reflection_prompt";

const formats: { id: Format; label: string; hint: string; icon: typeof PenLine }[] = [
  { id: "post", label: "Textbeitrag", hint: "Post für den Feed", icon: PenLine },
  { id: "photo", label: "Foto", hint: "Bild passend zum Lernschritt", icon: Image },
  { id: "meme", label: "Meme", hint: "Bild + kurzer Meme-Text", icon: Laugh },
  { id: "video", label: "Video", hint: "Video-Konzept oder vorhandenes Video", icon: Video },
  { id: "embed", label: "Embed", hint: "YouTube, Website oder anderer Embed", icon: Link2 },
  { id: "comment", label: "Kommentar", hint: "Reaktion auf einen Beitrag", icon: MessageCircle },
  { id: "dm_message", label: "DM", hint: "Private Nachricht", icon: Mail },
  { id: "reflection_prompt", label: "Reflexionsimpuls", hint: "Frage zur Reflexion", icon: PenLine },
];

export function ContentComposer({ scenarioId }: { scenarioId: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format | null>(null);
  const [prompt, setPrompt] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function create(ai: boolean) {
    if (!format) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/scenarios/" + scenarioId + "/content-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, prompt, url, ai }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Inhalt konnte nicht erstellt werden.");
      setMessage("Entwurf erstellt.");
      setPrompt(""); setUrl("");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erstellung fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-xl bg-accent text-white px-3 py-2 text-xs font-semibold hover:opacity-90">
        <Plus className="w-3.5 h-3.5" /> Inhalt hinzufügen
      </button>
      {open && !format && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="px-3 py-2"><div className="text-sm font-semibold text-slate-900">Was möchtest du hinzufügen?</div><div className="text-[11px] text-slate-400 mt-0.5">Die KI kann den Entwurf passend zum Lernplan erstellen.</div></div>
          <div className="grid grid-cols-2 gap-1">
            {formats.map(({ id, label, hint, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setFormat(id)} className="text-left rounded-xl p-2.5 hover:bg-slate-50">
                <Icon className="w-4 h-4 text-accent mb-1" />
                <div className="text-xs font-semibold text-slate-800">{label}</div>
                <div className="text-[10px] text-slate-400">{hint}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {open && format && (
        <div className="absolute right-0 z-30 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-sm font-semibold text-slate-900">{formats.find((f) => f.id === format)?.label}</div><div className="text-[11px] text-slate-400 mt-0.5">Bezug zum Learning Design wird automatisch berücksichtigt.</div></div>
            <button type="button" onClick={() => { setFormat(null); setMessage(""); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          {format === "embed" || format === "video" ? (
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={format === "embed" ? "URL oder Embed-Code" : "Optional: Video-URL"} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          ) : null}
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder={format === "embed" ? "Was soll der Embed im Lernschritt bewirken?" : "Optional: Was soll darin passieren?"} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2">
            {format === "embed" ? (
              <button type="button" disabled={busy || !url.trim()} onClick={() => create(false)} className="flex-1 rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Embed übernehmen</button>
            ) : (
              <button type="button" disabled={busy} onClick={() => create(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent text-white px-3 py-2 text-xs font-semibold disabled:opacity-40"><Sparkles className="w-3.5 h-3.5" /> Mit KI erstellen</button>
            )}
          </div>
          {format === "video" && <div className="text-[10px] text-slate-400 mt-2">Die KI erstellt zunächst einen Video-Entwurf bzw. eine Vorlage. Ein fertiges KI-Video erzeugen wir erst, wenn ein Video-Modell angebunden ist.</div>}
          {message && <div className="mt-3 text-[11px] text-slate-600">{message}</div>}
        </div>
      )}
    </div>
  );
}
