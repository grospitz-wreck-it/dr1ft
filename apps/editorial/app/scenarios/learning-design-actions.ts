// DR1FT — Scenario Learning Design Generator
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import type {
  BloomLevel,
  GeneratedLearningDesign,
  LearningDesignConfig,
} from "../../../packages/shared-types/src/learning-design";

const AGE_LABELS: Record<string, string> = {
  "9_11": "9–11 Jahre",
  "12_13": "12–13 Jahre",
  "14_15": "14–15 Jahre",
  "16_17": "16–17 Jahre",
  "18_plus": "18+ Jahre",
};

const BLOOM = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
const MODELS = ["backward_design", "constructive_alignment", "kolb"] as const;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    primaryLearningModel: { type: "string", enum: MODELS },
    bloomTarget: { type: "string", enum: BLOOM },
    desiredResults: {
      type: "object",
      properties: {
        knowledge: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        attitudes: { type: "array", items: { type: "string" } },
        behaviors: { type: "array", items: { type: "string" } },
        transfer: { type: "array", items: { type: "string" } },
      },
      required: ["knowledge", "skills", "attitudes", "behaviors", "transfer"],
    },
    acceptableEvidence: { type: "object" },
    learningExperiences: { type: "object" },
    objectives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          bloomLevel: { type: "string", enum: BLOOM },
          objectiveType: { type: "string", enum: ["knowledge", "skill", "attitude", "behavior", "creation", "transfer"] },
          priority: { type: "integer" },
          competencySlugs: { type: "array", items: { type: "string" } },
        },
        required: ["code", "title", "description", "bloomLevel", "objectiveType", "priority", "competencySlugs"],
      },
    },
    frameworkMappings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          objectiveCode: { type: "string" },
          framework: { type: "string", enum: ["baacke", "kmk", "digcomp", "bloom", "backward_design", "kolb", "constructive_alignment", "dr1ft"] },
          frameworkVersion: { type: "string" },
          dimensionKey: { type: "string" },
          dimensionLabel: { type: "string" },
          rationale: { type: "string" },
          sourceTitle: { type: "string" },
          sourceUrl: { type: "string" },
          sourceNote: { type: "string" },
        },
        required: ["framework", "dimensionKey", "dimensionLabel", "rationale"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepIndex: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          pedagogicalFunction: { type: "string" },
          experientialPhase: { type: "string", enum: ["concrete_experience", "reflective_observation", "abstract_conceptualization", "active_experimentation"] },
          bloomLevel: { type: "string", enum: BLOOM },
          learningPattern: { type: "string" },
          activityType: { type: "string", enum: ["experience", "compare", "investigate", "decide", "reflect", "discuss", "create", "transfer", "source_check", "context_check", "social_proof", "simulation"] },
          activityConfig: { type: "object" },
          objectiveCodes: { type: "array", items: { type: "string" } },
          competencySlugs: { type: "array", items: { type: "string" } },
          narrativeRole: { type: "string" },
          socialPressureLevel: { type: "integer", minimum: 0, maximum: 5 },
          expectedEvidence: { type: "object" },
          reflectionPrompt: { type: "string" },
          reflectionConfig: { type: "object" },
          creationTask: { type: "object" },
          transferTask: { type: "object" },
          estimatedMinutes: { type: "number" },
          missionTitle: { type: "string" },
          missionDescription: { type: "string" },
          triggerEvent: { type: "string", enum: ["PostViewed", "CommentCreated", "NpcReplySelected"] },
          contentPlan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["experience", "context", "evidence", "reflection", "social_proof", "source", "creation", "transfer", "setup", "ambient"] },
                format: { type: "string", enum: ["image_post", "text_post", "video_placeholder", "comment", "dm", "group_dialog", "source", "comparison", "profile", "recommendation_signal", "reflection_prompt", "creation_task"] },
                purpose: { type: "string" },
                orderIndex: { type: "integer" },
                required: { type: "boolean" },
                imageRequired: { type: "boolean" },
                imagePrompt: { type: "string" },
                imageAspectRatio: { type: "string" },
                textPrompt: { type: "string" },
                sourceRequirement: { type: "string" },
              },
              required: ["role", "format", "purpose", "orderIndex", "required", "imageRequired"],
            },
          },
          evidenceIndicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                dimension: { type: "string", enum: ["behavior", "reasoning", "reflection", "creation", "transfer"] },
                evidenceType: { type: "string" },
                positiveSignal: { type: "object" },
                negativeSignal: { type: "object" },
                confidenceWeight: { type: "number" },
                required: { type: "boolean" },
              },
              required: ["code", "title", "description", "dimension", "evidenceType", "positiveSignal", "negativeSignal", "confidenceWeight", "required"],
            },
          },
        },
        required: ["stepIndex", "title", "description", "pedagogicalFunction", "experientialPhase", "bloomLevel", "learningPattern", "activityType", "activityConfig", "objectiveCodes", "competencySlugs", "narrativeRole", "socialPressureLevel", "expectedEvidence", "estimatedMinutes", "missionTitle", "missionDescription", "triggerEvent", "contentPlan", "evidenceIndicators"],
      },
    },
    ambientRecipe: { type: "object" },
    pedagogicalWarnings: { type: "array", items: { type: "string" } },
    sourceNotes: { type: "array", items: { type: "string" } },
  },
  required: ["title", "description", "primaryLearningModel", "bloomTarget", "desiredResults", "acceptableEvidence", "learningExperiences", "objectives", "frameworkMappings", "steps", "ambientRecipe", "pedagogicalWarnings", "sourceNotes"],
};

