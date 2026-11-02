"use server";

import { supabaseServerClient } from "../../lib/supabaseServerClient";

export async function submitScenarioLearningCard(input: {
  classInstanceId: string;
  scenarioId: string;
  cardId: string;
  optionId: string;
}) {
  const supabase = supabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Bitte melde dich erneut an.");

  const { data, error } = await supabase.rpc("submit_scenario_learning_card", {
    p_class_instance_id: input.classInstanceId,
    p_scenario_id: input.scenarioId,
    p_card_id: input.cardId,
    p_option_id: input.optionId,
  });
  if (error) throw new Error(error.message || "Die Antwort konnte nicht gespeichert werden.");
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || !["success", "partial", "not_yet"].includes(result.outcome)) {
    throw new Error("Die Antwort wurde nicht eindeutig ausgewertet.");
  }
  return { outcome: result.outcome as "success" | "partial" | "not_yet", evidenceEventsCreated: Number(result.evidence_events_created ?? 0) };
}
