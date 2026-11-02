"use server";

import { supabaseServerClient } from "../../lib/supabaseServerClient";

type SubmitResult =
  | { ok: true; outcome: "success" | "partial" | "not_yet"; evidenceEventsCreated: number }
  | { ok: false; error: string };

export async function submitScenarioLearningCard(input: {
  classInstanceId: string;
  scenarioId: string;
  cardId: string;
  optionId: string;
}): Promise<SubmitResult> {
  try {
    const supabase = supabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) return { ok: false, error: `Anmeldung fehlgeschlagen: ${authError.message}` };
    if (!user) return { ok: false, error: "Bitte melde dich erneut an." };

    const { data, error } = await supabase.rpc("submit_scenario_learning_card", {
      p_class_instance_id: input.classInstanceId,
      p_scenario_id: input.scenarioId,
      p_card_id: input.cardId,
      p_option_id: input.optionId,
    });
    if (error) {
      console.error("[learning-card] RPC submit_scenario_learning_card failed", {
        code: error.code, message: error.message, details: error.details, hint: error.hint,
        classInstanceId: input.classInstanceId, scenarioId: input.scenarioId, cardId: input.cardId,
      });
      return { ok: false, error: `Speichern fehlgeschlagen (${error.code ?? "DB"}): ${error.message}` };
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result || !["success", "partial", "not_yet"].includes(result.outcome)) {
      return { ok: false, error: "Die Datenbank hat keine gültige Auswertung zurückgegeben." };
    }
    return {
      ok: true,
      outcome: result.outcome as "success" | "partial" | "not_yet",
      evidenceEventsCreated: Number(result.evidence_events_created ?? 0),
    };
  } catch (error) {
    console.error("[learning-card] Unexpected submission error", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unbekannter Serverfehler beim Speichern." };
  }
}
