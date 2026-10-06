"use client";

import { useTransition } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, CircleAlert, Save } from "lucide-react";
import { updateLearningStep, moveLearningStep } from "../learning-step-actions";
import { updateLearningStepDesign } from "../learning-step-design-actions";
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

type Option = { id: string; title?: string; name?: string };

type EvidenceIndicator = {
  id: string;
  learning_step_id: string;
  competency_id: string | null;
  objective_id: string | null;
  code: string | null;
  title: string;
  description: string | null;
  dimension: string | null;
  evidence_type: string | null;
  positive_signal: Record<string, unknown> | null;
  negative_signal: Record<string, unknown> | null;
  confidence_weight: number | null;
  required: boolean | null;
};

type StepMapping = { learning_step_id: string; learning_objective_id?: string; competency_id?: string; mission_id?: string };
type ContentMapping = { learning_step_id: string; content_item_id: string; role: string; sort_order: number };

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
  availableObjectives,
  availableCompetencies,
  availableMissions,
  objectiveMappings,
  competencyMappings,
  missionMappings,
  evidenceIndicators,
  contentMappings,
  contentItems,
}: {
  scenarioId: string;
  designId: string;
  steps: Step[];
  mappings: Mapping[];
  competencyLabels: Record<string,string>;
  objectiveLabels: Record<string,string>;
  availableObjectives: Option[];
  availableCompetencies: Option[];
  availableMissions: Option[];
  objectiveMappings: StepMapping[];
  competencyMappings: StepMapping[];
  missionMappings: StepMapping[];
  evidenceIndicators: EvidenceIndicator[];
  contentMappings: ContentMapping[];
  contentItems: { id: string; body: string | null }[];
}) {
  const [busy, startTransition] = useTransition();

  function qa() {
    startTransition(async () => {
      await runLearningDesignQa(designId, scenarioId);
    });
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">Redaktion</div>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">Lernschritte</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">Prüfe den KI-Entwurf und ändere nur, was für den Unterricht wichtig ist. Pädagogische Details werden automatisch gepflegt.</p>
        </div>
        <button type="button" disabled={busy} onClick={qa} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs font-semibold">
          <CircleAlert className="w-3.5 h-3.5" /> Entwurf prüfen
        </button>
      </div>

      {mappings.length > 0 && (
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-700">Pädagogische Grundlagen <span className="font-normal text-slate-400">· Warum DR1FT so plant</span></summary>
          <div className="px-3 pb-3 flex flex-wrap gap-2">
            {mappings.map((mapping) => (
              <a key={mapping.id} href={mapping.source_url || "#"} target={mapping.source_url ? "_blank" : undefined} rel="noreferrer" className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] hover:border-accent">
                <strong>{mapping.dimension_label || mapping.framework}</strong>
                {mapping.source_title ? <span className="text-slate-400 ml-1">· {mapping.source_title}</span> : null}
              </a>
            ))}
          </div>
        </details>
      )}

      <div className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const objectiveIds = new Set([
            ...(Array.isArray(step.objective_ids) ? step.objective_ids : []),
            ...objectiveMappings.filter((m) => m.learning_step_id === step.id).map((m) => m.learning_objective_id).filter(Boolean) as string[],
          ]);
          const competencyIds = new Set([
            ...(Array.isArray(step.competency_ids) ? step.competency_ids : []),
            ...competencyMappings.filter((m) => m.learning_step_id === step.id).map((m) => m.competency_id).filter(Boolean) as string[],
          ]);
          const missionIds = new Set(missionMappings.filter((m) => m.learning_step_id === step.id).map((m) => m.mission_id).filter(Boolean) as string[]);
          const stepEvidence = evidenceIndicators.filter((item) => item.learning_step_id === step.id);
          const stepContent = contentMappings.filter((item) => item.learning_step_id === step.id);
          const contentPlan = Array.isArray(step.activity_config?.contentPlan) ? step.activity_config?.contentPlan : [];

          return (
            <details key={step.id} className="group rounded-2xl border border-slate-200 overflow-hidden" open={index === 0}>
              <summary className="list-none cursor-pointer px-4 py-3 bg-slate-50 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">{step.step_index}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{step.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{PHASE_LABELS[step.experiential_phase] || step.experiential_phase} · {BLOOM_LABELS[step.bloom_level] || step.bloom_level} · {step.estimated_minutes} Min.</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>

              <form action={updateLearningStep.bind(null, step.id, scenarioId)} className="p-4 space-y-4">
                <div className="grid lg:grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-slate-600 lg:col-span-2">
                    Was passiert hier?
                    <textarea name="description" defaultValue={step.description || ""} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <label className="text-xs font-medium text-slate-600 lg:col-span-2">
                    Titel
                    <input name="title" defaultValue={step.title} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Was sollen die Lernenden tun?
                    <select name="activity_type" defaultValue={step.activity_type} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {[
                        ["experience","Erleben"],
                        ["compare","Vergleichen"],
                        ["investigate","Untersuchen"],
                        ["decide","Entscheiden"],
                        ["reflect","Reflektieren"],
                        ["discuss","Diskutieren"],
                        ["create","Etwas erstellen"],
                        ["transfer","Auf eine neue Situation übertragen"],
                        ["source_check","Quelle prüfen"],
                        ["context_check","Kontext prüfen"],
                        ["social_proof","Reaktionen anderer einordnen"],
                        ["simulation","Situation durchspielen"],
                      ].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Wie lange?
                    <input name="estimated_minutes" type="number" min="0.5" step="0.5" defaultValue={step.estimated_minutes} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </label>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700">Was sollen die Lernenden dabei lernen?</div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {availableObjectives.map((objective) => (
                      <label key={objective.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                        <input type="checkbox" name="objective_id" value={objective.id} formNoValidate disabled className="mt-0.5" checked={objectiveIds.has(objective.id)} readOnly />
                        <span>{objective.title}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">Lernziele werden durch den Generator festgelegt. Änderungen erfolgen über die Zuordnungen weiter unten.</div>
                </div>

                <label className="text-xs font-medium text-slate-600">
                  Frage zur Reflexion
                  <textarea name="reflection_prompt" defaultValue={step.reflection_prompt || ""} rows={2} placeholder="Was sollen die Lernenden nach dieser Situation überlegen?" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                </label>

                <details className="rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-slate-700">Weitere pädagogische Details</summary>
                  <div className="p-3 grid lg:grid-cols-2 gap-3">
                    <label className="text-xs text-slate-500">Pädagogische Funktion<input name="pedagogical_function" defaultValue={step.pedagogical_function || ""} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label>
                    <label className="text-xs text-slate-500">Kognitive Anforderung (Bloom)<select name="bloom_level" defaultValue={step.bloom_level} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="remember">Erinnern</option><option value="understand">Verstehen</option><option value="apply">Anwenden</option><option value="analyze">Analysieren</option><option value="evaluate">Bewerten</option><option value="create">Erschaffen</option></select></label>
                    <label className="text-xs text-slate-500">Lernphase<select name="experiential_phase" defaultValue={step.experiential_phase} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="concrete_experience">Erleben</option><option value="reflective_observation">Reflektieren</option><option value="abstract_conceptualization">Verstehen</option><option value="active_experimentation">Ausprobieren</option></select></label>
                    <label className="text-xs text-slate-500">Rolle in der Geschichte<input name="narrative_role" defaultValue={step.narrative_role || ""} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
                    <label className="text-xs text-slate-500">Sozialer Druck (0–5)<input name="social_pressure_level" type="number" min="0" max="5" defaultValue={step.social_pressure_level ?? 0} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
                    <label className="text-xs text-slate-500">Eigene Aufgabe (JSON)<textarea name="creation_task" defaultValue={JSON.stringify(step.creation_task || {}, null, 2)} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[11px]" /></label>
                    <label className="text-xs text-slate-500">Transfer-Aufgabe (JSON)<textarea name="transfer_task" defaultValue={JSON.stringify(step.transfer_task || {}, null, 2)} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[11px]" /></label>
                  </div>
                </details>

                <div className="flex flex-wrap justify-between gap-2 pt-1">
                  <div className="flex gap-2">
                    <button type="button" disabled={busy || index === 0} onClick={() => startTransition(() => { void moveLearningStep(step.id, scenarioId, "up"); })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] disabled:opacity-30"><ArrowUp className="w-3 h-3" /> hoch</button>
                    <button type="button" disabled={busy || index === steps.length - 1} onClick={() => startTransition(() => { void moveLearningStep(step.id, scenarioId, "down"); })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] disabled:opacity-30"><ArrowDown className="w-3 h-3" /> runter</button>
                  </div>
                  <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-[11px] font-semibold disabled:opacity-50"><Save className="w-3 h-3" /> Schritt speichern</button>
                </div>
              </form>

              <details className="border-t border-slate-200 bg-slate-50">
                <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-slate-700">Zuordnungen & pädagogische Daten <span className="font-normal text-slate-400">· nur bei Bedarf bearbeiten</span></summary>
                <form action={updateLearningStepDesign.bind(null, step.id, scenarioId)} className="p-4 space-y-5">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Lernziele</div>
                    <div className="mt-2 grid sm:grid-cols-2 gap-2">
                      {availableObjectives.map((objective) => (
                        <label key={objective.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                          <input type="checkbox" name="objective_id" value={objective.id} defaultChecked={objectiveIds.has(objective.id)} className="mt-0.5" />
                          <span>{objective.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Kompetenzen</div>
                    <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {availableCompetencies.map((competency) => (
                        <label key={competency.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                          <input type="checkbox" name="competency_id" value={competency.id} defaultChecked={competencyIds.has(competency.id)} className="mt-0.5" />
                          <span>{competency.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Missionen</div>
                    <div className="mt-2 grid sm:grid-cols-2 gap-2">
                      {availableMissions.map((mission) => (
                        <label key={mission.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                          <input type="checkbox" name="mission_id" value={mission.id} defaultChecked={missionIds.has(mission.id)} className="mt-0.5" />
                          <span>{mission.title || mission.name || mission.id}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div><div className="text-xs font-semibold text-slate-800">Evidenz</div><div className="text-[11px] text-slate-500">Woran erkennt DR1FT, dass ein Lernziel erreicht wurde?</div></div>
                      <span className="text-[11px] text-slate-400">{stepEvidence.length} vorhanden</span>
                    </div>
                    <textarea name="evidence_indicators" defaultValue={JSON.stringify(stepEvidence.map((item) => ({ code:item.code,title:item.title,description:item.description,competency_id:item.competency_id,objective_id:item.objective_id,dimension:item.dimension,evidence_type:item.evidence_type,positive_signal:item.positive_signal||{},negative_signal:item.negative_signal||{},confidence_weight:item.confidence_weight??1,required:Boolean(item.required)})), null, 2)} rows={7} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[11px]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Content-Plan</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Welche Art von Inhalt wird für diesen Lernschritt benötigt?</div>
                    <textarea name="content_plan" defaultValue={JSON.stringify(contentPlan, null, 2)} rows={7} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[11px]" />
                  </div>
                  {stepContent.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Vorhandene Inhalte</div>
                      <div className="mt-2 space-y-1">{stepContent.map((link) => { const item = contentItems.find((candidate) => candidate.id === link.content_item_id); return <div key={link.content_item_id} className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-[11px] text-slate-600">{link.role} · {item?.body || link.content_item_id}</div>; })}</div>
                    </div>
                  )}
                  <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white px-3 py-2 text-[11px] font-semibold disabled:opacity-50"><Save className="w-3 h-3" /> Zuordnungen speichern</button>
                </form>
              </details>
            </details>
          );
        })}
      </div>

      {steps.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Noch keine Lernschritte. Zuerst Learning Design erzeugen.</div>}

      <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3" /> KI-Entwurf bleibt Draft; die Redaktion entscheidet über die Freigabe.
      </div>
    </section>
  );

}
