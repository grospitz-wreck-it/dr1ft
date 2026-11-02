"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const CARD_TYPES = ["decision", "reflection", "knowledge_check", "mission_completion"] as const;
const CARD_POSITIONS = ["before_feed", "feed_end"] as const;
type AssessedOption = { id: string; label: string; outcome: "success" | "partial" | "not_yet" };

export async function createScenarioLearningCard(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const type = String(formData.get("type") ?? "decision");
  const position = String(formData.get("position") ?? "feed_end");
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const objectiveId = String(formData.get("objectiveId") ?? "").trim();
  let options: AssessedOption[];
  try { options = JSON.parse(String(formData.get("options") ?? "[]")); }
  catch { throw new Error("Bitte prüfe die Antwortmöglichkeiten."); }
  if (!CARD_TYPES.includes(type as any) || !CARD_POSITIONS.includes(position as any)) throw new Error("Ungültige Karteneinstellung.");
  if (!title || !prompt || !objectiveId) throw new Error("Bitte fülle alle Pflichtfelder aus.");
  if (!Array.isArray(options) || options.length < 2 || options.length > 8 || options.some((option) => !option || typeof option.id !== "string" || typeof option.label !== "string" || !option.label.trim() || !["success","partial","not_yet"].includes(option.outcome))) throw new Error("Bitte mindestens zwei bewertete Antwortmöglichkeiten angeben.");

  const [{ data: scenario, error: scenarioError }, { data: latestDesign, error: designError }] = await Promise.all([
    supabase.from("scenarios").select("learning_cards").eq("id", scenarioId).single(),
    supabase.from("learning_designs").select("id").eq("scenario_id", scenarioId).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (scenarioError) throw new Error(scenarioError.message);
  if (designError) throw new Error(designError.message);
  if (!latestDesign) throw new Error("Lege zuerst den Lernplan für dieses Szenario an.");
  const { data: objective, error: objectiveError } = await supabase
    .from("learning_objectives").select("id,title")
    .eq("id", objectiveId).eq("learning_design_id", latestDesign.id).maybeSingle();
  if (objectiveError) throw new Error(objectiveError.message);
  if (!objective) throw new Error("Bitte wähle ein Lernziel aus dem aktuellen Lernplan.");
  const cards = Array.isArray(scenario?.learning_cards) ? scenario.learning_cards : [];
  const card = {
    id: crypto.randomUUID(), type, title, prompt, position,
    options: options.map(option => ({id:option.id,label:option.label.trim(),outcome:option.outcome})),
    required: formData.get("required") === "on",
    objectiveId,
    objective: objective.title,
    evidenceKey: "learning_card:" + type + ":" + objectiveId,
  };
  const { error } = await supabase.from("scenarios").update({ learning_cards: [...cards, card] }).eq("id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath("/scenarios/" + scenarioId);
}

export async function deleteScenarioLearningCard(scenarioId: string, cardId: string) {
  const supabase = supabaseServerClient();
  const { data: scenario, error: readError } = await supabase.from("scenarios").select("learning_cards").eq("id", scenarioId).single();
  if (readError) throw new Error(readError.message);
  const cards = Array.isArray(scenario?.learning_cards) ? scenario.learning_cards : [];
  const { error } = await supabase.from("scenarios").update({ learning_cards: cards.filter((card: any) => card?.id !== cardId) }).eq("id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath("/scenarios/" + scenarioId);
}
