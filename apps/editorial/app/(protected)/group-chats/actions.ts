// apps/admin/app/group-chats/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
export async function createGroupChat(scenarioId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const participantIds = formData.getAll("participants").map(String);

  if (!title) throw new Error("Titel darf nicht leer sein");

  const { error } = await supabase.from("group_chats").insert({
    scenario_id: scenarioId,
    title,
    participant_creator_ids: participantIds,
    status: "draft",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/group-chats/${scenarioId}`);
}

export async function toggleGroupChatLive(groupChatId: string, scenarioId: string, nextLive: boolean) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("group_chats")
    .update({ status: nextLive ? "live" : "draft" })
    .eq("id", groupChatId);

  if (error) throw new Error(error.message);
  revalidatePath(`/group-chats/${scenarioId}`);
}

/**
 * Fügt eine Nachricht ans Ende der Gruppenchat-Sequenz an. Bewusst
 * linear (kein Verzweigungsbaum wie bei 1:1-DMs) — der Gruppenchat ist
 * primär ein Stimmungsbild/soziale Bewährung, keine individuelle
 * Entscheidungskette.
 */
export async function addGroupChatMessage(
  groupChatId: string,
  scenarioId: string,
  formData: FormData
) {
  const supabase = supabaseServerClient();
  const creatorId = String(formData.get("creatorId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const reactionCount = Number(formData.get("reactionCount") ?? 0);

  if (!body || !creatorId) throw new Error("Absender und Text erforderlich");

  const { data: existing } = await supabase
    .from("content_items")
    .select("sequence_index")
    .eq("group_chat_id", groupChatId)
    .order("sequence_index", { ascending: false })
    .limit(1);

  const nextIndex = existing && existing.length > 0 ? existing[0].sequence_index + 1 : 0;

  const { error } = await supabase.from("content_items").insert({
    type: "dm_message",
    scenario_id: scenarioId,
    creator_id: creatorId,
    group_chat_id: groupChatId,
    sequence_index: nextIndex,
    body,
    extra: reactionCount > 0 ? { reactionCount } : {},
    status: "draft",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/group-chats/${scenarioId}`);
}
