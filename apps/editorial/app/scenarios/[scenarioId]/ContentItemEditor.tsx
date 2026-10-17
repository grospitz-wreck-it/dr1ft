"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Pencil, Sparkles } from "lucide-react";
import { saveContentEditorial, suggestContentInteraction } from "../learning-content-actions";

type Interaction = {
  type: string;
  expectedAction: "report" | "ignore" | "none";
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

export function ContentItemEditor({ scenarioId, item, creators }: {
  scenarioId: string;
  item: { id: string; title?: string | null; body: string | null; creator_id?: string | null; extra?: unknown };
  creators: Array<{ id: string; display_name: string; creator_role?: string | null }>;
}) {
  const extra = item.extra && typeof item.extra === "object" ? item.extra as Record<string, any> : {};
  const saved = extra.learning_interaction && typeof extra.learning_interaction === "object" ? extra.learning_interaction : {};
  const [title, setTitle] = useState(item.title || "");
  const [body, setBody] = useState(item.body || "");
  const [creatorId, setCreatorId] = useState(item.creator_id || "");
  const [interaction, setInteraction] = useState<Interaction>({
    type: saved.type || "inspect_source",
    expectedAction: saved.expectedAction === "report" || saved.expectedAction === "ignore" ? saved.expectedAction : "none",
    goal: saved.goal || "",
    expectedFinding: saved.expectedFinding || "",
    successFeedback: saved.successFeedback || "",
    retryFeedback: saved.retryFeedback || "",
  });
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        await saveContentEditorial(scenarioId, item.id, { title, body, creatorId, interaction });
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
    <div className="mt-3 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/70">
      <div className="px-4 pt-4"><label className="block text-xs font-semibold text-slate-600">ABSENDER / NPC<select value={creatorId} onChange={(event) => setCreatorId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"><option value="">NPC auswählen …</option>{creators.map((creator) => <option key={creator.id} value={creator.id}>{creator.display_name}{creator.creator_role ? ` · ${creator.creator_role}` : ""}</option>)}</select><span className="mt-1 block text-[11px] font-normal text-slate-500">Der Absender wird im Player angezeigt und kann hier geändert werden.</span></label></div>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Pencil className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800">Inhalt & Interaktion gestalten</span>
          <span className="mt-0.5 block text-xs text-slate-500">{saved.expectedFinding || "Text bearbeiten und festlegen, was Lernende entdecken sollen."}</span>
        </span>
        <ChevronDown className={"h-4 w-4 text-slate-400 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="space-y-4 border-t border-violet-100 bg-white/80 p-4">
        <div className="grid gap-3">
          <label className="text-xs font-semibold text-slate-600">Kurzer Titel <span className="font-normal text-slate-400">(optional)</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Worum geht es in diesem Beitrag?" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Der Inhalt, den Lernende sehen
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="Hier kannst du jederzeit eigenen Text schreiben oder einen KI-Entwurf überarbeiten." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal leading-relaxed text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
          </label>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="text-sm font-semibold text-slate-800">Was sollen die Lernenden tun?</div><p className="mt-1 text-xs text-slate-500">Auch ein unauffälliges Bild kann geprüft, verglichen oder eingeordnet werden.</p></div>
            <button type="button" onClick={generateSuggestion} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />{busy ? "Denke nach …" : "KI hilft mir"}</button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {interactionTypes.map((option) => <button type="button" key={option.value} onClick={() => setInteraction((current) => ({ ...current, type: option.value }))} className={"rounded-xl border p-3 text-left transition " + (interaction.type === option.value ? "border-violet-300 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50")}>
              <span className="block text-xs font-semibold text-slate-800">{option.label}</span><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{option.hint}</span>
            </button>)}
          </div>
          {interaction.type === "report" && <label className="mt-3 block text-xs font-semibold text-slate-600">Welche Handlung ist hier die erwartete Lösung?
            <select value={interaction.expectedAction} onChange={(event) => setInteraction((current) => ({ ...current, expectedAction: event.target.value as Interaction["expectedAction"] }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900">
              <option value="none">Keine eindeutige Musterlösung</option>
              <option value="report">Beitrag melden</option>
              <option value="ignore">Beitrag nicht melden</option>
            </select>
            <span className="mt-1 block text-[11px] font-normal text-slate-500">Diese Vorgabe dient der Auswertung. Sie wird Lernenden nicht vorab angezeigt.</span>
          </label>}
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Ausgewählt: <strong className="text-slate-700">{selected?.label}</strong>. Ergänze, was in diesem konkreten Fall als gute Lösung zählt.</div>
          <div className="mt-3 grid gap-3">
            <label className="text-xs font-semibold text-slate-600">Lernziel – was sollen sie herausfinden?
              <textarea value={interaction.goal} onChange={(event) => setInteraction((current) => ({ ...current, goal: event.target.value }))} rows={2} placeholder="z. B. Die ursprüngliche Quelle und das Veröffentlichungsdatum prüfen." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Die erwartete Erkenntnis
              <textarea value={interaction.expectedFinding} onChange={(event) => setInteraction((current) => ({ ...current, expectedFinding: event.target.value }))} rows={3} placeholder="z. B. Das Foto ist 20 Jahre alt und kein aktueller Beleg für die Behauptung." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Wenn die Antwort passt
                <textarea value={interaction.successFeedback} onChange={(event) => setInteraction((current) => ({ ...current, successFeedback: event.target.value }))} rows={3} placeholder="Bestärke die richtige Erkenntnis und erkläre kurz warum." className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2.5 text-sm font-normal text-slate-900" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Wenn noch etwas fehlt
                <textarea value={interaction.retryFeedback} onChange={(event) => setInteraction((current) => ({ ...current, retryFeedback: event.target.value }))} rows={3} placeholder="Gib einen hilfreichen Hinweis, keine bloße Fehlermeldung." className="mt-1.5 w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-sm font-normal text-slate-900" />
              </label>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-xs text-slate-500">{message}</p>
          <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"><Check className="h-4 w-4" />{busy ? "Speichert …" : "Änderungen speichern"}</button>
        </div>
      </div>}
    </div>
  );
}
