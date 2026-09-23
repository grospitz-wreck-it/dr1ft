"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const ACTOR_TYPES = ["person", "creator", "news_outlet", "brand", "company", "organization", "community", "bot"] as const;
type ActorType = (typeof ACTOR_TYPES)[number];
function cleanHandle(value: string) { return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || "actor"; }
function list(value: FormDataEntryValue | null, max: number) { return String(value ?? "").split(",").map(v => v.trim()).filter(Boolean).slice(0, max); }

export async function updateNpcProfile(formData: FormData) {
  const supabase = supabaseServerClient();
  const id = String(formData.get("npcId") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 120);
  const handle = cleanHandle(String(formData.get("handle") ?? ""));
  const actorType = String(formData.get("actorType") ?? "person") as ActorType;
  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = ageRaw ? Math.min(99, Math.max(12, Number(ageRaw) || 14)) : null;
  const interestKeys = list(formData.get("interestKeys"), 3);
  const moduleIds = list(formData.get("moduleIds"), 20);
  const keywords = list(formData.get("keywords"), 12);
  const context = String(formData.get("context") ?? "").trim().slice(0, 3000);

  if (!id) throw new Error("Akteur-ID fehlt.");
  if (!displayName) throw new Error("Bitte einen Namen angeben.");
  if (!ACTOR_TYPES.includes(actorType)) throw new Error("Ungültiger Akteur-Typ.");
  if (interestKeys.length !== 3) throw new Error("Bitte genau 3 Interessen auswählen.");
  if (!keywords.length) throw new Error("Mindestens ein Stichwort fehlt.");
  if (!moduleIds.length) throw new Error("Bitte mindestens ein Modul auswählen.");

  const [{ data: interests, error: interestError }, { data: modules, error: moduleError }] = await Promise.all([
    supabase.from("ambient_interests").select("key, label").in("key", interestKeys),
    supabase.from("scenarios").select("id").in("id", moduleIds),
  ]);
  if (interestError) throw new Error(interestError.message);
  if (moduleError) throw new Error(moduleError.message);
  if ((interests ?? []).length !== 3) throw new Error("Mindestens ein ausgewähltes Interesse ist nicht mehr verfügbar.");
  if ((modules ?? []).length !== moduleIds.length) throw new Error("Mindestens ein ausgewähltes Modul ist nicht verfügbar.");

  const { error } = await supabase.from("actor_profiles").update({
    display_name: displayName,
    handle,
    actor_type: actorType,
    age: actorType === "person" || actorType === "creator" ? age : null,
    keywords,
    context,
    interests: interestKeys.map(key => interests?.find(i => i.key === key)?.label ?? key),
    interest_keys: interestKeys,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  const { error: deleteError } = await supabase.from("npc_module_assignments").delete().eq("actor_id", id);
  if (deleteError) throw new Error(deleteError.message);
  const { error: assignmentError } = await supabase.from("npc_module_assignments").insert(moduleIds.map(scenario_id => ({ actor_id: id, npc_id: id, scenario_id })));
  if (assignmentError) throw new Error(assignmentError.message);

  revalidatePath("/npc-generator");
}
