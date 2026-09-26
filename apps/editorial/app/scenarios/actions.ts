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


const AGE_BANDS = ["12_13", "14_15", "16_17", "18_plus"] as const;
const AGE_LABELS: Record<string, string> = {
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
  const supabase = supabaseServerClient();

  const topic = String(formData.get("topic") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const selectedAgeBands = formData.getAll("ageBands").map(String).filter((value) => AGE_BANDS.includes(value as (typeof AGE_BANDS)[number]));
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
                  triggerEvent: { type: "string", enum: ["PostViewed", "CommentCreated", "NpcReplySelected"] },
                },
                required: ["title", "description", "triggerEvent"],
              },
            },
          },
          required: ["ageBand", "title", "description", "learningGoals", "arcTitle", "arcDescription", "missions"],
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
- Erstelle für jede ausgewählte Altersgruppe eine eigene Variante desselben Grundthemas.
- Die Varianten sollen dieselbe Lernidee verfolgen, aber Sprache, Komplexität, Situation und Aufgaben an das Alter anpassen.
- Keine politische Überzeugungsarbeit, keine gezielte Manipulation und keine unnötig schockierenden Inhalte.
- Das Ergebnis ist ein REDAKTIONELLER DRAFT, keine Veröffentlichung.
- Jede Variante soll einen klaren Ablauf und 2–4 Missionen vorschlagen.
- Missionen sind konkrete Lernhandlungen, keine abstrakten Überschriften.
- Formuliere so, dass eine Redakteurin oder ein Redakteur direkt weiterarbeiten kann.
- Keine erfundenen Kompetenz-IDs oder Datenbank-IDs.

Gib ausschließlich valides JSON gemäß Schema zurück.`;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "gemini-3.5-flash-lite",
      input: prompt,
      response_format: { type: "text", mime_type: "application/json", schema },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API Fehler: ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.output_text ?? data.output?.find?.((part: any) => part.type === "text")?.text ?? "";
  let draft: any;
  try {
    draft = JSON.parse(raw);
  } catch {
    throw new Error("Die KI hat keinen gültigen Szenario-Draft zurückgegeben.");
  }

  const variants = Array.isArray(draft?.variants) ? draft.variants : [];
  const group = slugifyScenarioGroup(topic) || `szenario-${Date.now()}`;

  for (const variant of variants) {
    if (!selectedAgeBands.includes(variant.ageBand)) continue;

    const ageBand = String(variant.ageBand);
    const ageRating = ageBand === "16_17" || ageBand === "18_plus" ? "16_plus" : ageBand === "all" ? "all_ages" : "12_plus";
    const variantTitle = String(variant.title || topic).trim();
    const learningGoals = Array.isArray(variant.learningGoals) ? variant.learningGoals.map(String).filter(Boolean) : [];

    const description = [
      String(variant.description || "").trim(),
      learningGoals.length ? `\n\nLernziele\n• ${learningGoals.join("\n• ")}` : "",
    ].filter(Boolean).join("");

    const { data: scenario, error: scenarioError } = await supabase
      .from("scenarios")
      .insert({
        title: variantTitle,
        description,
        age_rating: ageRating,
        age_band: ageBand,
        scenario_group: group,
        slug: `${group}-${ageBand}-${Date.now().toString(36)}`,
        is_active: false,
      })
      .select("id")
      .single();

    if (scenarioError || !scenario) {
      throw new Error(scenarioError?.message ?? "Szenario-Variante konnte nicht angelegt werden.");
    }

    const arcTitle = String(variant.arcTitle || "Ablauf").trim();
    const { data: arc, error: arcError } = await supabase
      .from("story_arcs")
      .insert({
        scenario_id: scenario.id,
        slug: `${group}-${ageBand}-ablauf-${Date.now().toString(36)}`,
        title: arcTitle,
        description: String(variant.arcDescription || "").trim(),
        status: "draft",
      })
      .select("id")
      .single();

    if (arcError || !arc) throw new Error(arcError?.message ?? "Ablauf konnte nicht angelegt werden.");

    const missions = Array.isArray(variant.missions) ? variant.missions.slice(0, 4) : [];
    for (let index = 0; index < missions.length; index++) {
      const mission = missions[index];
      const { data: createdMission, error: missionError } = await supabase
        .from("missions")
        .insert({
          scenario_id: scenario.id,
          slug: `${group}-${ageBand}-mission-${index + 1}-${Date.now().toString(36)}`,
          title: String(mission.title || `Schritt ${index + 1}`).trim(),
          description: String(mission.description || "").trim(),
          trigger_condition: { event: String(mission.triggerEvent || "PostViewed"), count: 1 },
          target_competencies: [],
          reflection_content_id: null,
          status: "draft",
        })
        .select("id")
        .single();

      if (missionError || !createdMission) throw new Error(missionError?.message ?? "Mission konnte nicht angelegt werden.");

      const { error: stepError } = await supabase.from("story_arc_steps").insert({
        arc_id: arc.id,
        mission_id: createdMission.id,
        order_index: index,
        unlock_delay_hours: 0,
      });
      if (stepError) throw new Error(stepError.message);
    }
  }

  revalidatePath("/scenarios");
  redirect(`/scenarios?group=${encodeURIComponent(group)}`);
}
