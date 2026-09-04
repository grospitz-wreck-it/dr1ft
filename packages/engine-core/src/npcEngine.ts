// ============================================================
// NPC Engine
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentItem, ReplyOption, NpcMessageExtra } from "@dr1ft/shared-types";
import { eventBus } from "./eventBus";

export function getReplyOptions(message: ContentItem): ReplyOption[] {
  const extra = message.extra as NpcMessageExtra | undefined;
  return extra?.replyOptions ?? [];
}

export function isConversationEnd(message: ContentItem): boolean {
  return getReplyOptions(message).length === 0;
}

export function resolveNextMessage(pool: ContentItem[], option: ReplyOption): ContentItem | null {
  const next = pool.find((item) => item.id === option.nextContentItemId);
  if (!next || next.status !== "live") return null;
  return next;
}

export interface SelectNpcReplyResult {
  nextMessage: ContentItem | null;
  conversationEnded: boolean;
  pendingResumeAt?: string;
}

interface ConsequenceExtra {
  contentItemId: string;
  delayHours: number;
}

export async function getActiveNpcMessage(
  supabase: SupabaseClient,
  params: { userId: string; creatorId: string; rootMessageId: string; classInstanceId: string }
): Promise<ContentItem | null> {
  const { userId, creatorId, rootMessageId, classInstanceId } = params;

  const { data: convo } = await supabase
    .from("user_npc_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .eq("class_instance_id", classInstanceId)
    .maybeSingle();

  let targetId = rootMessageId;

  if (convo?.pending_resume_at && new Date(convo.pending_resume_at) <= new Date()) {
    targetId = convo.pending_resume_content_id;
    await supabase
      .from("user_npc_conversations")
      .update({ current_content_item_id: targetId, pending_resume_content_id: null, pending_resume_at: null })
      .eq("user_id", userId)
      .eq("creator_id", creatorId)
      .eq("class_instance_id", classInstanceId);
  } else if (convo?.current_content_item_id && !convo.pending_resume_at) {
    targetId = convo.current_content_item_id;
  }

  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", targetId)
    .eq("status", "live")
    .maybeSingle();

  return (data as unknown as ContentItem) ?? null;
}

export async function selectNpcReply(
  supabase: SupabaseClient,
  params: {
    userId: string;
    creatorId: string;
    chosenOption: ReplyOption;
    classInstanceId: string;
  }
): Promise<SelectNpcReplyResult> {
  const { userId, creatorId, chosenOption, classInstanceId } = params;

  const { data: membership } = await supabase
    .from("class_instance_memberships")
    .select("id")
    .eq("class_instance_id", classInstanceId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) return { nextMessage: null, conversationEnded: true };

  const { data: nextMessage, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", chosenOption.nextContentItemId)
    .eq("status", "live")
    .maybeSingle();

  if (error) console.error("[NpcEngine] Fehler beim Laden der nächsten Nachricht:", error);

  const ended = !nextMessage || isConversationEnd(nextMessage as ContentItem);
  const consequence: ConsequenceExtra | undefined = (nextMessage as any)?.extra?.consequence;
  const resumeAt = ended && consequence?.contentItemId
    ? new Date(Date.now() + (consequence.delayHours ?? 0) * 60 * 60 * 1000).toISOString()
    : null;

  await supabase.from("user_npc_conversations").upsert(
    {
      user_id: userId,
      creator_id: creatorId,
      class_instance_id: classInstanceId,
      current_content_item_id: nextMessage?.id ?? null,
      pending_resume_content_id: resumeAt ? consequence!.contentItemId : null,
      pending_resume_at: resumeAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,creator_id,class_instance_id" }
  );

  await supabase.from("user_interactions").insert({
    user_id: userId,
    content_item_id: chosenOption.nextContentItemId,
    interaction_type: "comment",
    class_instance_id: classInstanceId,
    metadata: { via: "npc_dialog", techniqueTag: chosenOption.techniqueTag ?? null },
  });

  await eventBus.emit({
    type: "NpcReplySelected",
    userId,
    creatorId,
    contentItemId: chosenOption.nextContentItemId,
    classInstanceId,
    techniqueTag: chosenOption.techniqueTag,
  });

  return {
    nextMessage: (nextMessage as ContentItem) ?? null,
    conversationEnded: resumeAt ? false : !nextMessage || isConversationEnd(nextMessage as ContentItem),
    ...(resumeAt ? { pendingResumeAt: resumeAt } : {}),
  };
}
