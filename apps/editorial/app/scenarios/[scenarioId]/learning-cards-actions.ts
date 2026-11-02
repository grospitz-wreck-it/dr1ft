"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const CARD_TYPES = ["decision", "reflection", "knowledge_check", "mission_completion"] as const;
const CARD_POSITIONS = ["before_feed", "feed_end"] as const;

type LearningCard = {
  id: string;
  type: typeof CARD_TYPES[number];
  title: string;
  prompt: string;
  position: typeof CARD_POSITIONS[number];
  options: string[];
  required: boolean;
};

export async function createScenarioLearningCard(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const type = String(formData.get("type") ?? "decision");
  const position = String(formData.get("position") ?? "feed_end");
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const options = String(formData.get("options") ?? "").split("\n").map((value) => value.trim()).filter(Boolean).slice(0, 8);
  if (!CARD_TYPES.includes(type as any)) throw new Error("Ungültiger Kartentyp.");
  if (!CARD_POSITIONS.includes(position as any)) throw new Error("Ungültige Kartenposition.");
  if (!title || !prompt) throw new Error("Bitte Titel und Frage/Aufgabe ausfüllen.");
  if (options.length < 2) throw new Error("Bitte mindestens zwei Antwortmöglichkeiten angeben.");

  const { data: scenario, error: readError } = await supabase.from("scenarios").select("learning_cards").eq("id", scenarioId).single();
  if (readError) throw new Error(readError.message);
  const cards = Array.isArray(scenario?.learning_cards) ? scenario.learning_cards : [];
  const card: LearningCard = {
    id: crypto.randomUUID(),
    type: type as LearningCard["type"],
    title,
    prompt,
    position: position as LearningCard["position"],
    options,
    required: formData.get("required") === "on",
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
