"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const DIMENSIONS = ["risk", "impulsivity", "social_pressure", "source_awareness", "difficulty"] as const;

function dimensions(formData: FormData) {
  const result: Record<string, number> = {};
  for (const key of DIMENSIONS) {
    const raw = String(formData.get(key) ?? "").trim();
    if (raw !== "") {
      const value = Number(raw);
      if (Number.isFinite(value)) result[key] = Math.max(-5, Math.min(5, value));
    }
  }
  return result;
}

export async function createInteractionProfile(formData: FormData) {
  const supabase = supabaseServerClient();
  const key = String(formData.get("key") ?? "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const label = String(formData.get("label") ?? "").trim();
  const interactionType = String(formData.get("interaction_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!key || !label || !interactionType) throw new Error("Key, Bezeichnung und Interaktion sind erforderlich.");

  const { error } = await supabase.from("interaction_profiles").insert({
    key, label, description, interaction_type: interactionType, dimensions: dimensions(formData), default_consequence: {}, is_active: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/interaction-profiles");
  revalidatePath("/modules");
}

export async function updateInteractionProfile(profileId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const label = String(formData.get("label") ?? "").trim();
  const interactionType = String(formData.get("interaction_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!label || !interactionType) throw new Error("Bezeichnung und Interaktion sind erforderlich.");

  const { error } = await supabase.from("interaction_profiles").update({
    label, description, interaction_type: interactionType, dimensions: dimensions(formData), updated_at: new Date().toISOString(),
  }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/interaction-profiles");
  revalidatePath("/modules");
}

export async function toggleInteractionProfile(profileId: string, nextActive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("interaction_profiles").update({ is_active: nextActive, updated_at: new Date().toISOString() }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/interaction-profiles");
  revalidatePath("/modules");
}
