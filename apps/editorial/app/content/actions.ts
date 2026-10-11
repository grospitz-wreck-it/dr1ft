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
 * Erzeugt eine neue Bildvariante über Gemini Image und speichert sie als
 * neues Asset. Das bestehende Bild wird nicht überschrieben; die neue URL
 * wird erst nach erfolgreicher Generierung und Speicherung aktiviert.
 */
export async function regenerateContentImage(id: string, instructions: string) {
  const supabase = supabaseServerClient();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY ist nicht gesetzt.");

  const { data: item, error: itemError } = await supabase
    .from("content_items")
    .select("id, body, media_url, extra")
    .eq("id", id)
    .single();

  if (itemError || !item) throw new Error(itemError?.message ?? "Content-Piece nicht gefunden.");
  if (!item.media_url) throw new Error("Für dieses Content-Piece ist kein Bild hinterlegt.");

  const prompt = [
    "Create a polished, age-appropriate editorial illustration/photo for a German media-literacy learning platform.",
    "Image content must match this social media post:",
    String(item.body ?? "").slice(0, 2000),
    "IMPORTANT TEXT RULE: Do not render any letters, words, captions, logos, UI text, watermarks, signs, labels, or pseudo-writing in the image. Leave any text areas blank. Do not invent text.",
    "Keep people fictional and non-identifiable. Do not imitate a real person's face.",
    instructions.trim() ? `Additional editorial direction: ${instructions.trim().slice(0, 1000)}` : "",
    "Generate only the image, without an explanation."
  ].filter(Boolean).join("\n\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(90000),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Bildgenerierung fehlgeschlagen: ${details.slice(0, 500)}`);
  }

  const result = await response.json();
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part: any) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Der Bildgenerator hat keine Bilddatei zurückgegeben.");
  }

  const mimeType = String(imagePart.inlineData.mimeType ?? "image/png");
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
  const bytes = Buffer.from(imagePart.inlineData.data, "base64");
  const storagePath = `${id}/regenerated-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("content-media")
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

  if (uploadError) throw new Error(`Neues Bild konnte nicht gespeichert werden: ${uploadError.message}`);

  const { data: publicUrl } = supabase.storage.from("content-media").getPublicUrl(storagePath);
  const previousExtra = item.extra && typeof item.extra === "object" ? item.extra : {};
  const nextExtra = {
    ...previousExtra,
    generatedBy: "ai",
    imageProvider: "gemini",
    imageModel: "gemini-2.5-flash-image",
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
