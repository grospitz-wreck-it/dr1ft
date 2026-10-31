"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { updateContentLearningTask } from "../learning-content-actions";
import { Check, ChevronDown, GraduationCap, Save } from "lucide-react";

type Interaction = { id: string; label: string; instruction?: string; custom?: boolean; discoveryTitle?: string; discoveryMessage?: string; discoveryCompetency?: string };
type InteractionAssessment = { assessedActions: string[]; acceptableActions: string[]; evidenceKey: string };
type Task = {
  purpose: string;
  learnerAction: string;
  interactions: Interaction[];
  feedback: string;
  successCriteria: string;
  assessment: InteractionAssessment;
};

const DEFAULT_INTERACTIONS: Interaction[] = [
  { id: "inspect_source", label: "Quelle ansehen", instruction: "Untersuche, wer die Aussage veröffentlicht hat und worauf sie sich stützt." },
  { id: "inspect_media", label: "Bild prüfen", instruction: "Prüfe Herkunft und Kontext des Bildes." },
  { id: "inspect_context", label: "Fakten & Kontext checken", instruction: "Prüfe, ob die Aussage belegt ist und im richtigen Zusammenhang steht." },
  { id: "inspect_profile", label: "Profil ansehen", instruction: "Sieh dir das Profil und seine bisherigen Beiträge kritisch an." },
  { id: "compare_information", label: "Informationen vergleichen", instruction: "Vergleiche die Aussage mit einer unabhängigen Information." },
  { id: "share", label: "Teilen", instruction: "Überlege, ob du den Beitrag weiterverbreiten würdest." },
  { id: "report", label: "Melden", instruction: "Entscheide, ob der Beitrag gegen Regeln verstößt und gemeldet werden sollte." },
  { id: "ignore", label: "Ignorieren", instruction: "Entscheide bewusst, ob du dem Beitrag keine weitere Aufmerksamkeit gibst." },
];
const ASSESSABLE_INTERACTIONS = new Set(DEFAULT_INTERACTIONS.map(item => item.id));
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export function ContentLearningTaskEditor({ scenarioId, contentItemId, initialTask }: { scenarioId: string; contentItemId: string; initialTask?: Partial<Task> | null }) {
  const [open, setOpen] = useState(Boolean(initialTask && Object.entries(initialTask).some(([key, value]) => key !== "assessment" && (Array.isArray(value) ? value.length > 0 : String(value ?? "").trim()))));
  const [task, setTask] = useState<Task>(() => {
    const saved = (initialTask ?? {}) as Partial<Task>;
    return {
      purpose: saved.purpose ?? "",
      learnerAction: saved.learnerAction ?? "",
      interactions: DEFAULT_INTERACTIONS.map(base => { const prior = (saved.interactions ?? []).find(entry => entry.id === base.id || (base.id === "inspect_context" && entry.id === "fact_check")); return { ...base, discoveryMessage: prior?.discoveryMessage ?? "" }; }),
      feedback: saved.feedback ?? "",
      successCriteria: saved.successCriteria ?? "",
      assessment: {
        assessedActions: Array.isArray((saved as any).assessment?.assessedActions) ? (saved as any).assessment.assessedActions : [],
        acceptableActions: Array.isArray((saved as any).assessment?.acceptableActions) ? (saved as any).assessment.acceptableActions : [],
        evidenceKey: typeof (saved as any).assessment?.evidenceKey === "string" ? (saved as any).assessment.evidenceKey : "in_feed_decision",
      },
    };
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const assessableSelected = DEFAULT_INTERACTIONS;

  const assessmentCount = task.assessment.assessedActions.length;

  function update<K extends keyof Task>(key: K, value: Task[K]) {
    setTask(current => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }

  function setAssessed(actionId: string, checked: boolean) {
    const assessedActions = checked
      ? Array.from(new Set([...task.assessment.assessedActions, actionId]))
      : task.assessment.assessedActions.filter(id => id !== actionId);
    update("assessment", {
      ...task.assessment,
      assessedActions,
      acceptableActions: checked
        ? task.assessment.acceptableActions
        : task.assessment.acceptableActions.filter(id => id !== actionId),
    });
  }

  function setAcceptable(actionId: string, checked: boolean) {
    const acceptableActions = checked
      ? Array.from(new Set([...task.assessment.acceptableActions, actionId]))
      : task.assessment.acceptableActions.filter(id => id !== actionId);
    const assessedActions = checked
      ? Array.from(new Set([...task.assessment.assessedActions, actionId]))
      : task.assessment.assessedActions;
    update("assessment", { ...task.assessment, assessedActions, acceptableActions });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await updateContentLearningTask(scenarioId, contentItemId, {
          ...task,
          interactions: task.interactions,
          interactionType: "reflect",
          expectedResponse: "",
          evaluationMethod: "criteria",
          assessment: task.assessment,
        } as any);
        setMessage("Gespeichert");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-violet-50/60 sm:p-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><GraduationCap className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-base font-bold text-slate-950">Lernaufgabe &amp; Interaktionen</span>
            <span className="mt-0.5 block text-xs text-slate-500">Was können Lernende tun – und welche Reaktionen zeigen den Lernerfolg?</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form onSubmit={submit} className="space-y-5 border-t border-slate-100 p-4 sm:p-5">
          <div className="rounded-2xl border border-slate-200 p-3 sm:p-4">
            <h3 className="text-sm font-bold text-slate-900">1. Fester Aktionskatalog im Player</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Alle acht Aktionen stehen bei jedem vergleichbaren Beitrag zur Verfügung. Hier kannst du sie nicht aktivieren oder entfernen. Du formulierst nur die pädagogische Rückmeldung, die nach einer als angemessen bewerteten Aktion erscheint.</p>
            <div className="mt-3 space-y-3">
              {DEFAULT_INTERACTIONS.map(base => {
                const item = task.interactions.find(entry => entry.id === base.id) ?? base;
                return <label key={base.id} className="block rounded-xl border border-slate-200 bg-white p-3">
                  <span className="block text-sm font-semibold text-slate-800">{base.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{base.instruction}</span>
                  <textarea className={inputClass} rows={2} value={item.discoveryMessage ?? ""} onChange={event => update("interactions", DEFAULT_INTERACTIONS.map(entry => entry.id === base.id ? { ...entry, discoveryMessage: event.target.value } : (task.interactions.find(old => old.id === entry.id) ?? entry)))} placeholder="Lernbestätigung, die nach einer passenden Aktion erscheint (optional)." />
                </label>;
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><GraduationCap className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">2. Lernnachweis im Hintergrund</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">Markiere, welche Aktionen bewertet werden und welche davon als angemessene Reaktion gelten. Lernende sehen davon nichts – der Player erfasst die Aktion automatisch.</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800">{assessmentCount} bewertet</span>
            </div>

            {assessableSelected.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_76px_92px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid-cols-[minmax(0,1fr)_100px_120px]">
                  <span>Aktion</span><span className="text-center">Bewerten</span><span className="text-center">Akzeptabel</span>
                </div>
                {assessableSelected.map(item => {
                  const assessed = task.assessment.assessedActions.includes(item.id);
                  const acceptable = task.assessment.acceptableActions.includes(item.id);
                  return (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_76px_92px] items-center gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_100px_120px]">
                      <span className="min-w-0 text-sm font-semibold text-slate-800">{item.label}</span>
                      <label className="flex cursor-pointer items-center justify-center gap-1.5 text-[11px] text-slate-600">
                        <input type="checkbox" checked={assessed} onChange={event => setAssessed(item.id, event.target.checked)} className="h-4 w-4 accent-violet-600" />
                        <span className="sr-only sm:not-sr-only">Bewerten</span>
                      </label>
                      <label className="flex cursor-pointer items-center justify-center gap-1.5 text-[11px] text-slate-600">
                        <input type="checkbox" checked={acceptable} disabled={!assessed} onChange={event => setAcceptable(item.id, event.target.checked)} className="h-4 w-4 accent-violet-600 disabled:opacity-40" />
                        <span className="sr-only sm:not-sr-only">Akzeptabel</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-white/70 p-3 text-xs text-slate-600">Wähle in der Liste oben aus, welche Aktionen als Lernnachweis bewertet werden sollen.</p>
            )}

            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">„Bewerten“ erfasst die Entscheidung. „Akzeptabel“ kennzeichnet eine angemessene Reaktion. Nicht akzeptable bewertete Aktionen werden als „noch nicht erreicht“ dokumentiert.</p>
          </div>

          <div className="rounded-xl border border-slate-200">
            <button type="button" onClick={() => setShowAdvanced(value => !value)} aria-expanded={showAdvanced} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold text-slate-700">
              Weitere Einstellungen <ChevronDown className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
            {showAdvanced && (
              <div className="space-y-3 border-t border-slate-100 p-3">
                <label className="block text-xs font-semibold text-slate-700">Redaktioneller Lernkontext <span className="font-normal text-slate-400">(optional)</span>
                  <textarea className={inputClass} rows={2} value={task.purpose} onChange={event => update("purpose", event.target.value)} placeholder="Welcher Aspekt soll mit diesem Beitrag sichtbar werden?" />
                </label>

              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="min-w-0">
              {message && <span role="status" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Check className="h-4 w-4" />{message}</span>}
              {error && <span role="alert" className="text-xs font-semibold text-red-600">{error}</span>}
            </div>
            <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50">
              <Save className="h-4 w-4" /> {pending ? "Speichert …" : "Änderungen speichern"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
