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
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  let options: AssessedOption[];
  try { options = JSON.parse(String(formData.get("options") ?? "[]")); }
  catch { throw new Error("Bitte prüfe die Antwortmöglichkeiten."); }
  if (!CARD_TYPES.includes(type as any) || !CARD_POSITIONS.includes(position as any)) throw new Error("Ungültige Karteneinstellung.");
  if (!title || !prompt || !competencyId) throw new Error("Bitte fülle alle Pflichtfelder aus.");
  if (!Array.isArray(options) || options.length < 2 || options.length > 8 || options.some((option) => !option || typeof option.id !== "string" || typeof option.label !== "string" || !option.label.trim() || !["success","partial","not_yet"].includes(option.outcome))) throw new Error("Bitte mindestens zwei bewertete Antwortmöglichkeiten angeben.");

  const [{ data: scenario, error: scenarioError }, { data: competency, error: competencyError }, { data: missions, error: missionError }] = await Promise.all([
    supabase.from("scenarios").select("learning_cards").eq("id", scenarioId).single(),
    supabase.from("competencies").select("id,title").eq("id", competencyId).maybeSingle(),
    supabase.from("missions").select("target_competencies").eq("scenario_id", scenarioId),
  ]);
  if (scenarioError) throw new Error(scenarioError.message);
  if (competencyError) throw new Error(competencyError.message);
  if (missionError) throw new Error(missionError.message);
  if (!competency) throw new Error("Das ausgewählte Lernziel ist nicht verfügbar.");
  const assigned = new Set((missions ?? []).flatMap((mission: any) => Array.isArray(mission.target_competencies) ? mission.target_competencies : []));
  if (assigned.size > 0 && !assigned.has(competencyId)) throw new Error("Bitte wähle eine Zielkompetenz dieses Szenarios.");
  if (assigned.size === 0) throw new Error("Lege zuerst Zielkompetenzen für dieses Szenario fest.");
  const cards = Array.isArray(scenario?.learning_cards) ? scenario.learning_cards : [];
  const card = {
    id: crypto.randomUUID(), type, title, prompt, position,
    options: options.map(option => ({id:option.id,label:option.label.trim(),outcome:option.outcome})),
    required: formData.get("required") === "on",
    competencyId,
    competency: competency.title,
    evidenceKey: "learning_card:" + type + ":" + competencyId,
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
