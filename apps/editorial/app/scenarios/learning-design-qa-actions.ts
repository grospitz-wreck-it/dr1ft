"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

type QaResult = {
  score: number;
  warnings: string[];
  checks: { label: string; ok: boolean }[];
};

export async function runLearningDesignQa(designId: string, scenarioId: string): Promise<QaResult> {
  const supabase = supabaseServerClient();
  const [{ data: design, error: designError }, { data: objectives }, { data: steps }] = await Promise.all([
    supabase.from("learning_designs").select("id,scenario_id,desired_results,acceptable_evidence,learning_experiences,pedagogical_warnings,source_notes").eq("id", designId).single(),
    supabase.from("learning_objectives").select("id,title,description,bloom_level").eq("learning_design_id", designId),
    supabase.from("learning_steps").select("id,title,description,bloom_level,activity_type,objective_ids,competency_ids,reflection_prompt,creation_task,transfer_task,estimated_minutes,activity_config").eq("learning_design_id", designId).order("step_index"),
  ]);
  if (designError || !design) throw new Error(designError?.message ?? "Learning Design nicht gefunden.");

  const stepIds = (steps ?? []).map((step) => step.id);
  const { data: evidence } = stepIds.length
    ? await supabase.from("evidence_indicators").select("id,learning_step_id").in("learning_step_id", stepIds)
    : { data: [] };

  const checks = [
    { label: "Lernziel vorhanden", ok: (objectives ?? []).length > 0 },
    { label: "Lernziele beobachtbar formuliert", ok: (objectives ?? []).every((o) => Boolean(o.description?.trim())) },
    { label: "Bloom-Level vorhanden", ok: (steps ?? []).length > 0 && (steps ?? []).every((s) => Boolean(s.bloom_level)) },
    { label: "Aktivität vorhanden", ok: (steps ?? []).length > 0 && (steps ?? []).every((s) => Boolean(s.activity_type)) },
    { label: "Evidenz vorhanden", ok: (evidence ?? []).length > 0 && (steps ?? []).every((s) => (evidence ?? []).some((e) => e.learning_step_id === s.id)) },
    { label: "Reflection vorhanden", ok: (steps ?? []).some((s) => Boolean(s.reflection_prompt?.trim())) },
    { label: "Transfer vorhanden", ok: (steps ?? []).some((s) => s.transfer_task && Object.keys(s.transfer_task ?? {}).length > 0) },
    { label: "Creation vorhanden", ok: (steps ?? []).some((s) => s.creation_task && Object.keys(s.creation_task ?? {}).length > 0) },
    { label: "Kompetenz-Mapping vorhanden", ok: (steps ?? []).some((s) => Array.isArray(s.competency_ids) && s.competency_ids.length > 0) },
    { label: "Content-Plan vorhanden", ok: (steps ?? []).some((s) => Array.isArray((s.activity_config as any)?.contentPlan) && (s.activity_config as any).contentPlan.length > 0) },
    { label: "Zieldauer plausibel", ok: (steps ?? []).length > 0 && (() => {
      const total = (steps ?? []).reduce((sum, s) => sum + Number(s.estimated_minutes || 0), 0);
      const target = Number((design.learning_experiences as any)?.durationMinutes || 0);
      return target <= 0 || (total >= target * 0.65 && total <= target * 1.35);
    })() },
    { label: "AI-Provenance vorhanden", ok: Boolean((design.source_notes ?? []).length) },
  ];

  const weights = [20, 10, 10, 15, 20, 10, 10, 5, 15, 10, 5, 5];
  const raw = checks.reduce((sum, check, index) => sum + (check.ok ? weights[index] : 0), 0);
  const max = weights.reduce((sum, value) => sum + value, 0);
  const score = Math.round((raw / max) * 100);

  const warnings = checks.filter((check) => !check.ok).map((check) => "⚠ " + check.label + " fehlt oder ist unvollständig.");
  const bloomWarnings = (steps ?? []).filter((step) => ["analyze", "evaluate", "create"].includes(step.bloom_level) && ["experience", "reflect"].includes(step.activity_type))
    .map((step) => "⚠ " + step.title + ": Bloom verlangt " + step.bloom_level + ", die Aktivität wirkt dafür zu niedrigschwellig.");
  warnings.push(...bloomWarnings);

  const uniqueWarnings = [...new Set(warnings)];
  const { error: updateError } = await supabase
    .from("learning_designs")
    .update({ alignment_score: score, pedagogical_warnings: uniqueWarnings, updated_at: new Date().toISOString() })
    .eq("id", designId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/scenarios/" + scenarioId);
  return { score, warnings: uniqueWarnings, checks };
}
