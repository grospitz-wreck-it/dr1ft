// ============================================================
// DR1FT — Session Duration Engine
//
// Pure calculation layer. Keine DB-/UI-Abhängigkeit.
// Die Werte sind bewusst Erwartungswerte, keine Behauptung über
// reales Jugendverhalten. Später können sie mit Telemetrie kalibriert werden.
// ============================================================

export type SessionContentType =
  | "post"
  | "comment"
  | "dm_message"
  | "reflection_prompt"
  | "mission"
  | "minigame";

export interface EngagementProfile {
  /** Erwartete Sekunden, wenn der Inhalt tatsächlich betrachtet wird. */
  readSeconds?: number;
  /** Zusätzliche Sekunden für eine aktive Interaktion. */
  interactionSeconds?: number;
  /** Wahrscheinlichkeit, dass der Inhalt nur überflogen/weitergescrollt wird. 0..1 */
  scrollProbability?: number;
  /** Wahrscheinlichkeit einer erneuten Betrachtung/Interaktion. 0..1 */
  repeatProbability?: number;
  /** Zusätzliche Zeit für Feed-Navigation/Scrollen in Sekunden. */
  scrollSeconds?: number;
}

export interface DurationContentItem {
  id: string;
  type: SessionContentType | string;
  body?: string | null;
  mediaType?: "image" | "video" | null;
  engagementProfile?: EngagementProfile | null;
}

export interface DurationEstimate {
  contentId: string;
  type: string;
  expectedSeconds: number;
  readSeconds: number;
  interactionSeconds: number;
  scrollSeconds: number;
  engagementProbability: number;
}

export interface SessionDurationEstimate {
  targetSeconds: number;
  expectedSeconds: number;
  expectedMinutes: number;
  deltaSeconds: number;
  coverage: number;
  items: DurationEstimate[];
}

const DEFAULT_PROFILES: Record<string, Required<EngagementProfile>> = {
  post: {
    readSeconds: 4,
    interactionSeconds: 0,
    scrollProbability: 0.62,
    repeatProbability: 0.04,
    scrollSeconds: 1.4,
  },
  comment: {
    readSeconds: 2.5,
    interactionSeconds: 0,
    scrollProbability: 0.72,
    repeatProbability: 0.02,
    scrollSeconds: 1.1,
  },
  dm_message: {
    readSeconds: 5,
    interactionSeconds: 3,
    scrollProbability: 0.18,
    repeatProbability: 0.08,
    scrollSeconds: 0.8,
  },
  reflection_prompt: {
    readSeconds: 8,
    interactionSeconds: 35,
    scrollProbability: 0.05,
    repeatProbability: 0.12,
    scrollSeconds: 0,
  },
  mission: {
    readSeconds: 6,
    interactionSeconds: 20,
    scrollProbability: 0.05,
    repeatProbability: 0.05,
    scrollSeconds: 0,
  },
  minigame: {
    readSeconds: 3,
    interactionSeconds: 45,
    scrollProbability: 0.04,
    repeatProbability: 0.1,
    scrollSeconds: 0,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampSeconds(value: unknown, fallback: number, max = 300): number {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, 0, max) : fallback;
}

function profileFor(item: DurationContentItem): Required<EngagementProfile> {
  const base = DEFAULT_PROFILES[item.type] ?? DEFAULT_PROFILES.post;
  const custom = item.engagementProfile ?? {};

  return {
    readSeconds: clampSeconds(custom.readSeconds, base.readSeconds),
    interactionSeconds: clampSeconds(custom.interactionSeconds, base.interactionSeconds),
    scrollProbability: clamp(Number(custom.scrollProbability ?? base.scrollProbability), 0, 1),
    repeatProbability: clamp(Number(custom.repeatProbability ?? base.repeatProbability), 0, 1),
    scrollSeconds: clampSeconds(custom.scrollSeconds, base.scrollSeconds, 30),
  };
}

/**
 * Schätzt die erwartete Zeit eines einzelnen Items.
 *
 * Ein Feed-Item wird nicht automatisch vollständig gelesen:
 * Bei hoher scrollProbability entsteht überwiegend eine kurze Scan-/Scrollzeit.
 * Bei interaktiven Items bleibt die Interaktionszeit dagegen erhalten.
 */
export function estimateContentDuration(item: DurationContentItem): DurationEstimate {
  const profile = profileFor(item);
  const engagementProbability = 1 - profile.scrollProbability;

  const expectedRead =
    profile.readSeconds * engagementProbability;

  const expectedScroll =
    profile.scrollSeconds * profile.scrollProbability;

  const expectedInteraction =
    profile.interactionSeconds *
    engagementProbability *
    (1 + profile.repeatProbability * 0.5);

  const expectedSeconds = Math.max(
    0.5,
    expectedRead + expectedScroll + expectedInteraction,
  );

  return {
    contentId: item.id,
    type: item.type,
    expectedSeconds: round(expectedSeconds),
    readSeconds: round(expectedRead),
    interactionSeconds: round(expectedInteraction),
    scrollSeconds: round(expectedScroll),
    engagementProbability: round(engagementProbability, 3),
  };
}

/**
 * Berechnet die erwartete Sessiondauer für einen Content-Pool.
 * Zielzeit ist eine redaktionelle Vorgabe; coverage > 1 bedeutet,
 * dass der vorhandene Pool die Zielzeit rechnerisch bereits abdeckt.
 */
export function estimateSessionDuration(
  targetDurationMinutes: number,
  items: DurationContentItem[],
): SessionDurationEstimate {
  const safeTargetMinutes = clamp(
    Number.isFinite(targetDurationMinutes) ? targetDurationMinutes : 25,
    5,
    90,
  );

  const estimates = items.map(estimateContentDuration);
  const expectedSeconds = round(
    estimates.reduce((sum, item) => sum + item.expectedSeconds, 0),
  );
  const targetSeconds = safeTargetMinutes * 60;

  return {
    targetSeconds,
    expectedSeconds,
    expectedMinutes: round(expectedSeconds / 60, 1),
    deltaSeconds: expectedSeconds - targetSeconds,
    coverage: round(expectedSeconds / targetSeconds, 3),
    items: estimates,
  };
}

export function getDefaultEngagementProfile(
  type: SessionContentType | string,
): Required<EngagementProfile> {
  return { ...(DEFAULT_PROFILES[type] ?? DEFAULT_PROFILES.post) };
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
