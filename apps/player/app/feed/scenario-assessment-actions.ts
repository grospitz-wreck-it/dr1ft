"use server";

import { supabaseServerClient } from "../../lib/supabaseServerClient";

export type ScenarioAssessmentResult = {
  status: "assessed" | "not_assessable" | "snapshot_missing" | "hidden" | string;
  percentage: number | null;
  required_count?: number;
  completed_count?: number;
  partial_count?: number;
  not_yet_count?: number;
  unobserved_count?: number;
  weighted_points?: number;
  total_weight?: number;
  snapshot_id?: string;
  completed_at?: string;
  message?: string;
};

type FinalizeResult =
  | { ok: true; scenarioId: string; result: ScenarioAssessmentResult }
  | { ok: false; scenarioId: string; error: string };

export async function finalizeScenarioAssessment(input: {
  classInstanceId: string;
  scenarioId: string;
}): Promise<FinalizeResult> {
  try {
    const supabase = supabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        scenarioId: input.scenarioId,
        error: "Bitte melde dich erneut an, bevor du das Szenario beendest.",
      };
    }

    const { data, error } = await supabase.rpc("finalize_scenario_assessment_v1", {
      p_class_instance_id: input.classInstanceId,
      p_scenario_id: input.scenarioId,
    });

    if (error) {
      console.error("[scenario-assessment] finalization failed", {
        code: error.code,
        message: error.message,
        scenarioId: input.scenarioId,
        classInstanceId: input.classInstanceId,
      });
      return {
        ok: false,
        scenarioId: input.scenarioId,
        error: "Dein Szenario-Ergebnis konnte gerade nicht gespeichert werden. Bitte versuche es erneut.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : data) as ScenarioAssessmentResult | null;
    if (!result || typeof result.status !== "string") {
      return {
        ok: false,
        scenarioId: input.scenarioId,
        error: "Die Datenbank hat kein gültiges Szenario-Ergebnis zurückgegeben.",
      };
    }

    return { ok: true, scenarioId: input.scenarioId, result };
  } catch (error) {
    console.error("[scenario-assessment] unexpected finalization error", error);
    return {
      ok: false,
      scenarioId: input.scenarioId,
      error: "Das Szenario konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.",
    };
  }
}

export type ScenarioAssessmentPreview = {
  status: string;
  completion_message: string;
};

export async function previewScenarioAssessment(input: {
  classInstanceId: string;
  scenarioId: string;
}): Promise<FinalizeResult & { result?: ScenarioAssessmentPreview }> {
  try {
    const supabase = supabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { ok: false, scenarioId: input.scenarioId, error: "Bitte melde dich erneut an." };
    }

    const { data, error } = await supabase.rpc("preview_scenario_assessment_v1", {
      p_class_instance_id: input.classInstanceId,
      p_scenario_id: input.scenarioId,
    });
    if (error) {
      console.error("[scenario-assessment] preview failed", {
        code: error.code, message: error.message, scenarioId: input.scenarioId,
      });
      return { ok: false, scenarioId: input.scenarioId, error: "Dein aktueller Bearbeitungsstand konnte nicht ermittelt werden." };
    }

    const result = (Array.isArray(data) ? data[0] : data) as ScenarioAssessmentPreview | null;
    if (!result || typeof result.status !== "string") {
      return { ok: false, scenarioId: input.scenarioId, error: "Die Vorschau lieferte kein gültiges Ergebnis." };
    }
    return { ok: true, scenarioId: input.scenarioId, result };
  } catch (error) {
    console.error("[scenario-assessment] unexpected preview error", error);
    return { ok: false, scenarioId: input.scenarioId, error: "Dein Bearbeitungsstand konnte gerade nicht ermittelt werden." };
  }
}
