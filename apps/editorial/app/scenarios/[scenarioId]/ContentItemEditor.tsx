"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, FileText, Pencil, Sparkles, Target } from "lucide-react";
import { saveContentEditorial, suggestContentInteraction } from "../learning-content-actions";

type Interaction = {
  type: string;
  goal: string;
  expectedFinding: string;
  successFeedback: string;
  retryFeedback: string;
};

const interactionTypes = [
  { value: "inspect_source", label: "Quelle überprüfen", hint: "Herkunft, Autor oder Veröffentlichungsdatum prüfen" },
  { value: "inspect_media", label: "Bild oder Video prüfen", hint: "Echtheit, Bearbeitung oder KI-Erzeugung untersuchen" },
  { value: "inspect_context", label: "Kontext verstehen", hint: "Einordnung, Aktualität oder fehlende Informationen erkennen" },
  { value: "compare_information", label: "Vergleichen", hint: "Mehrere Hinweise oder Quellen gegeneinander abwägen" },
  { value: "report", label: "Melden oder nicht melden", hint: "Eine Handlung auswählen und begründen" },
  { value: "reflect", label: "Eigene Einschätzung", hint: "Begründet bewerten oder reflektieren" },
  { value: "custom", label: "Eigene Interaktion", hint: "Eine andere Lernhandlung festlegen" },
];

export function ContentItemEditor({ scenarioId, item }: {
  scenarioId: string;
  item: { id: string; title?: string | null; body: string | null; extra?: unknown };
}) {
  const extra = item.extra && typeof item.extra === "object" ? item.extra as Record<string, any> : {};
  const saved = extra.learning_interaction && typeof extra.learning_interaction === "object" ? extra.learning_interaction : {};
  const [title, setTitle] = useState(item.title || "");
  const [body, setBody] = useState(item.body || "");
  const [interaction, setInteraction] = useState<Interaction>({
    type: saved.type || "inspect_source",
    goal: saved.goal || "",
    expectedFinding: saved.expectedFinding || "",
    successFeedback: saved.successFeedback || "",
    retryFeedback: saved.retryFeedback || "",
  });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"content" | "interaction">("content");
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        await saveContentEditorial(scenarioId, item.id, { title, body, interaction });
        setMessage("Gespeichert – Inhalt und Lernziel sind aktualisiert.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function generateSuggestion() {
    setMessage("");
    startTransition(async () => {
      try {
        const suggestion = await suggestContentInteraction(scenarioId, item.id, interaction.type);
        setInteraction(suggestion);
        setOpen(true);
        setMessage("KI-Vorschlag eingefügt. Bitte prüfen und speichern.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "KI-Vorschlag fehlgeschlagen.");
      }
    });
  }

  const selected = interactionTypes.find((option) => option.value === interaction.type);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-violet-100 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-violet-50/60">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Pencil className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-slate-800">Szene gestalten</span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">{saved.expectedFinding || "Text, Aufgabe und Lernfeedback festlegen"}</span>
        </span>
        {saved.expectedFinding && <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 sm:inline">Lernziel gesetzt</span>}
        <ChevronDown className={"h-4 w-4 shrink-0 text-slate-400 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="border-t border-violet-100">
        <div className="flex gap-1 bg-slate-50/80 p-2">
          <button type="button" onClick={() => setTab("content")} className={"flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition " + (tab === "content" ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/70")}><FileText className="h-3.5 w-3.5" /> Inhalt</button>
          <button type="button" onClick={() => setTab("interaction")} className={"flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition " + (tab === "interaction" ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/70")}><Target className="h-3.5 w-3.5" /> Lernaktion</button>
        </div>
        <div className="p-3 sm:p-4">
          {tab === "content" ? <div className="space-y-3">
            <label className="block text-[11px] font-semibold text-slate-600">Titel <span className="font-normal text-slate-400">· optional</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="z. B. Ein Post aus dem Klassenchat" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">Was sehen die Lernenden?
              <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="Schreibe oder überarbeite hier den Text. Du kannst jederzeit eigenen Inhalt ergänzen." className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal leading-relaxed text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
            </label>
            <p className="text-[11px] text-slate-400">Bilder und Videos kannst du links bei der Vorschau ergänzen oder bearbeiten.</p>
          </div> : <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-xs font-semibold text-slate-800">Was sollen die Lernenden entdecken?</p><p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">Auch ein ganz normales Bild kann zum Prüfen, Vergleichen oder Nachdenken einladen.</p></div>
              <button type="button" onClick={generateSuggestion} disabled={busy} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />{busy ? "…" : "KI-Idee"}</button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {interactionTypes.map((option) => <button type="button" key={option.value} onClick={() => setInteraction((current) => ({ ...current, type: option.value }))} className={"rounded-xl border px-2.5 py-2 text-left transition " + (interaction.type === option.value ? "border-violet-300 bg-violet-50 ring-1 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40")}>
                <span className="block text-[11px] font-semibold text-slate-800">{option.label}</span><span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{option.hint}</span>
              </button>)}
            </div>
            <label className="block text-[11px] font-semibold text-slate-600">Lernziel
              <textarea value={interaction.goal} onChange={(event) => setInteraction((current) => ({ ...current, goal: event.target.value }))} rows={2} placeholder="z. B. Die Quelle und das Veröffentlichungsdatum prüfen." className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">Was ist die richtige Erkenntnis?
              <textarea value={interaction.expectedFinding} onChange={(event) => setInteraction((current) => ({ ...current, expectedFinding: event.target.value }))} rows={2} placeholder="z. B. Das Foto ist 20 Jahre alt und kein aktueller Beleg." className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[11px] font-semibold text-emerald-800">Wenn es richtig ist
                <textarea value={interaction.successFeedback} onChange={(event) => setInteraction((current) => ({ ...current, successFeedback: event.target.value }))} rows={2} placeholder="Erkläre, was gut erkannt wurde." className="mt-1 block w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm font-normal text-slate-900" />
              </label>
              <label className="block text-[11px] font-semibold text-amber-800">Wenn noch etwas fehlt
                <textarea value={interaction.retryFeedback} onChange={(event) => setInteraction((current) => ({ ...current, retryFeedback: event.target.value }))} rows={2} placeholder="Gib einen hilfreichen Hinweis." className="mt-1 block w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm font-normal text-slate-900" />
              </label>
            </div>
          </div>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p role="status" className="text-[11px] text-slate-500">{message}</p>
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"><Check className="h-3.5 w-3.5" />{busy ? "Speichert …" : "Speichern"}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