async function geminiJson(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY ist zur Laufzeit nicht verfügbar.");

  const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
  let lastError = "unbekannter Fehler";

  for (const model of models) {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model,
        input: prompt,
        response_format: { type: "text", mime_type: "application/json", schema: SCHEMA },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });

    if (response.ok) {
      const data = await response.json();
      const raw =
        data.output_text ??
        data.output?.find?.((part: any) => part.type === "text")?.text ??
        data.steps?.filter?.((step: any) => step.type === "model_output")?.flatMap?.((step: any) => step.content ?? [])?.filter?.((part: any) => part.type === "text")?.map?.((part: any) => part.text)?.join?.("") ??
        "";
      try {
        return JSON.parse(String(raw).trim());
      } catch {
        lastError = "ungültiges JSON";
      }
    } else {
      const errorText = await response.text();
      lastError = "Gemini " + model + " (" + response.status + "): " + errorText.slice(0, 400);
      const retryable = response.status === 429 || response.status >= 500 || /high demand|temporar|overload|capacity|unavailable/i.test(errorText);
      if (!retryable) break;
    }
  }

  throw new Error("Learning-Design-Generierung fehlgeschlagen: " + lastError);
}

function normalizeConfig(input: LearningDesignConfig): LearningDesignConfig {
  return {
    durationMinutes: Math.min(120, Math.max(5, Math.round(Number(input.durationMinutes) || 25))),
    learningStepCount: Math.min(16, Math.max(3, Math.round(Number(input.learningStepCount) || 7))),
    primaryLearningModel: MODELS.includes(input.primaryLearningModel) ? input.primaryLearningModel : "backward_design",
    bloomTarget: BLOOM.includes(input.bloomTarget) ? input.bloomTarget : "evaluate",
    learningPattern: input.learningPattern?.trim() || undefined,
  };
}

