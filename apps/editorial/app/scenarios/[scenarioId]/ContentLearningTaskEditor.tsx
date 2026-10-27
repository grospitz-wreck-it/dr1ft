"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateContentLearningTask } from "../learning-content-actions";
import { Check, Plus, Sparkles, X } from "lucide-react";

type Interaction = { id: string; label: string; instruction?: string; custom?: boolean; discoveryTitle?: string; discoveryMessage?: string; discoveryCompetency?: string };
type Task = {
  purpose: string;
  learnerAction: string;
  interactions: Interaction[];
  feedback: string;
  successCriteria: string;
};

const DEFAULT_INTERACTIONS: Interaction[] = [
  { id: "like", label: "Reagieren" },
  { id: "comment", label: "Kommentieren" },
];
const AVAILABLE_INTERACTIONS: Interaction[] = [
  { id: "compare_information", label: "Quelle vergleichen", instruction: "Vergleiche die Aussage mit einer unabhängigen Quelle." },
  { id: "fact_check", label: "Fakten checken", instruction: "Prüfe, ob sich die zentrale Behauptung belegen lässt." },
  { id: "inspect_source", label: "Quelle prüfen", instruction: "Untersuche, wer die Aussage veröffentlicht hat und worauf sie sich stützt." },
  { id: "inspect_media", label: "Bild prüfen", instruction: "Prüfe Herkunft und Kontext des Bildes." },
  { id: "inspect_context", label: "Kontext prüfen", instruction: "Prüfe, ob wichtige Informationen fehlen oder aus dem Zusammenhang gerissen wurden." },
  { id: "inspect_profile", label: "Profil prüfen", instruction: "Sieh dir das Profil und seine bisherigen Beiträge kritisch an." },
  { id: "report", label: "Melden", instruction: "Entscheide, ob der Beitrag gegen Regeln verstößt und gemeldet werden sollte." },
  { id: "ignore", label: "Ignorieren", instruction: "Entscheide bewusst, ob du dem Beitrag keine weitere Aufmerksamkeit gibst." },
  { id: "share", label: "Teilen", instruction: "Überlege, ob du den Beitrag weiterverbreiten würdest." },
];
const area = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
const labelClass = "block text-xs font-semibold text-slate-700";

