// ============================================================
// Realtime Event Bridge
//
// Verbindet die DB-seitige domain_events-Tabelle (siehe
// 0004_mission_engine.sql) mit dem app-seitigen EventBus.
//
// Warum diese Brücke statt direktem DB-Zugriff pro Engine:
// Analytics-, NPC- und Narrative-Engine sollen nur DomainEvent-Objekte
// kennen (siehe shared-types), nicht Supabase/SQL. Das hält sie
// austauschbar und einfach zu testen (siehe eventBus.ts / feedEngine.ts).
//
// Aktuell wird nur "MissionCompleted" aus der DB gespeist, da das die
// bislang einzige Engine ist, deren Logik in Postgres läuft. Events wie
// "PostViewed" entstehen weiterhin direkt in der App (siehe unten) und
// müssen NICHT über die DB rückübersetzt werden.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEvent } from "@dr1ft/shared-types";
import { eventBus } from "./eventBus";

interface DomainEventRow {
  event_type: string;
  user_id: string;
  payload: Record<string, unknown>;
}

function rowToDomainEvent(row: DomainEventRow): DomainEvent | null {
  switch (row.event_type) {
    case "MissionStarted":
      return {
        type: "MissionStarted",
        userId: row.user_id,
        missionId: String(row.payload.missionId),
      };
    case "MissionCompleted":
      return {
        type: "MissionCompleted",
        userId: row.user_id,
        missionId: String(row.payload.missionId),
      };
    case "CompetencyUpdated":
      return {
        type: "CompetencyUpdated",
        userId: row.user_id,
        competencyId: String(row.payload.competencyId),
        level: Number(row.payload.level),
      };
    default:
      // Unbekannter Event-Typ (z.B. zukünftige Erweiterung) -> bewusst
      // ignorieren statt zu crashen, nur loggen.
      console.warn(`[RealtimeBridge] Unbekannter event_type: ${row.event_type}`);
      return null;
  }
}

/**
 * Startet das Realtime-Abo für den aktuell eingeloggten Nutzer.
 * Gibt eine Cleanup-Funktion zurück (z.B. für useEffect-Rückgabe).
 */
export function startRealtimeEventBridge(
  supabase: SupabaseClient,
  userId: string
): () => void {
  const channel = supabase
    .channel(`domain-events-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "domain_events",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const domainEvent = rowToDomainEvent(payload.new as DomainEventRow);
        if (domainEvent) {
          eventBus.emit(domainEvent);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
