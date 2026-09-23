// apps/admin/app/missions/[scenarioId]/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../../lib/supabaseServerClient";

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Baut trigger_condition aus strukturierten Formularfeldern statt
 * Hand-JSON: Event-Auswahl, Zähler, kommagetrennte Technik-Filter.
 */
export async function createMission(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const event = String(formData.get("triggerEvent") ?? "PostViewed");
  const count = Number(formData.get("triggerCount") ?? 1);
  const techniqueFilterRaw = String(formData.get("techniqueFilter") ?? "");
  const techniqueFilter = techniqueFilterRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const reflectionContentId = String(formData.get("reflectionContentId") ?? "") || null;
  const targetCompetencies = formData.getAll("targetCompetencies").map(String);

  if (!title) throw new Error("Titel darf nicht leer sein");

  const triggerCondition: Record<string, unknown> = { event, count };
  if (techniqueFilter.length > 0) {
    triggerCondition.technique_filter = techniqueFilter;
  }

  const { error } = await supabase.from("missions").insert({
    scenario_id: scenarioId,
    slug: slugify(title) + "-" + Date.now().toString(36),
    title,
    description,
    trigger_condition: triggerCondition,
    target_competencies: targetCompetencies,
    reflection_content_id: reflectionContentId,
    status: "draft",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

/**
 * Missionen brauchen keinen vollen Redaktions-Workflow wie Content-Items
 * (die eigentliche Prüfung passiert am referenzierten Content) — hier
 * reicht ein einfacher draft/live-Schalter.
 */
export async function toggleMissionLive(missionId: string, scenarioId: string, nextLive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("missions")
    .update({ status: nextLive ? "live" : "draft" })
    .eq("id", missionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

export async function createArc(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Titel darf nicht leer sein");

  const { error } = await supabase.from("story_arcs").insert({
    scenario_id: scenarioId,
    slug: slugify(title) + "-" + Date.now().toString(36),
    title,
    description,
    status: "draft",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

export async function toggleArcLive(arcId: string, scenarioId: string, nextLive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("story_arcs")
    .update({ status: nextLive ? "live" : "draft" })
    .eq("id", arcId);

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

/**
 * Fügt eine Mission als nächsten Schritt einer Arc hinzu — order_index
 * wird automatisch als "ans Ende anhängen" berechnet, damit niemand
 * manuell Indizes vergeben muss.
 */
export async function addArcStep(
  arcId: string,
  scenarioId: string,
  missionId: string,
  delayHours: number
) {
  const supabase = supabaseServerClient();

  const { data: existingSteps } = await supabase
    .from("story_arc_steps")
    .select("order_index")
    .eq("arc_id", arcId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = existingSteps && existingSteps.length > 0 ? existingSteps[0].order_index + 1 : 0;

  const { error } = await supabase.from("story_arc_steps").insert({
    arc_id: arcId,
    mission_id: missionId,
    order_index: nextIndex,
    unlock_delay_hours: delayHours,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

export async function removeArcStep(stepId: string, scenarioId: string) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("story_arc_steps").delete().eq("id", stepId);
  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

/**
 * Vertauscht die Reihenfolge zweier benachbarter Schritte — die
 * einfachste Form von "Umsortieren" ohne Drag&Drop-Bibliothek.
 */
export async function swapArcSteps(
  scenarioId: string,
  stepA: { id: string; orderIndex: number },
  stepB: { id: string; orderIndex: number }
) {
  const supabase = supabaseServerClient();

  const { error: e1 } = await supabase
    .from("story_arc_steps")
    .update({ order_index: stepB.orderIndex })
    .eq("id", stepA.id);
  const { error: e2 } = await supabase
    .from("story_arc_steps")
    .update({ order_index: stepA.orderIndex })
    .eq("id", stepB.id);

  if (e1 || e2) throw new Error(e1?.message ?? e2?.message);
  revalidatePath(`/missions/${scenarioId}`);
}