export function ContentLearningTaskEditor({ scenarioId, contentItemId, initialTask }: { scenarioId: string; contentItemId: string; initialTask?: Partial<Task> | null }) {
  const [open, setOpen] = useState(Boolean(initialTask && Object.values(initialTask).some(v => Array.isArray(v) ? v.length > 0 : String(v ?? "").trim())));
  const [task, setTask] = useState<Task>(() => {
    const saved = (initialTask ?? {}) as Partial<Task>;
    return {
      purpose: saved.purpose ?? "",
      learnerAction: saved.learnerAction ?? "",
      interactions: Array.isArray(saved.interactions) ? saved.interactions : DEFAULT_INTERACTIONS,
      feedback: saved.feedback ?? "",
      successCriteria: saved.successCriteria ?? "",
    };
  });
  const [showPicker, setShowPicker] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update<K extends keyof Task>(key: K, value: Task[K]) {
    setTask(current => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }
  function toggleInteraction(interaction: Interaction) {
    const exists = task.interactions.some(item => item.id === interaction.id);
    update("interactions", exists
      ? task.interactions.filter(item => item.id !== interaction.id)
      : [...task.interactions, interaction]);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await updateContentLearningTask(scenarioId, contentItemId, {
          ...task,
          interactionType: task.interactions[0]?.id === "comment" ? "comment" : "reflect",
          expectedResponse: "",
          evaluationMethod: "criteria",
        } as any);
        setMessage("Gespeichert");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const selectedIds = new Set(task.interactions.map(item => item.id));
  return <section className="mt-3 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-white to-violet-50/60">
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-violet-50/70">
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Sparkles className="h-4 w-4" /></span>
        <span><span className="block text-sm font-bold text-slate-900">Lernaufgabe &amp; Interaktionen</span><span className="mt-1 block text-xs text-slate-500">Mit Standardaktionen starten und nur bei Bedarf erweitern.</span></span>
      </span>
      <span className="text-violet-700">{open ? "−" : "+"}</span>
    </button>
    {open && <form onSubmit={submit} className="space-y-5 border-t border-violet-100 p-4">
      <div>
        <label className={labelClass}>Worum geht es bei diesem Post? <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea className={area} rows={2} value={task.purpose} onChange={event => update("purpose", event.target.value)} placeholder="z. B. Der Post soll dazu anregen, eine Behauptung nicht ungeprüft weiterzuverbreiten." />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Was kann der Lernende damit machen?</h3><p className="mt-0.5 text-xs text-slate-500">Standardaktionen sind vorausgewählt. Klicke auf eine Aktion, um sie an- oder abzuwählen.</p></div><span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">{task.interactions.length} aktiv</span></div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_INTERACTIONS.map(item => <span key={item.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-600"><Check className="h-3.5 w-3.5" />{item.label}<span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Standard</span></span>)}
          {task.interactions.filter(item => !DEFAULT_INTERACTIONS.some(def => def.id === item.id)).map(item => <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 pl-3 pr-1.5 py-1.5 text-sm font-semibold text-violet-800">{item.label}<button type="button" onClick={() => toggleInteraction(item)} aria-label={item.label + " entfernen"} className="grid h-6 w-6 place-items-center rounded-full hover:bg-violet-100"><X className="h-3.5 w-3.5" /></button></span>)}
        {task.interactions.filter(item => !DEFAULT_INTERACTIONS.some(def => def.id === item.id)).map(item => <details key={item.id + "-discovery"} className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-emerald-900">✦ Sofort-Erkenntnis für „{item.label}“ festlegen (optional)</summary>
          <div className="grid gap-3 border-t border-emerald-100 p-3 sm:grid-cols-2">
            <label className={labelClass}>Überschrift<input value={item.discoveryTitle ?? ""} onChange={event => update("interactions", task.interactions.map(entry => entry.id === item.id ? { ...entry, discoveryTitle: event.target.value } : entry))} placeholder="z. B. Du hast ein Warnsignal entdeckt" className={area} /></label>
            <label className={labelClass}>Lernbereich<input value={item.discoveryCompetency ?? ""} onChange={event => update("interactions", task.interactions.map(entry => entry.id === item.id ? { ...entry, discoveryCompetency: event.target.value } : entry))} placeholder="z. B. Quellenkompetenz" className={area} /></label>
            <label className={labelClass + " sm:col-span-2"}>Welche Erkenntnis soll direkt bestätigt werden?<textarea value={item.discoveryMessage ?? ""} onChange={event => update("interactions", task.interactions.map(entry => entry.id === item.id ? { ...entry, discoveryMessage: event.target.value } : entry))} rows={2} placeholder="Nur eine im Szenario belegte Erkenntnis formulieren." className={area} /></label>
          </div>
        </details>)}
          <button type="button" onClick={() => setShowPicker(value => !value)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-violet-400 bg-white px-3.5 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"><Plus className="h-4 w-4" /> Interaktion</button>
        </div>
        {showPicker && <div className="mt-3 rounded-2xl border border-violet-200 bg-white p-3 sm:p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Aktion hinzufügen</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {AVAILABLE_INTERACTIONS.filter(item => !selectedIds.has(item.id)).map(item => <button key={item.id} type="button" onClick={() => toggleInteraction(item)} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-violet-400 hover:bg-violet-50"><span className="block text-sm font-semibold text-slate-800">＋ {item.label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.instruction}</span></button>)}
          </div>
}
      </div>
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-3 text-xs font-bold text-slate-600">Erweiterte Lernsteuerung (optional)</summary>
        <div className="space-y-3 border-t border-slate-100 p-3">
          <label className={labelClass}>Konkrete Aufgabe für den Lernenden<textarea className={area} rows={2} value={task.learnerAction} onChange={event => update("learnerAction", event.target.value)} placeholder="Nur ausfüllen, wenn die Standardaktionen nicht ausreichen." /></label>
          <label className={labelClass}>Erfolgskriterien<textarea className={area} rows={2} value={task.successCriteria} onChange={event => update("successCriteria", event.target.value)} placeholder="Woran erkennen wir einen Lernfortschritt?" /></label>
          <label className={labelClass}>Feedback nach der Interaktion<textarea className={area} rows={2} value={task.feedback} onChange={event => update("feedback", event.target.value)} placeholder="Optional: spezifische Rückmeldung statt Standardfeedback." /></label>
        </div>
      </details>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-violet-100 pt-3">{message && <span role="status" className="text-xs font-semibold text-emerald-700">{message}</span>}{error && <span role="alert" className="text-xs font-semibold text-red-600">{error}</span>}<button disabled={pending} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Speichert …" : "Änderungen speichern"}</button></div>
    </form>}
  </section>;
}
