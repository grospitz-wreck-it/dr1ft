// apps/admin/app/content/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
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
