// apps/admin/app/scenarios/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Erzeugt ein neues Szenario. Slug wird aus dem Titel abgeleitet,
 * sofern nicht explizit angegeben.
 */
export async function createScenario(formData: FormData) {
  const supabase = supabaseServerClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ageRating = String(formData.get("ageRating") ?? "12_plus");
  const slugInput = String(formData.get("slug") ?? "").trim();
  const ageBandInput = String(formData.get("ageBand") ?? "").trim();

  if (!title) {
    throw new Error("Titel darf nicht leer sein");
  }

  const slug = slugInput || slugify(title);

  const { data: scenario, error } = await supabase
    .from("scenarios")
    .insert({
      title,
      description,
      age_rating: ageRating,
      age_band: ageBandInput || (ageRating === "16_plus" ? "16_17" : ageRating === "all_ages" ? "all" : "12_13"),
      scenario_group: slugifyScenarioGroup(title) || slug,
      slug,
      is_active: false,
    })
    .select()
    .single();

  if (error || !scenario) {
    throw new Error(error?.message ?? "Szenario konnte nicht angelegt werden");
  }

  revalidatePath("/scenarios");
  redirect(`/scenarios/${scenario.id}`);
}

/**
 * Aktiviert/Deaktiviert ein Szenario (is_active). Deaktivierte Szenarien
 * bleiben in der DB, tauchen aber z.B. im Lehrer-Dashboard nicht als
 * zuweisbar auf (Filterung erfolgt dort clientseitig auf is_active).
 */
export async function toggleScenarioActive(scenarioId: string, nextActive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("scenarios")
    .update({ is_active: nextActive })
    .eq("id", scenarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/scenarios");
  revalidatePath(`/scenarios/${scenarioId}`);
}

/**
 * Legt ein neues Content-Item als Draft an. Manipulationstechniken und
 * Ziel-Kompetenzen kommen als kommagetrennte Strings/IDs aus dem Formular.
 */
export async function createContentItem(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();

  const type = String(formData.get("type") ?? "post");
  const body = String(formData.get("body") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const creatorId = String(formData.get("creatorId") ?? "") || null;
  const difficulty = Number(formData.get("difficulty") ?? 1);
  const ageRating = String(formData.get("ageRating") ?? "12_plus");
  const isAmbient = formData.get("isAmbient") === "on";
  const parentContentId = String(formData.get("parentContentId") ?? "") || null;
  const baseEngagement = Number(formData.get("baseEngagement") ?? 0);
  const baseCommentCount = Number(formData.get("baseCommentCount") ?? 0);

  const techniquesRaw = String(formData.get("manipulationTechniques") ?? "");
  const manipulationTechniques = techniquesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const competencyIds = formData.getAll("targetCompetencies").map(String);

  if (!body) {
    throw new Error("Inhalt darf nicht leer sein");
  }
  if (isAmbient && manipulationTechniques.length > 0) {
    throw new Error("Ambient-Content darf keine Manipulationstechniken tragen");
  }

  // Optionaler Medien-Upload (Bild/Video). Läuft über den Storage-Bucket
  // "content-media" — Upload ist per RLS auf platform_staff beschränkt
  // (siehe 0014_content_media_storage.sql), unabhängig davon, ob der
  // aufrufende Nutzer diese Server Action überhaupt erreichen kann.
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  const file = formData.get("media") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    const path = `${scenarioId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("content-media")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      throw new Error(`Medien-Upload fehlgeschlagen: ${uploadError.message}`);
    }

    const { data: publicUrl } = supabase.storage.from("content-media").getPublicUrl(path);
    mediaUrl = publicUrl.publicUrl;
    mediaType = file.type.startsWith("video") ? "video" : "image";
  }

  const { error } = await supabase.from("content_items").insert({
    // Ambient-Content ist bewusst szenario-unabhängig (scenario_id NULL) —
    // dadurch in JEDEM Feed wiederverwendbar statt pro Szenario neu zu
    // schreiben (siehe 0012_ambient_content.sql).
    scenario_id: isAmbient ? null : scenarioId,
    parent_id: parentContentId,
    type,
    title,
    body,
    creator_id: creatorId,
    media_url: mediaUrl,
    media_type: mediaType,
    difficulty,
    age_rating: ageRating,
    manipulation_techniques: manipulationTechniques,
    target_competencies: competencyIds,
    status: "draft",
    extra: {
      ...(baseEngagement > 0 ? { baseEngagement } : {}),
      ...(baseCommentCount > 0 ? { baseCommentCount } : {}),
    },
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/scenarios/${scenarioId}`);
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "archived"],
  in_review: ["approved", "rejected", "draft"],
  approved: ["live", "in_review"],
  live: ["archived"],
  rejected: ["draft"],
  archived: ["draft"],
};

