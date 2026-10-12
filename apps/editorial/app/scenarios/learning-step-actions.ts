"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

const BLOOM = new Set(["remember","understand","apply","analyze","evaluate","create"]);
const PHASES = new Set(["concrete_experience","reflective_observation","abstract_conceptualization","active_experimentation"]);
const ACTIVITIES = new Set(["experience","compare","investigate","decide","reflect","discuss","create","transfer","source_check","context_check","social_proof","simulation"]);

function parseJsonObject(value: FormDataEntryValue | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function updateLearningStep(stepId: string, scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const bloom = String(formData.get("bloom_level") || "understand");
  const phase = String(formData.get("experiential_phase") || "concrete_experience");
  const activity = String(formData.get("activity_type") || "experience");
  if (!BLOOM.has(bloom) || !PHASES.has(phase) || !ACTIVITIES.has(activity)) {
    throw new Error("Ungültige Lernschritt-Konfiguration.");
  }

  const { data: step, error: loadError } = await supabase
    .from("learning_steps")
    .select("id,learning_design_id")
    .eq("id", stepId)
    .single();
  if (loadError || !step) throw new Error(loadError?.message ?? "Lernschritt nicht gefunden.");

  const { error } = await supabase
    .from("learning_steps")
    .update({
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      pedagogical_function: String(formData.get("pedagogical_function") || "").trim(),
      bloom_level: bloom,
      experiential_phase: phase,
      activity_type: activity,
      narrative_role: String(formData.get("narrative_role") || "").trim(),
      social_pressure_level: Math.min(5, Math.max(0, Number(formData.get("social_pressure_level") || 0))),
      reflection_prompt: String(formData.get("reflection_prompt") || "").trim() || null,
      creation_task: parseJsonObject(formData.get("creation_task")),
      transfer_task: parseJsonObject(formData.get("transfer_task")),
      estimated_minutes: Math.max(0.5, Number(formData.get("estimated_minutes") || 1)),
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", stepId);

  if (error) throw new Error(error.message);
  revalidatePath("/scenarios/" + scenarioId);
}

export async function moveLearningStep(stepId: string, scenarioId: string, direction: "up" | "down") {
  const supabase = supabaseServerClient();
  const { data: current, error } = await supabase
    .from("learning_steps")
    .select("id,step_index,learning_design_id,story_arc_id")
    .eq("id", stepId)
    .single();
  if (error || !current) throw new Error(error?.message ?? "Lernschritt nicht gefunden.");

  const targetIndex = current.step_index + (direction === "up" ? -1 : 1);
  if (targetIndex < 1) return;

  const { data: target } = await supabase
    .from("learning_steps")
    .select("id,step_index")
    .eq("learning_design_id", current.learning_design_id)
    .eq("step_index", targetIndex)
    .maybeSingle();
  if (!target) return;

  const temporaryIndex = 1000 + Math.floor(Math.random() * 1000);
  const { error: firstError } = await supabase.from("learning_steps").update({ step_index: temporaryIndex }).eq("id", current.id);
  if (firstError) throw new Error(firstError.message);

  const { error: secondError } = await supabase.from("learning_steps").update({ step_index: current.step_index }).eq("id", target.id);
  if (secondError) throw new Error(secondError.message);

  const { error: thirdError } = await supabase.from("learning_steps").update({ step_index: targetIndex }).eq("id", current.id);
  if (thirdError) throw new Error(thirdError.message);

  const { data: links } = await supabase
    .from("learning_step_missions")
    .select("learning_step_id,mission_id")
    .in("learning_step_id", [current.id, target.id]);

  for (const link of links ?? []) {
    const newIndex = link.learning_step_id === current.id ? targetIndex : current.step_index;
    await supabase
      .from("story_arc_steps")
      .update({ order_index: newIndex })
      .eq("arc_id", current.story_arc_id)
      .eq("mission_id", link.mission_id);
  }

  revalidatePath("/scenarios/" + scenarioId);
}
