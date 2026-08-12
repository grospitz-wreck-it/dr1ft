// ============================================================
// NPC Engine
//
// Kein Live-Freitext-Chat mit einer KI-Persona — stattdessen Navigation
// durch einen vorautorierten, redaktionell geprüften Dialogbaum
// (content_items mit extra.replyOptions, siehe 0006_npc_engine.sql).
//
// Zwei Ebenen, wie bei Feed/Mission/Analytics Engine:
// - reine Funktionen (kein I/O) -> unabhängig testbar
// - ein dünner Adapter, der Supabase anspricht und Events emittiert
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentItem, ReplyOption, NpcMessageExtra } from "@dr1ft/shared-types";
import { eventBus } from "./eventBus";

// ---------- Reine Logik ----------

export function getReplyOptions(message: ContentItem): ReplyOption[] {
  const extra = message.extra as NpcMessageExtra | undefined;
  return extra?.replyOptions ?? [];
}

export function isConversationEnd(message: ContentItem): boolean {
  return getReplyOptions(message).length === 0;
}

/**
 * Sucht die nächste Nachricht im bereits geladenen Pool.
 * Gibt null zurück, wenn die Ziel-Nachricht nicht (mehr) live ist —
 * z.B. weil Redaktion sie zurückgezogen hat. Der Adapter fängt das ab
 * und beendet das Gespräch dann sauber statt kaputte Referenzen zu zeigen.
 */
export function resolveNextMessage(
  pool: ContentItem[],
  option: ReplyOption
): ContentItem | null {
  const next = pool.find((item) => item.id === option.nextContentItemId);
  if (!next || next.status !== "live") return null;
  return next;
}

// ---------- Adapter (Supabase-spezifisch) ----------

export interface SelectNpcReplyResult {
  nextMessage: ContentItem | null; // null = Gespräch zu Ende oder Ziel nicht mehr verfügbar
  conversationEnded: boolean;
  /**
   * Gesetzt, wenn die Konversation nicht endgültig zu Ende ist, sondern
   * nach einer Verzögerung mit einer Folgenachricht weitergeht (siehe
   * extra.consequence an der End-Nachricht). UI sollte dann "meldet
   * sich wieder" statt "Gespräch beendet" anzeigen.
   */
  pendingResumeAt?: string;
}

interface ConsequenceExtra {
  contentItemId: string;
  delayHours: number;
}

/**
 * Ermittelt, welche Nachricht beim Öffnen einer Konversation gezeigt
 * werden soll: eine fällige Folgenachricht (Konsequenz), sonst der
 * zuletzt erreichte Punkt, sonst die Startnachricht.
 */
export async function getActiveNpcMessage(
  supabase: SupabaseClient,
  params: { userId: string; creatorId: string; rootMessageId: string }
): Promise<ContentItem | null> {
  const { userId, creatorId, rootMessageId } = params;

  const { data: convo } = await supabase
    .from("user_npc_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  let targetId = rootMessageId;

  if (convo?.pending_resume_at && new Date(convo.pending_resume_at) <= new Date()) {
    targetId = convo.pending_resume_content_id;
    // Konsequenz ist jetzt "angekommen" — Pending-Status auflösen.
    await supabase
      .from("user_npc_conversations")
      .update({
        current_content_item_id: targetId,
        pending_resume_content_id: null,
        pending_resume_at: null,
      })
      .eq("user_id", userId)
      .eq("creator_id", creatorId);
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

/**
 * Wird aufgerufen, wenn der Spieler eine Antwortoption im NPC-Dialog wählt.
 * - lädt die Zielnachricht
 * - persistiert den neuen Gesprächsstand
 * - schreibt eine user_interactions-Zeile (zählt für Mission-Trigger mit)
 * - emittiert lokal + über domain_events indirekt (via user_interactions-Trigger)
 */
export async function selectNpcReply(
  supabase: SupabaseClient,
  params: {
    userId: string;
    creatorId: string;
    chosenOption: ReplyOption;
  }
): Promise<SelectNpcReplyResult> {
  const { userId, creatorId, chosenOption } = params;

  const { data: nextMessage, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", chosenOption.nextContentItemId)
    .eq("status", "live")
    .maybeSingle();

  if (error) {
    console.error("[NpcEngine] Fehler beim Laden der nächsten Nachricht:", error);
  }

  const ended = !nextMessage || isConversationEnd(nextMessage as ContentItem);
  const consequence: ConsequenceExtra | undefined = (nextMessage as any)?.extra?.consequence;

  if (ended && consequence?.contentItemId) {
    // Kein echtes Ende — Konversation läuft nach Verzögerung weiter,
    // die Folgenachricht referenziert die gerade getroffene Entscheidung.
    const resumeAt = new Date(
      Date.now() + (consequence.delayHours ?? 0) * 60 * 60 * 1000
    ).toISOString();

    await supabase.from("user_npc_conversations").upsert(
      {
        user_id: userId,
        creator_id: creatorId,
        current_content_item_id: nextMessage?.id ?? null,
        pending_resume_content_id: consequence.contentItemId,
        pending_resume_at: resumeAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,creator_id" }
    );

    await supabase.from("user_interactions").insert({
      user_id: userId,
      content_item_id: chosenOption.nextContentItemId,
      interaction_type: "comment",
      metadata: { via: "npc_dialog", techniqueTag: chosenOption.techniqueTag ?? null },
    });

    await eventBus.emit({
      type: "NpcReplySelected",
      userId,
      creatorId,
      contentItemId: chosenOption.nextContentItemId,
      techniqueTag: chosenOption.techniqueTag,
    });

    return {
      nextMessage: (nextMessage as ContentItem) ?? null,
      conversationEnded: false,
      pendingResumeAt: resumeAt,
    };
  }

  await supabase.from("user_npc_conversations").upsert(
    {
      user_id: userId,
      creator_id: creatorId,
      current_content_item_id: nextMessage?.id ?? null,
      pending_resume_content_id: null,
      pending_resume_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,creator_id" }
  );

  // zählt für Mission-Trigger (mission_event_to_interaction_type: NpcReplySelected -> 'comment')
  await supabase.from("user_interactions").insert({
    user_id: userId,
    content_item_id: chosenOption.nextContentItemId,
    interaction_type: "comment",
    metadata: { via: "npc_dialog", techniqueTag: chosenOption.techniqueTag ?? null },
  });

  await eventBus.emit({
    type: "NpcReplySelected",
    userId,
    creatorId,
    contentItemId: chosenOption.nextContentItemId,
    techniqueTag: chosenOption.techniqueTag,
  });

  return {
    nextMessage: (nextMessage as ContentItem) ?? null,
    conversationEnded: !nextMessage || isConversationEnd(nextMessage as ContentItem),
  };
}