/**
 * Wechselt den Freigabe-Status eines Content-Items. Prüft serverseitig,
 * dass nur erlaubte Übergänge stattfinden (siehe ALLOWED_TRANSITIONS) —
 * verhindert z.B. einen Sprung von 'draft' direkt zu 'live' ohne Review.
 */
export async function updateContentItemStatus(
  contentItemId: string,
  currentStatus: string,
  nextStatus: string,
  reviewNotes?: string
) {
  const supabase = supabaseServerClient();

  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Übergang ${currentStatus} -> ${nextStatus} ist nicht erlaubt`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const update: Record<string, unknown> = { status: nextStatus };
  if (["approved", "live", "rejected"].includes(nextStatus)) {
    update.reviewed_by = user?.id ?? null;
    update.reviewed_at = new Date().toISOString();
    if (reviewNotes) update.review_notes = reviewNotes;
  }

  const { error } = await supabase
    .from("content_items")
    .update(update)
    .eq("id", contentItemId);

  if (error) throw new Error(error.message);
  revalidatePath("/scenarios", "layout");
}


const AGE_BANDS = ["9_11", "12_13", "14_15", "16_17", "18_plus"] as const;

async function callGeminiJson(prompt: string, schema: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY ist zur Laufzeit nicht verfügbar.");

  const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
  let lastError = "Unbekannter Gemini-Fehler";

  for (const model of models) {
    let response: Response;
    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            model,
            input: prompt,
            response_format: {
              type: "text",
              mime_type: "application/json",
              schema,
            },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(60000),
        },
      );
    } catch (error) {
      lastError =
        error instanceof Error && error.name === "TimeoutError"
          ? `Gemini ${model} antwortet nach 60 Sekunden nicht.`
          : `Gemini ${model} Netzwerkfehler: ${error instanceof Error ? error.message : "unbekannter Fehler"}`;
      continue;
    }

    if (response.ok) {
      const data = await response.json();
      const raw =
        data.output_text ??
        data.output?.find?.((part: any) => part.type === "text")?.text ??
        data.steps
          ?.filter?.((step: any) => step.type === "model_output")
          ?.flatMap?.((step: any) => step.content ?? [])
          ?.filter?.((part: any) => part.type === "text")
          ?.map?.((part: any) => part.text)
          ?.join?.("") ??
        "";

      try {
        return JSON.parse(String(raw).trim());
      } catch {
        lastError = `Gemini ${model} lieferte kein gültiges JSON.`;
        continue;
      }
    }

    const errorText = await response.text();
    lastError = `Gemini ${model} (${response.status}): ${errorText.slice(0, 400)}`;
    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      /high demand|temporar|overload|capacity|unavailable/i.test(errorText);
    if (!retryable) break;
  }

  throw new Error(`KI-Generierung fehlgeschlagen: ${lastError}`);
}

const AGE_LABELS: Record<string, string> = {
  "9_11": "9–11 Jahre",
  "12_13": "12–13 Jahre",
  "14_15": "14–15 Jahre",
  "16_17": "16–17 Jahre",
  "18_plus": "18+ Jahre",
};

function slugifyScenarioGroup(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Erstellt aus einem kurzen redaktionellen Brief einen vollständigen
 * Szenario-Draft. Die KI erzeugt bewusst nur redaktionelle Struktur;
 * Freigabe und fachliche Prüfung bleiben bei der Redaktion.
 */
export async function generateScenarioDraft(formData: FormData) {
  let createdGroup = "";
  try {
    const supabase = supabaseServerClient();

    const topic = String(formData.get("topic") ?? "").trim();
    const brief = String(formData.get("brief") ?? "").trim();
    const selectedAgeBands = formData
      .getAll("ageBands")
      .map(String)
      .filter((value) => AGE_BANDS.includes(value as (typeof AGE_BANDS)[number]));
    const duration = String(formData.get("duration") ?? "standard");
    const tone = String(formData.get("tone") ?? "realistic");
    const constraints = String(formData.get("constraints") ?? "").trim();

    if (!topic) throw new Error("Bitte ein Thema angeben.");
    if (!selectedAgeBands.length) throw new Error("Bitte mindestens eine Altersvariante auswählen.");

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY ist zur Laufzeit nicht verfügbar.");

    const schema = {
      type: "object",
      properties: {
        variants: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ageBand: { type: "string", enum: [...AGE_BANDS] },
              title: { type: "string" },
              description: { type: "string" },
              learningGoals: { type: "array", items: { type: "string" } },
              arcTitle: { type: "string" },
              arcDescription: { type: "string" },
              missions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    triggerEvent: {
                      type: "string",
                      enum: ["PostViewed", "CommentCreated", "NpcReplySelected"],
                    },
                  },
                  required: ["title", "description", "triggerEvent"],
                },
              },
            },
            required: [
              "ageBand",
              "title",
              "description",
              "learningGoals",
              "arcTitle",
              "arcDescription",
              "missions",
            ],
          },
        },
      },
      required: ["variants"],
    };

    const prompt = `Du bist die redaktionelle Szenario-Engine von DR1FT.

Erstelle einen pädagogisch sinnvollen Szenario-DRAFT für:
THEMA: ${topic}
BRIEF: ${brief || "Keine weiteren Vorgaben."}
ALTERSGRUPPEN: ${selectedAgeBands.map((band) => AGE_LABELS[band]).join(", ")}
UMFANG: ${duration}
TON: ${tone}
BESONDERE VORGABEN: ${constraints || "Keine besonderen Vorgaben."}

WICHTIG:
- Erstelle für jede ausgewählte Altersgruppe genau eine eigene Variante desselben Grundthemas.
- Die Varianten verfolgen dieselbe Lernidee, unterscheiden sich aber bei Sprache, Komplexität, Situation und Aufgaben passend zum Alter.
- Keine politische Überzeugungsarbeit, keine gezielte Manipulation und keine unnötig schockierenden Inhalte.
- Das Ergebnis ist ein REDAKTIONELLER DRAFT, keine Veröffentlichung.
- Jede Variante soll einen klaren Ablauf und 2–4 Missionen vorschlagen.
- Missionen sind konkrete Lernhandlungen, keine abstrakten Überschriften.
- Formuliere so, dass eine Redakteurin oder ein Redakteur direkt weiterarbeiten kann.
- Keine erfundenen Kompetenz-IDs oder Datenbank-IDs.

Gib ausschließlich valides JSON gemäß Schema zurück.`;

    const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
    let draft: any = null;
    let lastError = "Unbekannter Gemini-Fehler";

    for (const model of models) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            model,
            input: prompt,
            response_format: {
              type: "text",
              mime_type: "application/json",
              schema,
            },
          }),
          cache: "no-store",
        },
      );

      if (response.ok) {
        const data = await response.json();
        const raw =
          data.output_text ??
          data.output?.find?.((part: any) => part.type === "text")?.text ??
          data.steps
            ?.filter?.((step: any) => step.type === "model_output")
            ?.flatMap?.((step: any) => step.content ?? [])
            ?.filter?.((part: any) => part.type === "text")
            ?.map?.((part: any) => part.text)
            ?.join?.("") ??
          "";

        try {
          draft = JSON.parse(String(raw).trim());
        } catch {
          lastError = `Gemini ${model} lieferte kein gültiges JSON.`;
          continue;
        }

        if (Array.isArray(draft?.variants)) break;
        draft = null;
        lastError = `Gemini ${model} lieferte keine Varianten.`;
        continue;
      }

      const errorText = await response.text();
      lastError = `Gemini ${model} (${response.status}): ${errorText.slice(0, 500)}`;

      const retryable =
        response.status === 429 ||
        response.status >= 500 ||
        /high demand|temporar|overload|capacity|unavailable/i.test(errorText);

      if (!retryable) break;
    }

    if (!draft?.variants || !Array.isArray(draft.variants)) {
      throw new Error(`KI-Entwurf konnte nicht erzeugt werden: ${lastError}`);
    }

    const variants = draft.variants.filter((variant: any) =>
      selectedAgeBands.includes(String(variant?.ageBand)),
    );

    if (!variants.length) {
      throw new Error("Die KI hat keine der ausgewählten Altersgruppen zurückgegeben.");
    }

    const group = slugifyScenarioGroup(topic) || `szenario-${Date.now()}`;
    createdGroup = group;

    for (const variant of variants) {
      const ageBand = String(variant.ageBand);
      const ageRating =
        ageBand === "16_17" || ageBand === "18_plus"
          ? "16_plus"
          : "12_plus";
      const variantTitle = String(variant.title || topic).trim();
      const learningGoals = Array.isArray(variant.learningGoals)
        ? variant.learningGoals.map(String).filter(Boolean)
        : [];

      const description = [
        String(variant.description || "").trim(),
        learningGoals.length
          ? `\\n\\nLernziele\\n• ${learningGoals.join("\\n• ")}`
          : "",
      ]
        .filter(Boolean)
        .join("");

      const { data: scenario, error: scenarioError } = await supabase
        .from("scenarios")
        .insert({
          title: variantTitle,
          description,
          age_rating: ageRating,
          age_band: ageBand,
          scenario_group: group,
          slug: `${group}-${ageBand}-${crypto.randomUUID().slice(0, 8)}`,
          is_active: false,
        })
        .select("id")
        .single();

      if (scenarioError || !scenario) {
        throw new Error(
          scenarioError?.message ?? "Szenario-Variante konnte nicht angelegt werden.",
        );
      }

      const arcTitle = String(variant.arcTitle || "Ablauf").trim();
      const { data: arc, error: arcError } = await supabase
        .from("story_arcs")
        .insert({
          scenario_id: scenario.id,
          slug: `${group}-${ageBand}-ablauf-${crypto.randomUUID().slice(0, 8)}`,
          title: arcTitle,
          description: String(variant.arcDescription || "").trim(),
          status: "draft",
        })
        .select("id")
        .single();

      if (arcError || !arc) {
        throw new Error(arcError?.message ?? "Ablauf konnte nicht angelegt werden.");
      }

      const missions = Array.isArray(variant.missions)
        ? variant.missions.slice(0, 4)
        : [];

      for (let index = 0; index < missions.length; index++) {
        const mission = missions[index];
        const { data: createdMission, error: missionError } = await supabase
          .from("missions")
          .insert({
            scenario_id: scenario.id,
            slug: `${group}-${ageBand}-mission-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
            title: String(mission.title || `Schritt ${index + 1}`).trim(),
            description: String(mission.description || "").trim(),
            trigger_condition: {
              event: String(mission.triggerEvent || "PostViewed"),
              count: 1,
            },
            target_competencies: [],
            reflection_content_id: null,
            status: "draft",
          })
          .select("id")
          .single();

        if (missionError || !createdMission) {
          throw new Error(
            missionError?.message ?? "Mission konnte nicht angelegt werden.",
          );
        }

        const { error: stepError } = await supabase
          .from("story_arc_steps")
          .insert({
            arc_id: arc.id,
            mission_id: createdMission.id,
            order_index: index,
            unlock_delay_hours: 0,
          });

        if (stepError) throw new Error(stepError.message);
      }
    }

    revalidatePath("/scenarios");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler bei der Szenario-Generierung.";
    console.error("[scenario-generator]", error);
    redirect(`/scenarios?generationError=${encodeURIComponent(message.slice(0, 900))}`);
  }

  revalidatePath("/scenarios");
  redirect(`/scenarios?group=${encodeURIComponent(createdGroup)}`);
}


