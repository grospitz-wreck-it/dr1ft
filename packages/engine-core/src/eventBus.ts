// ============================================================
// Event Bus
// Kernstück der Event-Driven Architecture (09_ARCHITECTURE_PHILOSOPHY)
//
// Engines abonnieren Events statt sich direkt gegenseitig aufzurufen.
// Das hält Feed-, Mission-, Analytics-, NPC- und Narrative-Engine
// entkoppelt und unabhängig testbar.
// ============================================================

import type { DomainEvent } from "@dr1ft/shared-types";

type EventType = DomainEvent["type"];

// Extrahiert den passenden Event-Typ anhand des "type"-Diskriminators
type EventOf<T extends EventType> = Extract<DomainEvent, { type: T }>;

type Handler<T extends EventType> = (event: EventOf<T>) => void | Promise<void>;

export class EventBus {
  private handlers: Map<EventType, Set<Handler<any>>> = new Map();

  /**
   * Registriert einen Handler für einen bestimmten Event-Typ.
   * Gibt eine Unsubscribe-Funktion zurück.
   */
  on<T extends EventType>(type: T, handler: Handler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * Veröffentlicht ein Event an alle registrierten Handler.
   * Handler laufen unabhängig voneinander — ein Fehler in einem Handler
   * darf die anderen nicht blockieren (wichtig bei mehreren Engines).
   */
  async emit(event: DomainEvent): Promise<void> {
    const handlerSet = this.handlers.get(event.type);
    if (!handlerSet || handlerSet.size === 0) return;

    const results = await Promise.allSettled(
      Array.from(handlerSet).map((handler) => handler(event))
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        // Zentrales Fehler-Logging statt stillem Verschlucken.
        // In Produktion: an Logging-/Monitoring-Dienst weiterreichen.
        console.error("[EventBus] Handler-Fehler:", result.reason);
      }
    });
  }

  /**
   * Entfernt alle Handler (z.B. nützlich in Tests).
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Ein einziger, geteilter Bus für die gesamte Runtime (App bzw. Edge Function).
// Engines importieren diese Instanz statt eigene Busse zu erzeugen.
export const eventBus = new EventBus();
