// ============================================================
// recordInteraction
//
// Zentraler Ort, an dem eine Nutzer-Interaktion entsteht:
// 1. wird als user_interactions-Zeile persistiert (löst dadurch den
//    DB-Trigger für die Mission-Auswertung aus, siehe 0004_mission_engine.sql)
// 2. wird sofort auch lokal auf dem EventBus emittiert, damit die App
//    (z.B. Feed Engine für "recentlySeenContentIds") ohne Wartezeit
//    auf den Realtime-Roundtrip reagieren kann.
//
// Ergebnis: lokale Reaktionen sind sofort, geräteübergreifende/
// engine-getriebene Reaktionen (Mission Engine) kommen kurz danach
// über die Realtime-Brücke nach.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InteractionType } from "@dr1ft/shared-types";
import { eventBus } from "./eventBus";

export async function recordInteraction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    contentItemId: string;
    interactionType: InteractionType;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { userId, contentItemId, interactionType, metadata = {} } = params;

  // Sofortige lokale Reaktion (z.B. Feed Engine merkt sich "gesehen")
  if (interactionType === "view") {
    await eventBus.emit({ type: "PostViewed", userId, contentItemId });
  } else if (interactionType === "comment") {
    await eventBus.emit({
      type: "CommentCreated",
      userId,
      contentItemId,
      body: String(metadata.body ?? ""),
    });
  }

  // Persistieren -> löst DB-seitige Mission-Auswertung aus
  const { error } = await supabase.from("user_interactions").insert({
    user_id: userId,
    content_item_id: contentItemId,
    interaction_type: interactionType,
    metadata,
  });

  if (error) {
    console.error("[recordInteraction] Fehler beim Speichern:", error);
  }
}