export async function optimizeScenarioBasics(scenarioId: string) {
  try {
    const supabase = supabaseServerClient();
    const { data: scenario, error } = await supabase
      .from("scenarios")
      .select("id, title, description, age_band")
      .eq("id", scenarioId)
      .single();

    if (error || !scenario) throw new Error("Szenario konnte nicht geladen werden.");

    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "description"],
    };

    const prompt = `Du bist die redaktionelle KI von DR1FT. Optimiere die Grundbeschreibung eines bestehenden Lern-Szenarios.
ALTERSVARIANTE: ${AGE_LABELS[scenario.age_band] ?? scenario.age_band}
AKTUELLER TITEL: ${scenario.title}
AKTUELLE BESCHREIBUNG:
${scenario.description || "Keine Beschreibung."}

ZIEL:
- Formuliere einen präzisen, interessanten Titel.
- Formuliere eine klare, konkrete Szenariobeschreibung für eine Redaktion.
- Erhalte die inhaltliche Absicht und füge keine neuen Fakten hinzu, die nicht aus dem vorhandenen Text ableitbar sind.
- Lernziele, falls bereits enthalten, müssen erhalten bleiben.
- Keine politische Überzeugungsarbeit.
- Das Ergebnis bleibt ein redaktioneller DRAFT.

Gib ausschließlich valides JSON gemäß Schema zurück.`;

    const draft = await callGeminiJson(prompt, schema);
    const title = String(draft?.title || "").trim();
    const description = String(draft?.description || "").trim();
    if (!title || !description) throw new Error("Die KI hat keinen brauchbaren Grundlagentext geliefert.");

    const { error: updateError } = await supabase
      .from("scenarios")
      .update({ title, description })
      .eq("id", scenarioId);

    if (updateError) throw new Error(updateError.message);
    revalidatePath(`/scenarios/${scenarioId}`);
    redirect(`/scenarios/${scenarioId}?ai=Grundlage+optimiert`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "KI-Optimierung fehlgeschlagen.";
    console.error("[scenario-ai-basics]", error);
    redirect(`/scenarios/${scenarioId}?aiError=${encodeURIComponent(message.slice(0, 900))}`);
  }
}

