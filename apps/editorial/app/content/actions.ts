// apps/admin/app/content/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "archived"],
  in_review: ["approved", "rejected", "draft"],
  approved: ["live", "in_review"],
  live: ["archived"],
  rejected: ["draft"],
  archived: ["draft"],
};

/**
 * Setzt bei mehreren Items gleichzeitig den Status — wichtig bei 1000+
 * Einträgen, wo Item-für-Item-Klicken nicht praktikabel ist. Prüft pro
 * Item den erlaubten Übergang serverseitig; Items mit unzulässigem
 * Übergang werden einfach übersprungen (kein harter Fehler für den
 * ganzen Batch), damit z.B. "20 auswählen, alle auf 'live'" nicht an
 * einem einzelnen falschen Status scheitert.
 */
export async function bulkUpdateStatus(ids: string[], nextStatus: string) {
  const supabase = supabaseServerClient();

  const { data: items } = await supabase
    .from("content_items")
    .select("id, status")
    .in("id", ids);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validIds = (items ?? [])
    .filter((i) => (ALLOWED_TRANSITIONS[i.status] ?? []).includes(nextStatus))
    .map((i) => i.id);

  if (validIds.length === 0) {
    return { updated: 0, skipped: ids.length };
  }

  const update: Record<string, unknown> = { status: nextStatus };
  if (["approved", "live", "rejected"].includes(nextStatus)) {
    update.reviewed_by = user?.id ?? null;
    update.reviewed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("content_items").update(update).in("id", validIds);
  if (error) throw new Error(error.message);

  revalidatePath("/content");
  return { updated: validIds.length, skipped: ids.length - validIds.length };
}

/**
 * Schnellbearbeitung im Detail-Drawer — Änderungen ohne die
 * Bibliotheks-Ansicht zu verlassen.
 */
export async function updateContentItemQuick(
  id: string,
  fields: {
    body?: string;
    manipulationTechniques?: string[];
    targetCompetencies?: string[];
    difficulty?: number;
  }
) {
  const supabase = supabaseServerClient();
  const update: Record<string, unknown> = {};
  if (fields.body !== undefined) update.body = fields.body;
  if (fields.manipulationTechniques !== undefined) update.manipulation_techniques = fields.manipulationTechniques;
  if (fields.targetCompetencies !== undefined) update.target_competencies = fields.targetCompetencies;
  if (fields.difficulty !== undefined) update.difficulty = fields.difficulty;

  const { error } = await supabase.from("content_items").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}

export async function updateContentItemStatusQuick(
  id: string,
  currentStatus: string,
  nextStatus: string
) {
  const supabase = supabaseServerClient();
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Übergang ${currentStatus} -> ${nextStatus} nicht erlaubt`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const update: Record<string, unknown> = { status: nextStatus };
  if (["approved", "live", "rejected"].includes(nextStatus)) {
    update.reviewed_by = user?.id ?? null;
    update.reviewed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("content_items").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}



/**
 * Regenerates a content image using the existing DR1FT Cloudflare FLUX
 * worker and stores the result in the established ambient-assets bucket.
 */
export async function regenerateContentImage(id: string, instructions: string) {
  const supabase = supabaseServerClient();
  const workerUrl = process.env.CLOUDFLARE_AMBIENT_IMAGE_URL?.trim();
  const apiKey = process.env.CLOUDFLARE_AMBIENT_IMAGE_API_KEY?.trim()
    || process.env.AMBIENT_IMAGE_API_KEY?.trim();

  if (!workerUrl || !apiKey) {
    throw new Error("Cloudflare FLUX ist nicht konfiguriert. Bitte CLOUDFLARE_AMBIENT_IMAGE_URL und CLOUDFLARE_AMBIENT_IMAGE_API_KEY in Vercel prüfen.");
  }

  const { data: item, error: itemError } = await supabase
    .from("content_items")
    .select("id, body, media_url, extra")
    .eq("id", id)
    .single();

  if (itemError || !item) throw new Error(itemError?.message ?? "Content-Piece nicht gefunden.");
  if (!item.media_url) throw new Error("Für dieses Content-Piece ist kein Bild hinterlegt.");

  const prompt = [
    "Create an authentic, age-appropriate image for a German media-literacy learning platform.",
    "The image must visually match this social-media post:",
    String(item.body ?? "").slice(0, 2000),
    "Do not render any text, letters, captions, logos, UI text, watermarks, signs, labels, or pseudo-writing. No readable text anywhere. Do not imitate a real person's face.",
    instructions.trim() ? `Additional editorial direction: ${instructions.trim().slice(0, 1000)}` : "",
    "Natural smartphone photography, realistic lighting, candid everyday setting, slightly imperfect framing. Generate only the image."
  ].filter(Boolean).join("\n\n");

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, aspectRatio: "4:5", steps: 4 }),
    cache: "no-store",
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare FLUX Fehler (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }

  const result = await response.json();
  const base64 = typeof result?.image === "string" ? result.image : null;
  if (!base64) throw new Error("Cloudflare FLUX hat kein Bild zurückgegeben.");

  const storagePath = `generated/${new Date().toISOString().slice(0, 10)}/content-${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("ambient-assets")
    .upload(storagePath, Buffer.from(base64, "base64"), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw new Error(`Neues Bild konnte nicht gespeichert werden: ${uploadError.message}`);

  const { data: publicUrl } = supabase.storage.from("ambient-assets").getPublicUrl(storagePath);
  const previousExtra = item.extra && typeof item.extra === "object" ? item.extra : {};
  const nextExtra = {
    ...previousExtra,
    generatedBy: "ai",
    imageProvider: "cloudflare",
    imageModel: "@cf/black-forest-labs/flux-2-klein-4b",
    imageRegeneratedAt: new Date().toISOString(),
    imagePrompt: prompt,
  };

  const { error: updateError } = await supabase
    .from("content_items")
    .update({ media_url: publicUrl.publicUrl, media_type: "image", extra: nextExtra })
    .eq("id", id);

  if (updateError) {
    throw new Error(`Bild wurde gespeichert, konnte aber nicht aktiviert werden: ${updateError.message}`);
  }

  revalidatePath("/content");
  return { mediaUrl: publicUrl.publicUrl };
}
