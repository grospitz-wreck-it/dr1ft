"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildOverrides(formData: FormData): Record<string, number> {
  const fields = ["reward", "time_pressure", "emotion", "source_clarity", "social_pressure"];
  const result: Record<string, number> = {};
  for (const field of fields) {
    const value = numberOrNull(formData.get(field));
    if (value !== null) result[field] = Math.max(1, Math.min(5, value));
  }
  return result;
}

export async function createModule(formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ageRating = String(formData.get("ageRating") ?? "12_plus");
  if (!title) throw new Error("Titel darf nicht leer sein");

  const { error } = await supabase.from("scenarios").insert({
    slug: slugify(title) + "-" + Date.now().toString(36),
    title,
    description,
    age_rating: ageRating,
    is_active: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/modules");
}

export async function updateModule(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ageRating = String(formData.get("ageRating") ?? "12_plus");
  if (!title) throw new Error("Titel darf nicht leer sein");

  const { error } = await supabase.from("scenarios").update({
    title,
    description,
    age_rating: ageRating,
    updated_at: new Date().toISOString(),
  }).eq("id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/modules/${scenarioId}`);
  revalidatePath("/modules");
}

export async function toggleModule(scenarioId: string, nextActive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("scenarios").update({ is_active: nextActive, updated_at: new Date().toISOString() }).eq("id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/modules/${scenarioId}`);
  revalidatePath("/modules");
}

export async function createModuleBlock(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "post");
  const profileId = String(formData.get("interaction_profile_id") ?? "") || null;
  const techniqueRaw = String(formData.get("techniques") ?? "");
  const techniques = techniqueRaw.split(",").map((x) => x.trim()).filter(Boolean);
  const targetCompetencies = formData.getAll("target_competencies").map(String);
  const difficulty = Math.max(1, Math.min(5, Number(formData.get("difficulty") ?? 1)));
  const overrides = buildOverrides(formData);

  if (!title) throw new Error("Titel darf nicht leer sein");

  const { error } = await supabase.from("content_items").insert({
    type,
    scenario_id: scenarioId,
    title,
    body,
    manipulation_techniques: techniques,
    target_competencies: targetCompetencies,
    difficulty,
    age_rating: String(formData.get("ageRating") ?? "12_plus"),
    interaction_profile_id: profileId,
    interaction_overrides: overrides,
    status: "draft",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/modules/${scenarioId}`);
}

export async function updateModuleBlock(blockId: string, scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const profileId = String(formData.get("interaction_profile_id") ?? "") || null;
  const techniques = String(formData.get("techniques") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const targetCompetencies = formData.getAll("target_competencies").map(String);
  const difficulty = Math.max(1, Math.min(5, Number(formData.get("difficulty") ?? 1)));
  const overrides = buildOverrides(formData);

  if (!title) throw new Error("Titel darf nicht leer sein");

  const { error } = await supabase.from("content_items").update({
    title,
    body,
    manipulation_techniques: techniques,
    target_competencies: targetCompetencies,
    difficulty,
    age_rating: String(formData.get("ageRating") ?? "12_plus"),
    interaction_profile_id: profileId,
    interaction_overrides: overrides,
    updated_at: new Date().toISOString(),
  }).eq("id", blockId).eq("scenario_id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/modules/${scenarioId}`);
}

export async function toggleBlockLive(blockId: string, scenarioId: string, nextLive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("content_items").update({ status: nextLive ? "live" : "draft", updated_at: new Date().toISOString() }).eq("id", blockId).eq("scenario_id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/modules/${scenarioId}`);
}

export async function deleteModuleBlock(blockId: string, scenarioId: string) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("content_items").delete().eq("id", blockId).eq("scenario_id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/modules/${scenarioId}`);
}
