"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

function parseJsonArray(value: FormDataEntryValue | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function updateLearningStepDesign(
  stepId: string,
  scenarioId: string,
  formData: FormData
) {
  const supabase = supabaseServerClient();

  const objectiveIds = formData.getAll("objective_id").map(String).filter(Boolean);
  const competencyIds = formData.getAll("competency_id").map(String).filter(Boolean);
  const missionIds = formData.getAll("mission_id").map(String).filter(Boolean);
  const evidenceIndicators = parseJsonArray(formData.get("evidence_indicators"));
  const contentPlan = parseJsonArray(formData.get("content_plan"));

  const { data: step, error: stepError } = await supabase
    .from("learning_steps")
    .select("id,learning_design_id,activity_config")
    .eq("id", stepId)
    .single();

  if (stepError || !step) {
    throw new Error(stepError?.message ?? "Lernschritt nicht gefunden.");
  }

  const currentConfig =
    step.activity_config &&
    typeof step.activity_config === "object" &&
    !Array.isArray(step.activity_config)
      ? step.activity_config
      : {};

  const { error: stepUpdateError } = await supabase
    .from("learning_steps")
    .update({
      objective_ids: objectiveIds,
      competency_ids: competencyIds,
      activity_config: {
        ...currentConfig,
        contentPlan,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", stepId);

  if (stepUpdateError) throw new Error(stepUpdateError.message);

  await supabase.from("learning_step_objectives").delete().eq("learning_step_id", stepId);
  await supabase.from("learning_step_competencies").delete().eq("learning_step_id", stepId);
  await supabase.from("learning_step_missions").delete().eq("learning_step_id", stepId);
  await supabase.from("evidence_indicators").delete().eq("learning_step_id", stepId);

  if (objectiveIds.length) {
    const { error } = await supabase.from("learning_step_objectives").insert(
      objectiveIds.map((learning_objective_id) => ({
        learning_step_id: stepId,
        learning_objective_id,
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (competencyIds.length) {
    const { error } = await supabase.from("learning_step_competencies").insert(
      competencyIds.map((competency_id) => ({
        learning_step_id: stepId,
        competency_id,
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (missionIds.length) {
    const { error } = await supabase.from("learning_step_missions").insert(
      missionIds.map((mission_id) => ({
        learning_step_id: stepId,
        mission_id,
      }))
    );
    if (error) throw new Error(error.message);
  }

  const validEvidence = evidenceIndicators
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .filter((item) => String(item.title ?? "").trim());

  if (validEvidence.length) {
    const { error } = await supabase.from("evidence_indicators").insert(
      validEvidence.map((item) => ({
        learning_step_id: stepId,
        competency_id: String(item.competency_id || competencyIds[0] || "") || null,
        objective_id: String(item.objective_id || objectiveIds[0] || "") || null,
        code: String(item.code || "").trim() || null,
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim() || null,
        dimension: String(item.dimension || "behavior"),
        evidence_type: String(item.evidence_type || "observed_behavior"),
        positive_signal: item.positive_signal ?? {},
        negative_signal: item.negative_signal ?? {},
        confidence_weight: Number(item.confidence_weight || 1),
        required: Boolean(item.required),
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/scenarios/" + scenarioId);
}
