"use client";

import { useTransition } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, CircleAlert, Save } from "lucide-react";
import { updateLearningStep, moveLearningStep } from "../learning-step-actions";
import { runLearningDesignQa } from "../learning-design-qa-actions";

type Step = {
  id: string;
  step_index: number;
  title: string;
  description: string | null;
  pedagogical_function: string | null;
  bloom_level: string;
  experiential_phase: string;
  activity_type: string;
  narrative_role: string | null;
  social_pressure_level: number | null;
  reflection_prompt: string | null;
  creation_task: Record<string, unknown> | null;
  transfer_task: Record<string, unknown> | null;
  estimated_minutes: number;
  objective_ids: string[] | null;
  competency_ids: string[] | null;
  activity_config: Record<string, unknown> | null;
};

type Mapping = {
  id: string;
  framework: string;
  dimension_label: string | null;
  rationale: string | null;
  source_title: string | null;
  source_url: string | null;
};

const PHASE_LABELS: Record<string,string> = {
  concrete_experience: "Erleben",
  reflective_observation: "Reflektieren",
  abstract_conceptualization: "Verstehen",
  active_experimentation: "Ausprobieren",
};

const BLOOM_LABELS: Record<string,string> = {
  remember:"Erinnern", understand:"Verstehen", apply:"Anwenden", analyze:"Analysieren", evaluate:"Bewerten", create:"Erzeugen",
};

export function LearningStepEditor({
  scenarioId,
  designId,
  steps,
  mappings,
  competencyLabels,
  objectiveLabels,
}: {
  scenarioId: string;
  designId: string;
  steps: Step[];
  mappings: Mapping[];
  competencyLabels: Record<string,string>;
  objectiveLabels: Record<string,string>;
}) {
  const [busy, startTransition] = useTransition();

  function qa() {
    startTransition(async () => {
      await runLearningDesignQa(designId, scenarioId);
    });
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Phase 1 · Redaktion</div>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">Lernschritte bearbeiten</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">Jeder Lernschritt verbindet Lernziel, Aktivität, Evidenz und Transfer. Die Redaktion kann den KI-Entwurf vor der Freigabe verändern.</p>
        </div>
        <button type="button" disabled={busy} onClick={qa} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs font-semibold">
          <CircleAlert className="w-3.5 h-3.5" /> Pädagogische QA ausführen
        </button>
      </div>

      {mappings.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-800">Referenzmodelle</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {mappings.map((mapping) => (
              <a key={mapping.id} href={mapping.source_url || "#"} target={mapping.source_url ? "_blank" : undefined} rel="noreferrer" className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] hover:border-accent">
                <strong>{mapping.dimension_label || mapping.framework}</strong>
                {mapping.source_title ? <span className="text-slate-400 ml-1">· {mapping.source_title}</span> : null}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <details key={step.id} className="group rounded-2xl border border-slate-200 overflow-hidden" open={index === 0}>
            <summary className="list-none cursor-pointer px-4 py-3 bg-slate-50 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">{step.step_index}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{step.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{PHASE_LABELS[step.experiential_phase] || step.experiential_phase} · {BLOOM_LABELS[step.bloom_level] || step.bloom_level} · {step.estimated_minutes} Min.</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>

            <form action={updateLearningStep.bind(null, step.id, scenarioId)} className="p-4 grid lg:grid-cols-2 gap-3">
              <label className="text-xs text-slate-500 lg:col-span-2">Titel<input name="title" defaultValue={step.title} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label>
              <label className="text-xs text-slate-500 lg:col-span-2">Beschreibung<textarea name="description" defaultValue={step.description || ""} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label>
              <label className="text-xs text-slate-500 lg:col-span-2">Pädagogische Funktion<input name="pedagogical_function" defaultValue={step.pedagogical_function || ""} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label>

              <label className="text-xs text-slate-500">Bloom<select name="bloom_level" defaultValue={step.bloom_level} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="remember">Erinnern</option><option value="understand">Verstehen</option><option value="apply">Anwenden</option><option value="analyze">Analysieren</option><option value="evaluate">Bewerten</option><option value="create">Erzeugen</option></select></label>
              <label className="text-xs text-slate-500">Erfahrungsphase<select name="experiential_phase" defaultValue={step.experiential_phase} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="concrete_experience">Erleben</option><option value="reflective_observation">Reflektieren</option><option value="abstract_conceptualization">Verstehen</option><option value="active_experimentation">Ausprobieren</option></select></label>
              <label className="text-xs text-slate-500">Aktivität<select name="activity_type" defaultValue={step.activity_type} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{["experience","compare","investigate","decide","reflect","discuss","create","transfer","source_check","context_check","social_proof","simulation"].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
              <label className="text-xs text-slate-500">Dauer (Min.)<input name="estimated_minutes" type="number" min="0.5" step="0.5" defaultValue={step.estimated_minutes} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="text-xs text-slate-500">Narrative Rolle<input name="narrative_role" defaultValue={step.narrative_role || ""} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="text-xs text-slate-500">Sozialer Druck (0–5)<input name="social_pressure_level" type="number" min="0" max="5" defaultValue={step.social_pressure_level ?? 0} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>

              <div className="lg:col-span-2 rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-700">Zugeordnete Lernziele</div>
                <div className="mt-1 flex flex-wrap gap-1.5">{(step.objective_ids || []).map(id => <span key={id} className="rounded-md bg-white border border-slate-200 px-2 py-1 text-[10px]">{objectiveLabels[id] || id}</span>)}</div>
                <div className="text-[11px] font-semibold text-slate-700 mt-3">Kompetenzen</div>
                <div className="mt-1 flex flex-wrap gap-1.5">{(step.competency_ids || []).map(id => <span key={id} className="rounded-md bg-white border border-slate-200 px-2 py-1 text-[10px]">{competencyLabels[id] || id}</span>)}</div>
              </div>

              <label className="text-xs text-slate-500 lg:col-span-2">Reflection<textarea name="reflection_prompt" defaultValue={step.reflection_prompt || ""} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="text-xs text-slate-500">Creation (JSON)<textarea name="creation_task" defaultValue={JSON.stringify(step.creation_task || {}, null, 2)} rows={5} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[11px]" /></label>
              <label className="text-xs text-slate-500">Transfer (JSON)<textarea name="transfer_task" defaultValue={JSON.stringify(step.transfer_task || {}, null, 2)} rows={5} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[11px]" /></label>

              <div className="lg:col-span-2 flex flex-wrap justify-between gap-2 pt-2">
                <div className="flex gap-2">
                  <button type="button" disabled={busy || index === 0} onClick={() => startTransition(() => { void moveLearningStep(step.id, scenarioId, "up"); })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] disabled:opacity-30"><ArrowUp className="w-3 h-3" /> hoch</button>
                  <button type="button" disabled={busy || index === steps.length - 1} onClick={() => startTransition(() => { void moveLearningStep(step.id, scenarioId, "down"); })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] disabled:opacity-30"><ArrowDown className="w-3 h-3" /> runter</button>
                </div>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-[11px] font-semibold disabled:opacity-50"><Save className="w-3 h-3" /> Lernschritt speichern</button>
              </div>
            </form>
          </details>
        ))}
      </div>

      {steps.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Noch keine Lernschritte. Zuerst Learning Design erzeugen.</div>}

      <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3" /> KI-Entwurf bleibt Draft; QA ist ein Prüfhinweis und keine pädagogische Endfreigabe.
      </div>
    </section>
  );
}
