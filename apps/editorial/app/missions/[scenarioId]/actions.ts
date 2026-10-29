// apps/admin/app/missions/[scenarioId]/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Baut trigger_condition aus strukturierten Formularfeldern statt
 * Hand-JSON: Event-Auswahl, Zähler, kommagetrennte Technik-Filter.
 */
export async function createMission(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const event = String(formData.get("triggerEvent") ?? "PostViewed");
  const count = Number(formData.get("triggerCount") ?? 1);
  const techniqueFilterRaw = String(formData.get("techniqueFilter") ?? "");
  const techniqueFilter = techniqueFilterRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const reflectionContentId = String(formData.get("reflectionContentId") ?? "") || null;
  const targetCompetencies = formData.getAll("targetCompetencies").map(String);

  if (!title) throw new Error("Titel darf nicht leer sein");

  const triggerCondition: Record<string, unknown> = { event, count };
  if (techniqueFilter.length > 0) {
    triggerCondition.technique_filter = techniqueFilter;
  }

  const { error } = await supabase.from("missions").insert({
    scenario_id: scenarioId,
    slug: slugify(title) + "-" + Date.now().toString(36),
    title,
    description,
    thumbnail_url: thumbnailUrl || null,
    trigger_condition: triggerCondition,
    target_competencies: targetCompetencies,
    reflection_content_id: reflectionContentId,
    status: "draft",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

/**
 * Missionen brauchen keinen vollen Redaktions-Workflow wie Content-Items
 * (die eigentliche Prüfung passiert am referenzierten Content) — hier
 * reicht ein einfacher draft/live-Schalter.
 */
export async function toggleMissionLive(missionId: string, scenarioId: string, nextLive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("missions")
    .update({ status: nextLive ? "live" : "draft" })
    .eq("id", missionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

export async function createArc(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Titel darf nicht leer sein");

  const { error } = await supabase.from("story_arcs").insert({
    scenario_id: scenarioId,
    slug: slugify(title) + "-" + Date.now().toString(36),
    title,
    description,
    status: "draft",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

export async function toggleArcLive(arcId: string, scenarioId: string, nextLive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("story_arcs")
    .update({ status: nextLive ? "live" : "draft" })
    .eq("id", arcId);

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

/**
 * Fügt eine Mission als nächsten Schritt einer Arc hinzu — order_index
 * wird automatisch als "ans Ende anhängen" berechnet, damit niemand
 * manuell Indizes vergeben muss.
 */
export async function addArcStep(
  arcId: string,
  scenarioId: string,
  missionId: string,
  delayHours: number
) {
  const supabase = supabaseServerClient();

  const { data: existingSteps } = await supabase
    .from("story_arc_steps")
    .select("order_index")
    .eq("arc_id", arcId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = existingSteps && existingSteps.length > 0 ? existingSteps[0].order_index + 1 : 0;

  const { error } = await supabase.from("story_arc_steps").insert({
    arc_id: arcId,
    mission_id: missionId,
    order_index: nextIndex,
    unlock_delay_hours: delayHours,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

export async function removeArcStep(stepId: string, scenarioId: string) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("story_arc_steps").delete().eq("id", stepId);
  if (error) throw new Error(error.message);
  revalidatePath(`/missions/${scenarioId}`);
}

/**
 * Vertauscht die Reihenfolge zweier benachbarter Schritte — die
 * einfachste Form von "Umsortieren" ohne Drag&Drop-Bibliothek.
 */
export async function swapArcSteps(
  scenarioId: string,
  stepA: { id: string; orderIndex: number },
  stepB: { id: string; orderIndex: number }
) {
  const supabase = supabaseServerClient();

  const { error: e1 } = await supabase
    .from("story_arc_steps")
    .update({ order_index: stepB.orderIndex })
    .eq("id", stepA.id);
  const { error: e2 } = await supabase
    .from("story_arc_steps")
    .update({ order_index: stepA.orderIndex })
    .eq("id", stepB.id);

  if (e1 || e2) throw new Error(e1?.message ?? e2?.message);
  revalidatePath(`/missions/${scenarioId}`);
}


/**
 * Generiert ein Missions-Cover mit dem bestehenden DR1FT-Flux-Worker.
 * Als Briefing dienen Titel/Beschreibung der Mission und Titel/Beschreibung
 * des zugehörigen Szenarios. Das Ergebnis wird im Supabase Storage abgelegt.
 */
export async function generateMissionThumbnail(missionId: string, scenarioId: string) {
  const supabase = supabaseServerClient();
  const workerUrl = process.env.CLOUDFLARE_AMBIENT_IMAGE_URL?.trim()
    || "https://dr1ft.grospitz.workers.dev";
  const apiKey = process.env.AMBIENT_IMAGE_API_KEY?.trim()
    || process.env.CLOUDFLARE_AMBIENT_IMAGE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("FLUX ist nicht konfiguriert: AMBIENT_IMAGE_API_KEY fehlt in den Vercel-Umgebungsvariablen.");
  }

  const [{ data: mission, error: missionError }, { data: scenario, error: scenarioError }] = await Promise.all([
    supabase.from("missions").select("id,title,description,thumbnail_url").eq("id", missionId).eq("scenario_id", scenarioId).single(),
    supabase.from("scenarios").select("id,title,description,age_band,age_rating").eq("id", scenarioId).single(),
  ]);
  if (missionError || !mission) throw new Error(missionError?.message ?? "Mission nicht gefunden.");
  if (scenarioError || !scenario) throw new Error(scenarioError?.message ?? "Szenario nicht gefunden.");

  const prompt = [
    "Create a premium, visually striking editorial illustration used as the cover art for a German school media-literacy learning mission.",
    "This is an illustration, not a screenshot, poster, app interface, social media post, or photograph.",
    "Scenario title: " + scenario.title,
    "Scenario briefing: " + String(scenario.description ?? "").slice(0, 1800),
    "Mission title: " + mission.title,
    "Mission briefing: " + String(mission.description ?? "").slice(0, 1200),
    "Age group: " + String(scenario.age_band ?? scenario.age_rating ?? "12+"),
    "Translate the pedagogical situation into one clear visual metaphor and a strong focal subject. Make it engaging for teenagers, contemporary, nuanced, emotionally intelligent, safe for school, and visually polished.",
    "Use a rich but balanced palette with violet, indigo, electric blue and small cyan accents; soft cinematic lighting, layered depth, subtle texture, refined composition.",
    "Wide landscape cover art, 16:9 composition, subject readable at thumbnail size. Keep important visual elements near the center and leave comfortable negative space around edges.",
    "No readable text, no letters, no logos, no watermark, no real-person likeness, no brand marks. Avoid generic corporate stock imagery.",
  ].join("\n\n");

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ prompt, aspectRatio: "16:9", steps: 4 }),
    cache: "no-store",
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    throw new Error("FLUX-Generierung fehlgeschlagen (" + response.status + "): " + (await response.text()).slice(0, 500));
  }

  const result = await response.json();
  if (typeof result?.image !== "string") throw new Error("FLUX hat kein Bild zurückgegeben.");

  const storagePath = "generated/mission-thumbnails/" + scenarioId + "/" + missionId + "-" + crypto.randomUUID() + ".jpg";
  const { error: uploadError } = await supabase.storage.from("ambient-assets").upload(
    storagePath,
    Buffer.from(result.image, "base64"),
    { contentType: "image/jpeg", upsert: false },
  );
  if (uploadError) throw new Error("Mission-Thumbnail konnte nicht gespeichert werden: " + uploadError.message);

  const { data: publicUrl } = supabase.storage.from("ambient-assets").getPublicUrl(storagePath);
  const { error: updateError } = await supabase.from("missions")
    .update({ thumbnail_url: publicUrl.publicUrl })
    .eq("id", missionId)
    .eq("scenario_id", scenarioId);
  if (updateError) throw new Error("Bild gespeichert, aber Mission konnte nicht aktualisiert werden: " + updateError.message);

  revalidatePath("/missions/" + scenarioId);
  revalidatePath("/scenarios");
  revalidatePath("/scenarios/" + scenarioId);
  return { thumbnailUrl: publicUrl.publicUrl };
}

export async function saveMissionThumbnail(missionId: string, scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  if (thumbnailUrl) {
    let parsed: URL;
    try { parsed = new URL(thumbnailUrl); } catch { throw new Error("Bitte eine gültige Bild-URL eingeben."); }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Die Bild-URL muss mit https:// oder http:// beginnen.");
    }
  }
  const { error } = await supabase.from("missions")
    .update({ thumbnail_url: thumbnailUrl || null })
    .eq("id", missionId)
    .eq("scenario_id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath("/missions/" + scenarioId);
  revalidatePath("/scenarios");
  revalidatePath("/scenarios/" + scenarioId);
}
