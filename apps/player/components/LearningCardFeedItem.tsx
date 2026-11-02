"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Circle, Heart, Layers3, RotateCcw, Search, Smartphone, Sparkles } from "lucide-react";
import { submitScenarioLearningCard } from "../app/feed/learning-card-actions";

type Outcome = "success" | "partial" | "not_yet";
type LearningOption = { id: string; label: string };
export type PlayerLearningCard = {
  id: string; scenarioId: string; scenarioTitle: string; type: string; title: string;
  prompt: string; position: "before_feed" | "feed_end"; objective: string;
  objectiveId: string; required: boolean; options: LearningOption[];
};
const OUTCOME_COPY: Record<Outcome, { title: string; message: string }> = {
  success: { title: "Stark erkannt!", message: "Deine Antwort wurde gespeichert und als passende Entscheidung bewertet." },
  partial: { title: "Guter Ansatz!", message: "Deine Antwort wurde gespeichert. Ein weiterer Blickwinkel kann deine Einschätzung noch stärken." },
  not_yet: { title: "Hier steckt eine Lernchance.", message: "Deine Antwort wurde gespeichert. Prüfe noch einmal, welche Folgen deine Entscheidung haben könnte." },
};

export function LearningCardFeedItem({ card, classInstanceId }: { card: PlayerLearningCard; classInstanceId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const result = outcome ? OUTCOME_COPY[outcome] : null;
  const typeLabel = card.type === "knowledge_check" ? "Wissenscheck" : card.type === "reflection" ? "Reflexion" : card.type === "mission_completion" ? "Mission" : "Entscheidung";
  function submit() {
    if (!selected || busy) return;
    setError("");
    startTransition(async () => {
      try {
        const saved = await submitScenarioLearningCard({ classInstanceId, scenarioId: card.scenarioId, cardId: card.id, optionId: selected });
        if ("error" in saved) { setError(saved.error); return; }
        setOutcome(saved.outcome);
      } catch (e) { setError(e instanceof Error ? e.message : "Die Antwort konnte nicht gespeichert werden."); }
    });
  }
  return (
    <article className="learning-card-feed relative isolate overflow-hidden rounded-[28px] border shadow-[0_18px_48px_rgba(91,55,150,.13)]">
      <div className="learning-card-art relative overflow-hidden px-5 pb-5 pt-4 sm:px-6 sm:pt-5">
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-fuchsia-300/30 blur-2xl"/>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-8 h-40 w-56 rounded-full bg-sky-300/30 blur-2xl"/>
        <div className="relative flex items-center justify-between gap-3">
          <span className="learning-card-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold"><span className="learning-card-chip-icon grid h-7 w-7 place-items-center rounded-full"><Layers3 className="h-4 w-4"/></span>Lernkarte</span>
          {card.required && <span className="learning-card-required rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em]">Aufgabe</span>}
        </div>
        <div className="relative mt-4 flex min-h-[116px] items-center justify-between gap-3">
          <div className="min-w-0 max-w-[68%]"><p className="learning-card-eyebrow text-[10px] font-bold uppercase tracking-[.18em]">{typeLabel}{card.scenarioTitle ? " · " + card.scenarioTitle : ""}</p><h2 className="learning-card-title mt-2 font-display text-[25px] font-bold leading-[1.08] tracking-[-.04em] sm:text-[30px]">{card.title}</h2></div>
          <div aria-hidden="true" className="learning-card-illustration relative grid h-[112px] w-[112px] shrink-0 place-items-center rounded-[30px]"><div className="absolute inset-3 rotate-[-9deg] rounded-[22px] border border-white/70 bg-white/55 shadow-lg backdrop-blur-sm"/><Smartphone className="relative z-[1] h-12 w-12 -rotate-6"/><span className="absolute -right-1 top-2 z-[2] grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg"><Search className="h-5 w-5"/></span><span className="absolute -bottom-1 left-1 z-[2] grid h-8 w-8 place-items-center rounded-full bg-white text-pink-500 shadow-md"><Heart className="h-4 w-4 fill-current"/></span><Sparkles className="absolute -left-1 top-1 h-5 w-5 text-amber-400"/></div>
        </div>
        <p className="learning-card-prompt relative mt-2 max-w-2xl text-sm leading-6 sm:text-[15px]">{card.prompt}</p>
      </div>
      <div className="learning-card-body px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
        {card.objective && <div className="learning-card-objective mb-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-5"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0"/><span><strong>Dein Lernziel:</strong> {card.objective}</span></div>}
        <fieldset disabled={!!outcome || busy} className="space-y-2.5"><legend className="learning-card-legend mb-2 text-xs font-bold uppercase tracking-[.12em]">Wie entscheidest du?</legend>
          {card.options.map((option,index)=>{const active=selected===option.id;return <label key={option.id} className={"learning-card-option flex min-h-[58px] cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm leading-5 transition-all sm:px-4 "+(active?"is-selected":"")}><input className="sr-only" type="radio" name={"learning-card-"+card.id} value={option.id} checked={active} onChange={()=>setSelected(option.id)}/><span className="learning-card-radio grid h-6 w-6 shrink-0 place-items-center rounded-full border-2">{active?<CheckCircle2 className="h-5 w-5"/>:<Circle className="h-5 w-5 opacity-35"/>}</span><span className="min-w-0 flex-1">{option.label}</span><span className="learning-card-option-index text-[10px] font-bold">{String(index+1).padStart(2,"0")}</span></label>;})}
        </fieldset>
        {error&&<p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        {outcome&&result&&<section aria-live="polite" className={"learning-card-result mt-4 rounded-2xl border p-4 "+(outcome==="success"?"is-success":outcome==="partial"?"is-partial":"is-retry")}><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70"><Sparkles className="h-4 w-4"/></span><div><p className="text-sm font-bold">{result.title}</p><p className="mt-1 text-sm leading-5 opacity-85">{result.message}</p></div></div><button type="button" onClick={()=>{setOutcome(null);setSelected(null);}} className="learning-card-retry mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold"><RotateCcw className="h-3.5 w-3.5"/>Noch einmal überlegen</button></section>}
        {!outcome?<button type="button" disabled={!selected||busy} onClick={submit} className="learning-card-submit mt-4 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45">{busy?"Wird gespeichert …":"Antwort abgeben"}<ArrowRight className="h-4 w-4"/></button>:<p className="learning-card-complete mt-3 flex items-center justify-center gap-2 text-xs font-semibold"><CheckCircle2 className="h-4 w-4"/>Antwort gespeichert</p>}
      </div>
    </article>
  );
}
