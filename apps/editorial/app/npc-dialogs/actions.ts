// apps/admin/app/npc-dialogs/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import type { ReplyOption } from "@dr1ft/shared-types";

/**
 * Legt eine neue Dialog-Nachricht als eigenständigen Knoten an — noch
 * ohne Verknüpfung. Verlinkung passiert separat über updateReplyOptions()
 * an der Nachricht, die auf diese hier verweisen soll (z.B. der Elternknoten).
 */
export async function createNpcMessage(
  scenarioId: string,
  creatorId: string,
  formData: FormData
) {
  const supabase = supabaseServerClient();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Nachricht darf nicht leer sein");

  const { error } = await supabase.from("content_items").insert({
    scenario_id: scenarioId,
    creator_id: creatorId,
    type: "dm_message",
    body,
    extra: {},
    status: "draft",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/npc-dialogs/${creatorId}`);
}

/**
 * Ersetzt die Antwortoptionen (extra.replyOptions) einer Nachricht.
 * Das ist die eigentliche "Verlinkung" im Dialogbaum — visuell über
 * Dropdowns im Builder gepflegt, statt Hand-JSON.
 */
export async function updateReplyOptions(
  messageId: string,
  creatorId: string,
  options: ReplyOption[]
) {
  const supabase = supabaseServerClient();
  const { data: message } = await supabase
    .from("content_items")
    .select("extra")
    .eq("id", messageId)
    .single();

  const { error } = await supabase
    .from("content_items")
    .update({ extra: { ...(message?.extra ?? {}), replyOptions: options } })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  revalidatePath(`/npc-dialogs/${creatorId}`);
}

/**
 * Hängt eine verzögerte Folgenachricht an eine End-Nachricht (ohne
 * weitere replyOptions) — die Konversation läuft dann nach Ablauf der
 * Verzögerung mit dieser Nachricht weiter (siehe getActiveNpcMessage()
 * in packages/engine-core/src/npcEngine.ts).
 */
export async function setConsequence(
  messageId: string,
  creatorId: string,
  consequenceContentItemId: string,
  delayHours: number
) {
  const supabase = supabaseServerClient();
  const { data: message } = await supabase
    .from("content_items")
    .select("extra")
    .eq("id", messageId)
    .single();

  const { error } = await supabase
    .from("content_items")
    .update({
      extra: {
        ...(message?.extra ?? {}),
        consequence: { contentItemId: consequenceContentItemId, delayHours },
      },
    })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  revalidatePath(`/npc-dialogs/${creatorId}`);
}
