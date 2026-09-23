// ============================================================
// Realtime Event Bridge
//
// DB-domain_events -> app EventBus.
// Runtime events are strictly scoped to the active class instance.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEvent } from "@dr1ft/shared-types";
import { eventBus } from "./eventBus";

interface DomainEventRow {
  event_type: string;
  user_id: string;
  payload: Record<string, unknown>;
}

function getClassInstanceId(payload: Record<string, unknown>): string | null {
  const value = payload.classInstanceId ?? payload.class_instance_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function rowToDomainEvent(row: DomainEventRow, classInstanceId: string): DomainEvent | null {
  const eventInstanceId = getClassInstanceId(row.payload);
  if (!eventInstanceId || eventInstanceId !== classInstanceId) return null;

  switch (row.event_type) {
    case "MissionStarted":
      return {
        type: "MissionStarted",
        userId: row.user_id,
        missionId: String(row.payload.missionId),
        classInstanceId: eventInstanceId,
      };
    case "MissionCompleted":
      return {
        type: "MissionCompleted",
        userId: row.user_id,
        missionId: String(row.payload.missionId),
        classInstanceId: eventInstanceId,
      };
    case "CompetencyUpdated":
      return {
        type: "CompetencyUpdated",
        userId: row.user_id,
        competencyId: String(row.payload.competencyId),
        level: Number(row.payload.level),
        classInstanceId: eventInstanceId,
      };
    default:
      console.warn(`[RealtimeBridge] Unbekannter event_type: ${row.event_type}`);
      return null;
  }
}

/** Startet das Realtime-Abo für Nutzer + aktive Klasseninstanz. */
export function startRealtimeEventBridge(
  supabase: SupabaseClient,
  userId: string,
  classInstanceId: string
): () => void {
  const channel = supabase
    .channel(`domain-events-${userId}-${classInstanceId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "domain_events",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const domainEvent = rowToDomainEvent(payload.new as DomainEventRow, classInstanceId);
        if (domainEvent) eventBus.emit(domainEvent);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
