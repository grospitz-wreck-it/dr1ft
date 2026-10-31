// ============================================================
// recordInteraction
//
// Zentraler Ort, an dem eine Nutzer-Interaktion entsteht.
// Runtime-Interaktionen werden immer einer konkreten Klasseninstanz
// zugeordnet. Dadurch bleiben Social Data und Analytics innerhalb
// des jeweiligen Klassen-Ökosystems isoliert.
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
    classInstanceId: string;
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const {
    userId,
    contentItemId,
    interactionType,
    classInstanceId,
    metadata = {},
  } = params;

  // Persist first: the database trigger evaluates mission progress from this
  // row. Publishing before the insert could advance local engines even when
  // the durable interaction (and its mission trigger) failed.
  const { error } = await supabase.from("user_interactions").insert({
    user_id: userId,
    content_item_id: contentItemId,
    interaction_type: interactionType,
    class_instance_id: classInstanceId,
    metadata,
  });

  if (error) {
    console.error("[recordInteraction] Fehler beim Speichern:", error);
    return false;
  }

  // Local app engines are notified only after the database accepted the row.
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

  return true;
}
