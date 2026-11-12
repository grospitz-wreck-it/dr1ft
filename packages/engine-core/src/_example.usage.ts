// ============================================================
// Beispiel: So werden zukünftige Engines an den Event-Bus angeschlossen.
// Diese Datei wird NICHT exportiert — dient nur als Referenz/Vorlage
// für Mission Engine, Analytics Engine, NPC Engine, Narrative Engine.
// ============================================================

import { eventBus } from "./eventBus";

// --- Beispiel: Mission Engine reagiert auf PostViewed ---
eventBus.on("PostViewed", async (event) => {
  // event ist hier typsicher auf { type: "PostViewed", userId, contentItemId } eingeschränkt
  // z.B.: prüfen, ob dadurch eine Mission getriggert wird
  console.log(`[MissionEngine] Post ${event.contentItemId} von ${event.userId} angesehen`);
});

// --- Beispiel: Analytics Engine reagiert auf CompetencyUpdated ---
eventBus.on("CompetencyUpdated", async (event) => {
  console.log(
    `[AnalyticsEngine] Kompetenz ${event.competencyId} von ${event.userId} auf Level ${event.level}`
  );
});

// --- Auslösen eines Events (z.B. aus der Mobile-App beim Scrollen im Feed) ---
async function example() {
  await eventBus.emit({
    type: "PostViewed",
    userId: "user-123",
    contentItemId: "content-abc",
  });
}
