// apps/admin/app/scenarios/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function validateModuleCompetencies(
  supabase: ReturnType<typeof supabaseServerClient>,
  primaryId: string,
  secondaryIds: string[],
) {
  const secondary = Array.from(new Set(secondaryIds.filter(Boolean)));
  if (!primaryId) throw new Error("Bitte eine primäre Lernkompetenz auswählen.");
  if (secondary.length > 2) throw new Error("Ein Modul darf höchstens zwei sekundäre Kompetenzen haben.");
  if (secondary.includes(primaryId)) throw new Error("Die primäre Kompetenz kann nicht gleichzeitig sekundär sein.");

  const ids = [primaryId, ...secondary];
  const { data, error } = await supabase.from("competencies").select("id").in("id", ids);
  if (error) throw new Error(error.message);
  if ((data?.length ?? 0) !== ids.length) throw new Error("Eine ausgewählte Lernkompetenz ist ungültig.");

  return secondary;
}

/** Erzeugt ein neues Modul (intern weiterhin als scenario gespeichert). */
export async function createScenario(formData: FormData) {
  const supabase = supabaseServerClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ageRating = String(formData.get("ageRating") ?? "12_plus");
  const slugInput = String(formData.get("slug") ?? "").trim();
  const primaryCompetencyId = String(formData.get("primaryCompetencyId") ?? "").trim();
  const secondaryCompetencyIds = formData.getAll("secondaryCompetencyId").map(String);

  if (!title) throw new Error("Titel darf nicht leer sein");

  const secondary = await validateModuleCompetencies(
    supabase,
    primaryCompetencyId,
    secondaryCompetencyIds,
  );

  const slug = slugInput || slugify(title);

  const { data: scenario, error } = await supabase
    .from("scenarios")
    .insert({
      title,
      description,
      age_rating: ageRating,
      slug,
      is_active: false,
      primary_competency_id: primaryCompetencyId,
      secondary_competency_ids: secondary,
    })
    .select()
    .single();

  if (error || !scenario) throw new Error(error?.message ?? "Szenario konnte nicht angelegt werden");

  revalidatePath("/scenarios");
  redirect(`/scenarios/${scenario.id}`);
}

/** Aktualisiert die Lernkompetenzen eines bestehenden Moduls. */
export async function updateScenarioCompetencies(
  scenarioId: string,
  formData: FormData,
) {
  const supabase = supabaseServerClient();
  const primaryCompetencyId = String(formData.get("primaryCompetencyId") ?? "").trim();
  const secondaryCompetencyIds = formData.getAll("secondaryCompetencyId").map(String);
  const secondary = await validateModuleCompetencies(
    supabase,
    primaryCompetencyId,
    secondaryCompetencyIds,
  );

  const { error } = await supabase
    .from("scenarios")
    .update({
      primary_competency_id: primaryCompetencyId,
      secondary_competency_ids: secondary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scenarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/scenarios");
  revalidatePath(`/scenarios/${scenarioId}`);
}

/** Aktiviert/Deaktiviert ein Szenario (Modul). */
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

/** Legt ein neues Content-Item als Draft an. */
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
  const manipulationTechniques = techniquesRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const competencyIds = formData.getAll("targetCompetencies").map(String);

  if (!body) throw new Error("Inhalt darf nicht leer sein");
  if (isAmbient && manipulationTechniques.length > 0) {
    throw new Error("Ambient-Content darf keine Manipulationstechniken tragen");
  }

  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  const file = formData.get("media") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    const path = `${scenarioId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("content-media")
      .upload(path, file, { contentType: file.type });
    if (uploadError) throw new Error(`Medien-Upload fehlgeschlagen: ${uploadError.message}`);
    const { data: publicUrl } = supabase.storage.from("content-media").getPublicUrl(path);
    mediaUrl = publicUrl.publicUrl;
    mediaType = file.type.startsWith("video") ? "video" : "image";
  }

  const { error } = await supabase.from("content_items").insert({
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

export async function updateContentItemStatus(
  contentItemId: string,
  currentStatus: string,
  nextStatus: string,
  reviewNotes?: string,
) {
  const supabase = supabaseServerClient();
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Übergang ${currentStatus} -> ${nextStatus} ist nicht erlaubt`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const update: Record<string, unknown> = { status: nextStatus };
  if (["approved", "live", "rejected"].includes(nextStatus)) {
    update.reviewed_by = user?.id ?? null;
    update.reviewed_at = new Date().toISOString();
    if (reviewNotes) update.review_notes = reviewNotes;
  }

  const { error } = await supabase.from("content_items").update(update).eq("id", contentItemId);
  if (error) throw new Error(error.message);
  revalidatePath("/scenarios", "layout");
}
