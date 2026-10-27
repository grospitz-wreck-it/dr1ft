"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateContentLearningTask } from "../learning-content-actions";

type Task = {
  purpose: string;
  learnerAction: string;
  interactionType: string;
  expectedResponse: string;
  evaluationMethod: string;
  successCriteria: string;
  feedback: string;
};

const defaults: Task = { purpose: "", learnerAction: "", interactionType: "reflect", expectedResponse: "", evaluationMethod: "criteria", successCriteria: "", feedback: "" };
const interactions = [["view","Ansehen / wahrnehmen"],["react","Reagieren"],["comment","Kommentieren"],["choose","Antwort auswählen"],["classify","Einordnen"],["compare","Vergleichen"],["reflect","Reflektieren"],["create","Etwas erstellen"]];
const methods = [["completion","Abschluss prüfen"],["criteria","Kriterienbasiert auswerten"],["choice","Auswahl auswerten"],["reflection","Reflexion auswerten"],["discussion","Diskussion / Peer-Feedback"]];

export function ContentLearningTaskEditor({ scenarioId, contentItemId, initialTask }: { scenarioId: string; contentItemId: string; initialTask?: Partial<Task> | null }) {
  const [open, setOpen] = useState(Boolean(initialTask && Object.values(initialTask).some(v => String(v ?? "").trim())));
  const [task, setTask] = useState<Task>({ ...defaults, ...(initialTask ?? {}) } as Task);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function field<K extends keyof Task>(key: K, value: Task[K]) { setTask(t => ({ ...t, [key]: value })); setMessage(""); setError(""); }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setMessage("");
    startTransition(async () => {
      try {
        await updateContentLearningTask(scenarioId, contentItemId, task as any);
        setMessage("Aufgabe gespeichert");
      } catch (err) { setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen."); }
    });
  }
  const area = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
  const label = "block text-xs font-semibold text-slate-700";
  return <section className="mt-3 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-white to-violet-50/60">
    <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-violet-50">
      <span><span className="block text-sm font-bold text-slate-900">✦ Lernaufgabe &amp; Auswertung</span><span className="mt-1 block text-xs text-slate-500">Was soll der User tun – und woran erkennen wir den Lernerfolg?</span></span><span className="text-violet-700">{open ? "−" : "+"}</span>
    </button>
    {open && <form onSubmit={submit} className="space-y-4 border-t border-violet-100 p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className={label}>1. Zweck des Posts<textarea className={area} rows={3} value={task.purpose} onChange={e => field("purpose",e.target.value)} placeholder="Was soll der Post im Lernprozess bewirken?" /></label>
        <label className={label}>2. Konkrete Aufgabe für den User<textarea className={area} rows={3} value={task.learnerAction} onChange={e => field("learnerAction",e.target.value)} placeholder="Was genau soll der Lernende tun?" /></label>
        <label className={label}>3. Erwartete Interaktion<select className={area} value={task.interactionType} onChange={e => field("interactionType",e.target.value)}>{interactions.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className={label}>4. Erwartete Reaktion / Antwort<textarea className={area} rows={3} value={task.expectedResponse} onChange={e => field("expectedResponse",e.target.value)} placeholder="Welche Antworten oder Verhaltensweisen erwarten wir?" /></label>
        <label className={label}>5. Auswertungsmethode<select className={area} value={task.evaluationMethod} onChange={e => field("evaluationMethod",e.target.value)}>{methods.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className={label}>6. Erfolgskriterien<textarea className={area} rows={3} value={task.successCriteria} onChange={e => field("successCriteria",e.target.value)} placeholder="Woran erkennen wir eine gute Antwort oder einen Lernfortschritt?" /></label>
      </div>
      <label className={label}>7. Feedback an den User<textarea className={area} rows={2} value={task.feedback} onChange={e => field("feedback",e.target.value)} placeholder="Welche Rückmeldung soll nach der Interaktion erscheinen?" /></label>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-violet-100 pt-3">{message && <span role="status" className="text-xs font-semibold text-emerald-700">{message}</span>}{error && <span role="alert" className="text-xs font-semibold text-red-600">{error}</span>}<button disabled={pending} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Speichert …" : "Aufgabe speichern"}</button></div>
      <p className="text-[11px] leading-4 text-slate-500">Die Angaben werden am Content-Piece gespeichert. Damit die Aufgabe im Schüler-Player ausgeführt und ausgewertet wird, muss die Player-Logik diese Konfiguration anschließend auslesen.</p>
    </form>}
  </section>;
}