export async function generateLearningDesign(scenarioId: string, rawConfig: LearningDesignConfig) {
  const config = normalizeConfig(rawConfig);
  const supabase = supabaseServerClient();

  const [{ data: scenario, error: scenarioError }, { data: competencies, error: competencyError }] = await Promise.all([
    supabase.from("scenarios").select("id,title,description,age_band,age_rating,primary_competency_id,secondary_competency_ids").eq("id", scenarioId).single(),
    supabase.from("competencies").select("id,slug,title,description").order("title"),
  ]);

  if (scenarioError || !scenario) throw new Error(scenarioError?.message ?? "Szenario konnte nicht geladen werden.");
  if (competencyError) throw new Error(competencyError.message);

  const selectedIds = [
    scenario.primary_competency_id,
    ...(Array.isArray(scenario.secondary_competency_ids) ? scenario.secondary_competency_ids : []),
  ].filter(Boolean);

  const selectedCompetencies = (competencies ?? []).filter((item) => selectedIds.includes(item.id));

  const prompt = [
    "Du bist die Learning-Design-Engine von DR1FT.",
    "",
    "Arbeite NICHT als reiner Content-Generator. Definiere zuerst Lernziel, Evidenz und Lernaktivität.",
    "",
    "SZENARIO:",
    "Titel: " + scenario.title,
    "Beschreibung: " + (scenario.description || "Keine Beschreibung."),
    "Altersgruppe: " + (AGE_LABELS[scenario.age_band] || scenario.age_band),
    "",
    "KONFIGURATION:",
    "Zieldauer: " + config.durationMinutes + " Minuten",
    "Lernschritte: EXAKT " + config.learningStepCount,
    "Learning Model: " + config.primaryLearningModel,
    "Bloom-Ziel: " + config.bloomTarget,
    "Learning Pattern: " + (config.learningPattern || "selbst wählen"),
    "",
    "KOMPETENZEN:",
    JSON.stringify(selectedCompetencies),
    "",
    "VERBINDLICHE REIHENFOLGE:",
    "Desired Results → Objectives → Competency → Framework Mapping → Bloom → Learning Pattern → Experience → Action → Consequence → Reflection → Evidence → Creation → Transfer",
    "",
    "BACKWARD DESIGN:",
    "1. Was soll die Person am Ende können?",
    "2. Woran erkennen wir das?",
    "3. Welche Erfahrung erzeugt diese Evidenz?",
    "",
    "CONSTRUCTIVE ALIGNMENT: Outcome ↔ Activity ↔ Evidence.",
    "KOLB: Concrete Experience → Reflective Observation → Abstract Conceptualization → Active Experimentation.",
    "BLOOM: Die Aktivität darf nicht unterhalb des geforderten kognitiven Niveaus liegen.",
    "",
    "CONTENT PLANNING:",
    "Erzeuge nicht einfach Posts. Für jeden Lernschritt muss jedes Content-Format eine pädagogische oder dramaturgische Funktion haben.",
    "Wenn imageRequired=true, muss imagePrompt konkret und reproduzierbar sein.",
    "Ein Bild ist niemals nur Dekoration.",
    "",
    "AMBIENT:",
    "Ambient ist Weltmaterial und nicht automatisch eine Lernaufgabe. Erzeuge eine Ambient Recipe mit density, topics, media, tone, age_band, interests, narrative_presence und scenario_relevance.",
    "",
    "EVIDENCE:",
    "Mission completion allein ist KEIN Kompetenznachweis. Evidence muss Verhalten, Reasoning, Reflection, Creation oder Transfer beobachtbar machen.",
    "",
    "QA:",
    "Liefere konkrete pedagogicalWarnings für fehlendes Alignment, fehlende Evidenz, fehlende Reflexion, fehlenden Transfer, falsche Bloom-Aktivität oder zu viel Learning Content.",
    "",
    "WICHTIG:",
    "Liefere EXAKT " + config.learningStepCount + " Lernschritte.",
    "Die Summe der estimatedMinutes soll ungefähr " + config.durationMinutes + " Minuten ergeben.",
    "Redaktioneller Begriff: Lernschritte. Nicht Abläufe.",
    "Keine erfundenen Kompetenz-Slugs. Nutze nur die gelieferten.",
    "Alles bleibt Draft.",
    "Nur valides JSON gemäß Schema.",
  ].join("\n");

  const draft = (await geminiJson(prompt)) as GeneratedLearningDesign;
  if (!Array.isArray(draft.steps) || draft.steps.length !== config.learningStepCount) {
    throw new Error("Die KI lieferte nicht exakt " + config.learningStepCount + " Lernschritte.");
  }

  const validCompetencies = new Set((competencies ?? []).map((item) => item.slug));
  for (const objective of draft.objectives ?? []) {
    objective.competencySlugs = (objective.competencySlugs ?? []).filter((slug) => validCompetencies.has(slug));
  }
  for (const step of draft.steps) {
    step.competencySlugs = (step.competencySlugs ?? []).filter((slug) => validCompetencies.has(slug));
  }

  const { data: previous } = await supabase
    .from("learning_designs")
    .select("version")
    .eq("scenario_id", scenarioId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = Number(previous?.version ?? 0) + 1;

  let { data: arc } = await supabase
    .from("story_arcs")
    .select("id")
    .eq("scenario_id", scenarioId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!arc) {
    const { data: createdArc, error } = await supabase
      .from("story_arcs")
      .insert({
        scenario_id: scenarioId,
        slug: "learning-design-" + crypto.randomUUID().slice(0, 8),
        title: draft.title,
        description: draft.description,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !createdArc) throw new Error(error?.message ?? "Story Arc konnte nicht angelegt werden.");
    arc = createdArc;
  }

  const { data: design, error: designError } = await supabase
    .from("learning_designs")
    .insert({
      scenario_id: scenarioId,
      version,
      status: "draft",
      title: draft.title,
      description: draft.description,
      primary_learning_model: draft.primaryLearningModel,
      bloom_target: draft.bloomTarget,
      desired_results: draft.desiredResults,
      acceptable_evidence: draft.acceptableEvidence,
      learning_experiences: draft.learningExperiences,
      alignment_score: null,
      pedagogical_warnings: draft.pedagogicalWarnings ?? [],
      generated_by: "scenario-studio-learning-design-v1",
      source_notes: draft.sourceNotes ?? [],
    })
    .select("id")
    .single();

  if (designError || !design) throw new Error(designError?.message ?? "Learning Design konnte nicht gespeichert werden.");

  const objectiveIds = new Map<string, string>();

  for (const objective of draft.objectives ?? []) {
    const { data: row, error } = await supabase
      .from("learning_objectives")
      .insert({
        learning_design_id: design.id,
        objective_code: objective.code,
        title: objective.title,
        description: objective.description,
        bloom_level: objective.bloomLevel,
        objective_type: objective.objectiveType,
        priority: objective.priority,
      })
      .select("id")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Lernziel konnte nicht gespeichert werden.");
    objectiveIds.set(objective.code, row.id);

    const links = (competencies ?? [])
      .filter((item) => objective.competencySlugs?.includes(item.slug))
      .map((item) => ({
        learning_objective_id: row.id,
        competency_id: item.id,
        role: "primary",
        weight: 1,
      }));

    if (links.length) {
      const { error: linkError } = await supabase.from("learning_objective_competencies").insert(links);
      if (linkError) throw new Error(linkError.message);
    }
  }

  for (const mapping of draft.frameworkMappings ?? []) {
    const { error } = await supabase.from("framework_mappings").insert({
      learning_design_id: design.id,
      objective_id: mapping.objectiveCode ? objectiveIds.get(mapping.objectiveCode) ?? null : null,
      framework: mapping.framework,
      framework_version: mapping.frameworkVersion ?? null,
      dimension_key: mapping.dimensionKey,
      dimension_label: mapping.dimensionLabel,
      rationale: mapping.rationale,
      source_title: mapping.sourceTitle ?? null,
      source_url: mapping.sourceUrl ?? null,
      source_note: mapping.sourceNote ?? null,
    });
    if (error) throw new Error(error.message);
  }

  const orderedSteps = [...draft.steps].sort((a, b) => a.stepIndex - b.stepIndex);

  for (const step of orderedSteps) {
    const objectiveIdsForStep = (step.objectiveCodes ?? []).map((code) => objectiveIds.get(code)).filter(Boolean) as string[];
    const competencyIdsForStep = (competencies ?? [])
      .filter((item) => step.competencySlugs?.includes(item.slug))
      .map((item) => item.id);

    const activityConfig = {
      ...(step.activityConfig ?? {}),
      contentPlan: step.contentPlan ?? [],
    };

    const { data: learningStep, error: stepError } = await supabase
      .from("learning_steps")
      .insert({
        learning_design_id: design.id,
        story_arc_id: arc.id,
        step_index: step.stepIndex,
        title: step.title,
        description: step.description,
        pedagogical_function: step.pedagogicalFunction,
        experiential_phase: step.experientialPhase,
        bloom_level: step.bloomLevel,
        activity_type: step.activityType,
        activity_config: activityConfig,
        objective_ids: objectiveIdsForStep,
        competency_ids: competencyIdsForStep,
        narrative_role: step.narrativeRole,
        social_pressure_level: Math.min(5, Math.max(0, Number(step.socialPressureLevel || 0))),
        expected_evidence: step.expectedEvidence,
        reflection_prompt: step.reflectionPrompt ?? null,
        reflection_config: step.reflectionConfig ?? {},
        creation_task: step.creationTask ?? {},
        transfer_task: step.transferTask ?? {},
        estimated_minutes: Math.max(0.5, Number(step.estimatedMinutes || 1)),
        required: true,
        status: "draft",
      })
      .select("id")
      .single();

    if (stepError || !learningStep) throw new Error(stepError?.message ?? "Lernschritt konnte nicht gespeichert werden.");

    if (objectiveIdsForStep.length) {
      const { error } = await supabase.from("learning_step_objectives").insert(
        objectiveIdsForStep.map((id) => ({
          learning_step_id: learningStep.id,
          learning_objective_id: id,
          role: "primary",
          weight: 1,
        })),
      );
      if (error) throw new Error(error.message);
    }

    if (competencyIdsForStep.length) {
      const { error } = await supabase.from("learning_step_competencies").insert(
        competencyIdsForStep.map((id) => ({
          learning_step_id: learningStep.id,
          competency_id: id,
          role: "primary",
          weight: 1,
        })),
      );
      if (error) throw new Error(error.message);
    }

    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .insert({
        scenario_id: scenarioId,
        slug: "learning-step-" + step.stepIndex + "-" + crypto.randomUUID().slice(0, 8),
        title: step.missionTitle,
        description: step.missionDescription,
        trigger_condition: { event: step.triggerEvent, count: 1 },
        target_competencies: competencyIdsForStep,
        reflection_content_id: null,
        status: "draft",
      })
      .select("id")
      .single();

    if (missionError || !mission) throw new Error(missionError?.message ?? "Mission konnte nicht gespeichert werden.");

    const { error: arcStepError } = await supabase.from("story_arc_steps").insert({
      arc_id: arc.id,
      mission_id: mission.id,
      order_index: step.stepIndex,
      unlock_delay_hours: 0,
    });
    if (arcStepError) throw new Error(arcStepError.message);

    const { error: missionLinkError } = await supabase.from("learning_step_missions").insert({
      learning_step_id: learningStep.id,
      mission_id: mission.id,
      role: "primary",
    });
    if (missionLinkError) throw new Error(missionLinkError.message);

    if (Array.isArray(step.evidenceIndicators) && step.evidenceIndicators.length) {
      const { error } = await supabase.from("evidence_indicators").insert(
        step.evidenceIndicators.map((indicator) => ({
          learning_step_id: learningStep.id,
          competency_id: competencyIdsForStep[0] ?? null,
          objective_id: objectiveIdsForStep[0] ?? null,
          code: indicator.code,
          title: indicator.title,
          description: indicator.description,
          dimension: indicator.dimension,
          evidence_type: indicator.evidenceType,
          positive_signal: indicator.positiveSignal,
          negative_signal: indicator.negativeSignal,
          confidence_weight: indicator.confidenceWeight,
          required: indicator.required,
        })),
      );
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/scenarios/" + scenarioId);
  return {
    learningDesignId: design.id,
    version,
    stepCount: orderedSteps.length,
    durationMinutes: config.durationMinutes,
    warnings: draft.pedagogicalWarnings ?? [],
  };
}

export async function getLatestLearningDesign(scenarioId: string) {
  const supabase = supabaseServerClient();
  const { data } = await supabase
    .from("learning_designs")
    .select("id,version,status,title,description,primary_learning_model,bloom_target,desired_results,pedagogical_warnings")
    .eq("scenario_id", scenarioId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function markScenarioImageRejected(contentItemId: string, scenarioId: string, feedback: string) {
  const supabase = supabaseServerClient();
  const { data: item, error } = await supabase
    .from("content_items")
    .select("id,extra")
    .eq("id", contentItemId)
    .eq("scenario_id", scenarioId)
    .single();

  if (error || !item) throw new Error(error?.message ?? "Content-Item nicht gefunden.");

  const extra = item.extra ?? {};
  const imageGeneration = {
    ...((extra.imageGeneration as Record<string, unknown> | undefined) ?? {}),
    editorialReview: "rejected",
    editorialFeedback: feedback.trim(),
    rejectedAt: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("content_items")
    .update({ extra: { ...extra, imageGeneration }, updated_at: new Date().toISOString() })
    .eq("id", contentItemId)
    .eq("scenario_id", scenarioId);

  if (updateError) throw new Error(updateError.message);
  revalidatePath("/scenarios/" + scenarioId);
}
