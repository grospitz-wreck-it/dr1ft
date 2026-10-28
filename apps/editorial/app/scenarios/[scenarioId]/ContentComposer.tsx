"use client";

import { useState } from "react";
import { Sparkles, Image, Laugh, Video, Link2, MessageCircle, Mail, PenLine, Check, LoaderCircle } from "lucide-react";

type Format = "post" | "photo" | "meme" | "video" | "embed" | "comment" | "dm_message" | "reflection_prompt";

const formats: { id: Format; label: string; hint: string; icon: typeof PenLine }[] = [
  { id: "post", label: "Post", hint: "Eine Story für den Feed", icon: PenLine },
  { id: "photo", label: "Foto-Story", hint: "Ein realistisches Bild", icon: Image },
  { id: "meme", label: "Meme", hint: "Humorvoller Feed-Inhalt", icon: Laugh },
  { id: "video", label: "Video", hint: "Video-Idee oder Clip", icon: Video },
  { id: "embed", label: "Externer Inhalt", hint: "Video oder Website", icon: Link2 },
  { id: "comment", label: "Kommentar", hint: "Reaktion im Feed", icon: MessageCircle },
  { id: "dm_message", label: "Direktnachricht", hint: "Privater Chat", icon: Mail },
  { id: "reflection_prompt", label: "Reflexion", hint: "Frage zum Nachdenken", icon: PenLine },
];

export function ContentComposer({ scenarioId }: { scenarioId: string }) {
  const [format, setFormat] = useState<Format>("post");
  const [prompt, setPrompt] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [generatingSet, setGeneratingSet] = useState(false);

  async function create(ai: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/scenarios/" + scenarioId + "/content-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, prompt, url, ai }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Inhalt konnte nicht erstellt werden.");
      setMessage("Entwurf ist im Feed. Einen Moment …");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erstellung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function generateExperienceSet() {
    setGeneratingSet(true);
    setMessage("");
    try {
      const response = await fetch("/api/scenarios/" + scenarioId + "/learning-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentFirst: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Lernerlebnisse konnten nicht generiert werden.");
      setMessage((result.created ?? 0) + " Content-Pieces als Entwurf erstellt. Die Seite wird aktualisiert …");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "KI-Generierung fehlgeschlagen.");
    } finally {
      setGeneratingSet(false);
    }
  }

  const visibleFormats = formats.filter(({ id }) => showMore || ["post", "photo", "meme", "video", "embed"].includes(id));
  const active = formats.find((item) => item.id === format)!;
  const ActiveIcon = active.icon;

  return (
    <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 px-5 py-6 text-white sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute right-28 top-20 h-12 w-12 rounded-full bg-fuchsia-300/20 blur-xl" />
        <div className="relative mb-5 flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Ein zusammenhängendes Lernerlebnis entwerfen</div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-violet-100">Die KI erstellt einen ersten Ablauf aus Einstieg, sozialer Reaktion, Wendepunkt und Reflexion – direkt aus dem Szenario, ohne dass ein Lernplan angelegt sein muss.</p>
        </div>
        <button type="button" onClick={generateExperienceSet} disabled={generatingSet || busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60">
          {generatingSet ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generatingSet ? "Erlebnisse werden erstellt …" : "Lernerlebnis mit KI entwerfen"}
        </button>
      </div>
      <div className="relative flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 shadow-inner"><Sparkles className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-100">Dein Content-Studio</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Was passiert als Nächstes im Feed?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">Wähle ein Format und beschreibe kurz die Szene. DR1FT erstellt einen passenden Entwurf, den du danach weiter bearbeiten kannst.</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-[10px] font-medium">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">✦ KI-gestützter Entwurf</span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Du behältst die redaktionelle Kontrolle</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-bold text-slate-900">1. Format auswählen</h3><p className="mt-1 text-xs text-slate-500">Was möchtest du in der Mission zeigen?</p></div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">SCHRITT 1</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {visibleFormats.map(({ id, label, hint, icon: Icon }) => {
            const selected = id === format;
            return <button key={id} type="button" onClick={() => { setFormat(id); setMessage(""); }} className={"group rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm " + (selected ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-200")}>
              <span className={"mb-3 grid h-9 w-9 place-items-center rounded-xl " + (selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700")}><Icon className="h-4 w-4" /></span>
              <span className="flex items-center gap-1 text-xs font-bold text-slate-900">{label}{selected && <Check className="h-3 w-3 text-violet-600" />}</span>
              <span className="mt-1 block text-[10px] leading-4 text-slate-500">{hint}</span>
            </button>;
          })}
        </div>
        {!showMore && <button type="button" onClick={() => setShowMore(true)} className="mt-3 text-xs font-semibold text-violet-700 hover:text-violet-900">Weitere Formate anzeigen <span aria-hidden="true">→</span></button>}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><ActiveIcon className="h-4 w-4" /></span><div><h3 className="text-sm font-bold text-slate-900">2. Szene beschreiben</h3><p className="text-[11px] text-slate-500">Format: {active.label} · Lernkontext wird automatisch berücksichtigt</p></div></div>
          <label className="mt-4 block text-xs font-semibold text-slate-700">Was soll im Inhalt passieren?</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Zum Beispiel: Eine Schülerin sieht einen dramatischen Post in ihrer Klassengruppe und ist unsicher, ob er stimmt …" className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
          {(format === "embed" || format === "video") && <label className="mt-3 block text-xs font-semibold text-slate-700">{format === "embed" ? "Link zum Inhalt" : "Video-Link (optional)"}<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-[11px] leading-4 text-slate-500">Der Entwurf wird als Inhalt angelegt und kann anschließend redaktionell geprüft und bearbeitet werden.</p>
            {format === "embed" ? <button type="button" disabled={busy || !url.trim()} onClick={() => create(false)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50">In Feed übernehmen</button> : <button type="button" disabled={busy} onClick={() => create(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? "Entwurf wird erstellt …" : "Entwurf mit KI erstellen"}</button>}
          </div>
          {format === "video" && <p className="mt-3 text-[10px] text-slate-500">Die KI erstellt zunächst einen Video-Entwurf bzw. eine Vorlage, kein fertiges KI-Video.</p>}
          {message && <p role="status" className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">{message}</p>}
        </div>
      </div>
    </section>
  );
}
