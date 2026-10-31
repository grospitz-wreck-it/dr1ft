"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { updateContentLearningTask } from "../learning-content-actions";
import { Check, ChevronDown, GraduationCap, Save, Search, Image as ImageIcon, ShieldCheck, UserRound, ArrowLeftRight, Share2, Flag, CircleOff, MessageCircle } from "lucide-react";

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
const ACTION_ICONS: Record<string, typeof Search> = { inspect_source: Search, inspect_media: ImageIcon, inspect_context: ShieldCheck, inspect_profile: UserRound, compare_information: ArrowLeftRight, share: Share2, report: Flag, ignore: CircleOff };
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
  const [openFeedbackId, setOpenFeedbackId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const assessmentCount = task.assessment.assessedActions.length;
  const acceptableCount = task.assessment.acceptableActions.length;

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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-2xl text-xs leading-relaxed text-slate-500">Alle Aktionen sind im Player immer sichtbar. Hier legst du fest, welche davon als Lernnachweis zählen und wann Lernende eine Rückmeldung erhalten.</p>
              <div className="flex gap-2 text-[11px] font-bold">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">{assessmentCount} bewertet</span>
                {acceptableCount > 0 && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">{acceptableCount} passend</span>}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-emerald-50/30 p-3 sm:p-4">
              <div className="mb-2 hidden grid-cols-[minmax(180px,1fr)_110px_120px_44px] items-center gap-3 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 md:grid">
                <span>Aktion</span><span className="text-center">Lernnachweis</span><span className="text-center">Angemessen</span><span />
              </div>

              <div className="space-y-2">
                {DEFAULT_INTERACTIONS.map(item => {
                  const Icon = ACTION_ICONS[item.id] ?? MessageCircle;
                  const current = task.interactions.find(entry => entry.id === item.id) ?? item;
                  const assessed = task.assessment.assessedActions.includes(item.id);
                  const acceptable = task.assessment.acceptableActions.includes(item.id);
                  const feedbackOpen = openFeedbackId === item.id;
                  const hasFeedback = Boolean(current.discoveryMessage?.trim());

                  return (
                    <div key={item.id} className={`overflow-hidden rounded-2xl border transition ${assessed ? "border-violet-200 bg-white shadow-sm" : "border-slate-100 bg-white/70 hover:border-violet-100"}`}>
                      <div className="grid gap-2 px-3 py-3 md:grid-cols-[minmax(180px,1fr)_110px_120px_44px] md:items-center md:gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${assessed ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><Icon className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800">{item.label}</div>
                            <div className="mt-0.5 hidden text-[11px] leading-snug text-slate-400 sm:block">{item.instruction}</div>
                          </div>
                        </div>

                        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-violet-50 md:justify-center md:bg-transparent md:p-0">
                          <span className="md:hidden">Lernnachweis</span>
                          <input type="checkbox" checked={assessed} onChange={event => setAssessed(item.id, event.target.checked)} className="peer sr-only" />
                          <span className={`relative h-6 w-10 rounded-full transition ${assessed ? "bg-violet-500" : "bg-slate-200"} after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition ${assessed ? "after:translate-x-4" : ""}`} />
                        </label>

                        <label className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition md:justify-center md:bg-transparent md:p-0 ${assessed ? "cursor-pointer bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "cursor-not-allowed bg-slate-50 text-slate-400"}`}>
                          <span className="md:hidden">Angemessen</span>
                          <input type="checkbox" checked={acceptable} disabled={!assessed} onChange={event => setAcceptable(item.id, event.target.checked)} className="peer sr-only" />
                          <span className={`relative h-6 w-10 rounded-full transition ${acceptable ? "bg-emerald-500" : "bg-slate-200"} after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition ${acceptable ? "after:translate-x-4" : ""}`} />
                        </label>

                        <button type="button" onClick={() => setOpenFeedbackId(feedbackOpen ? null : item.id)} className={`grid h-9 w-full place-items-center rounded-xl border text-xs font-bold transition md:w-9 ${feedbackOpen || hasFeedback ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-400 hover:border-violet-200 hover:text-violet-600"}`} title="Lernreaktion bearbeiten">
                          <MessageCircle className="h-4 w-4" />
                          <span className="ml-2 md:hidden">Lernreaktion {hasFeedback ? "bearbeiten" : "hinzufügen"}</span>
                        </button>
                      </div>

                      {feedbackOpen && (
                        <div className="border-t border-violet-100 bg-violet-50/50 px-3 py-3 sm:px-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-violet-800"><MessageCircle className="h-4 w-4" /> Rückmeldung für „{item.label}“</div>
                          <p className="mt-1 text-[11px] text-slate-500">Diese Lernbestätigung erscheint nach einer als angemessen bewerteten Aktion.</p>
                          <textarea className="mt-2 w-full rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" rows={3} value={current.discoveryMessage ?? ""} onChange={event => update("interactions", task.interactions.map(entry => entry.id === item.id ? { ...entry, discoveryMessage: event.target.value } : entry))} placeholder="Zum Beispiel: Gute Entscheidung – so schützt du dich und andere im Netz." />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white/70 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> <b className="text-slate-700">Lernnachweis:</b> Aktion wird im Hintergrund bewertet.</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> <b className="text-slate-700">Angemessen:</b> Aktion erfüllt den Lernnachweis.</span>
                <span>Mehrere angemessene Aktionen sind möglich.</span>
              </div>
            </div>
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