export async function optimizeScenarioFlow(scenarioId: string) {
  try {
    const supabase = supabaseServerClient();
    const [{ data: scenario }, { data: arcs }] = await Promise.all([
      supabase.from("scenarios").select("id, title, description, age_band").eq("id", scenarioId).single(),
      supabase.from("story_arcs").select("id, title, description").eq("scenario_id", scenarioId).order("created_at"),
    ]);

    if (!scenario) throw new Error("Szenario konnte nicht geladen werden.");
    const activeArc = arcs?.[0] ?? null;

    const { data: missions } = await supabase
      .from("missions")
      .select("id, title, description, trigger_condition")
      .eq("scenario_id", scenarioId)
      .order("created_at");

    const schema = {
      type: "object",
      properties: {
        arcTitle: { type: "string" },
        arcDescription: { type: "string" },
        missions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              triggerEvent: {
                type: "string",
                enum: ["PostViewed", "CommentCreated", "NpcReplySelected"],
              },
            },
            required: ["title", "description", "triggerEvent"],
          },
        },
      },
      required: ["arcTitle", "arcDescription", "missions"],
    };

    const prompt = `Du bist die redaktionelle KI von DR1FT. Optimiere den Ablauf eines bestehenden Lern-Szenarios.
ALTERSVARIANTE: ${AGE_LABELS[scenario.age_band] ?? scenario.age_band}
TITEL: ${scenario.title}
BESCHREIBUNG:
${scenario.description || "Keine Beschreibung."}

AKTUELLER ABLAUF:
${activeArc ? JSON.stringify({ title: activeArc.title, description: activeArc.description }) : "Noch kein Ablauf."}

AKTUELLE MISSIONEN:
${JSON.stringify((missions ?? []).map((m) => ({ title: m.title, description: m.description, trigger: m.trigger_condition?.event })))}

ZIEL:
- Erzeuge einen klaren Lernablauf mit 2–4 konkreten Missionen.
- Missionen müssen echte Lernhandlungen sein.
- Erhalte die vorhandene inhaltliche Richtung; keine komplett neue Story erfinden.
- Die Sprache muss zur Altersvariante passen.
- Wenn bereits Missionen vorhanden sind, verbessere sie statt sie unnötig auszutauschen.
- Keine Kompetenz-IDs oder Datenbank-IDs.
- Ergebnis ist ein redaktioneller Draft.

Gib ausschließlich valides JSON gemäß Schema zurück.`;

    const draft = await callGeminiJson(prompt, schema);
    const missionsDraft = Array.isArray(draft?.missions) ? draft.missions.slice(0, 4) : [];
    if (!String(draft?.arcTitle || "").trim() || !String(draft?.arcDescription || "").trim() || !missionsDraft.length) {
      throw new Error("Die KI hat keinen vollständigen Ablauf geliefert.");
    }

    let arcId = activeArc?.id;
    if (arcId) {
      const { error } = await supabase
        .from("story_arcs")
        .update({
          title: String(draft.arcTitle).trim(),
          description: String(draft.arcDescription).trim(),
          status: "draft",
        })
        .eq("id", arcId)
        .eq("scenario_id", scenarioId);
      if (error) throw new Error(error.message);
    } else {
      const { data: createdArc, error } = await supabase
        .from("story_arcs")
        .insert({
          scenario_id: scenarioId,
          slug: `ki-ablauf-${crypto.randomUUID().slice(0, 8)}`,
          title: String(draft.arcTitle).trim(),
          description: String(draft.arcDescription).trim(),
          status: "draft",
        })
        .select("id")
        .single();
      if (error || !createdArc) throw new Error(error?.message ?? "Ablauf konnte nicht angelegt werden.");
      arcId = createdArc.id;
    }

    for (let index = 0; index < missionsDraft.length; index++) {
      const mission = missionsDraft[index];
      const title = String(mission.title || `Schritt ${index + 1}`).trim();
      const description = String(mission.description || "").trim();
      const triggerEvent = String(mission.triggerEvent || "PostViewed");

      if (missions?.[index]?.id) {
        const { error } = await supabase
          .from("missions")
          .update({
            title,
            description,
            trigger_condition: { event: triggerEvent, count: 1 },
            status: "draft",
          })
          .eq("id", missions[index].id)
          .eq("scenario_id", scenarioId);
        if (error) throw new Error(error.message);
      } else {
        const { data: createdMission, error } = await supabase
          .from("missions")
          .insert({
            scenario_id: scenarioId,
            slug: `ki-mission-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
            title,
            description,
            trigger_condition: { event: triggerEvent, count: 1 },
            target_competencies: [],
            reflection_content_id: null,
            status: "draft",
          })
          .select("id")
          .single();
        if (error || !createdMission) throw new Error(error?.message ?? "Mission konnte nicht angelegt werden.");

        const { error: stepError } = await supabase
          .from("story_arc_steps")
          .insert({
            arc_id: arcId,
            mission_id: createdMission.id,
            order_index: index,
            unlock_delay_hours: 0,
          });
        if (stepError) throw new Error(stepError.message);
      }
    }

    revalidatePath(`/scenarios/${scenarioId}`);
    redirect(`/scenarios/${scenarioId}?ai=Ablauf+optimiert`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "KI-Optimierung fehlgeschlagen.";
    console.error("[scenario-ai-flow]", error);
    redirect(`/scenarios/${scenarioId}?aiError=${encodeURIComponent(message.slice(0, 900))}`);
  }
}

export async function generateScenarioContent(scenarioId: string) {
  try {
    const supabase = supabaseServerClient();
    const [{ data: scenario }, { data: arc }, { data: missions }] = await Promise.all([
      supabase.from("scenarios").select("id, title, description, age_band").eq("id", scenarioId).single(),
      supabase.from("story_arcs").select("title, description").eq("scenario_id", scenarioId).order("created_at").limit(1).maybeSingle(),
      supabase.from("missions").select("title, description").eq("scenario_id", scenarioId).order("created_at"),
    ]);

    if (!scenario) throw new Error("Szenario konnte nicht geladen werden.");

    const schema = {
      type: "object",
      properties: {
        contents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["post", "comment", "dm_message", "reflection_prompt"] },
              body: { type: "string" },
              difficulty: { type: "integer", enum: [1, 2, 3, 4, 5] },
            },
            required: ["type", "body", "difficulty"],
          },
        },
      },
      required: ["contents"],
    };

    const prompt = `Du bist die redaktionelle KI von DR1FT. Erzeuge erste Inhaltsentwürfe für ein Lern-Szenario.
ALTERSVARIANTE: ${AGE_LABELS[scenario.age_band] ?? scenario.age_band}
TITEL: ${scenario.title}
BESCHREIBUNG:
${scenario.description || "Keine Beschreibung."}
ABLAUF:
${JSON.stringify(arc ?? null)}
MISSIONEN:
${JSON.stringify(missions ?? [])}

Erzeuge 4–6 unterschiedliche, kurze Inhalte, die diesen Ablauf konkret machen:
- mindestens ein Post
- mindestens ein Kommentar
- mindestens eine DM-Nachricht
- mindestens ein Reflexions-Prompt
- realistisch und altersgerecht
- keine realen Personen, keine erfundenen Quellen oder angeblichen Fakten
- keine Kompetenz-IDs und keine Datenbank-IDs
- alles bleibt Draft

Gib ausschließlich valides JSON gemäß Schema zurück.`;

    const draft = await callGeminiJson(prompt, schema);
    const contents = Array.isArray(draft?.contents) ? draft.contents.slice(0, 6) : [];
    if (!contents.length) throw new Error("Die KI hat keine Inhalte geliefert.");

    const ageRating =
      scenario.age_band === "9_11" ? "all_ages" :
      scenario.age_band === "16_17" || scenario.age_band === "18_plus" ? "16_plus" :
      "12_plus";

    const { error } = await supabase.from("content_items").insert(
      contents.map((item: any) => ({
        scenario_id: scenarioId,
        type: String(item.type),
        body: String(item.body || "").trim(),
        difficulty: Math.min(5, Math.max(1, Number(item.difficulty || 1))),
        age_rating: ageRating,
        manipulation_techniques: [],
        target_competencies: [],
        status: "draft",
        extra: { generatedBy: "scenario-studio-ai" },
      })),
    );

    if (error) throw new Error(error.message);
    revalidatePath(`/scenarios/${scenarioId}`);
    redirect(`/scenarios/${scenarioId}?ai=Inhalte+ergänzt`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "KI-Generierung fehlgeschlagen.";
    console.error("[scenario-ai-content]", error);
    redirect(`/scenarios/${scenarioId}?aiError=${encodeURIComponent(message.slice(0, 900))}`);
  }
}

export async function updateScenarioBasics(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Titel darf nicht leer sein.");

  const { error } = await supabase
    .from("scenarios")
    .update({ title, description })
    .eq("id", scenarioId);

  if (error) throw new Error(error.message);
  revalidatePath(`/scenarios/${scenarioId}`);
  revalidatePath("/scenarios");
}

export async function updateMissionDraft(missionId: string, scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Missionstitel darf nicht leer sein.");

  const { error } = await supabase
    .from("missions")
    .update({ title, description })
    .eq("id", missionId)
    .eq("scenario_id", scenarioId);

  if (error) throw new Error(error.message);
  revalidatePath(`/scenarios/${scenarioId}`);
}

export async function updateArcDraft(arcId: string, scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Ablauftitel darf nicht leer sein.");

  const { error } = await supabase
    .from("story_arcs")
    .update({ title, description })
    .eq("id", arcId)
    .eq("scenario_id", scenarioId);

  if (error) throw new Error(error.message);
  revalidatePath(`/scenarios/${scenarioId}`);
}
