// ============================================================
// Feed Engine
// "Die Recommendation-Engine ist ein unsichtbarer Erzähler"
// (06_FEED_PHILOSOPHY_EXTENDED.md)
//
// Diese erste Version ist bewusst simpel und regelbasiert.
// Sie optimiert NICHT auf Engagement, sondern auf Lernfortschritt:
// - vermeidet Wiederholung derselben Manipulationstechnik
// - berücksichtigt Alters-Freigabe
// - bevorzugt Content zu Kompetenzen mit niedrigem Fortschritt
// ============================================================

import type { ContentItem, UserCompetencyProgress, AgeRating } from "@dr1ft/shared-types";

export interface FeedContext {
  userAgeRating: AgeRating;
  competencyProgress: UserCompetencyProgress[];
  recentlySeenContentIds: string[];
  recentTechniques: string[]; // zuletzt gezeigte Manipulationstechniken
  /**
   * Szenario-IDs, die für die Klasse des Nutzers freigeschaltet sind
   * (siehe class_scenario_assignments). Ist dieses Array leer/undefined,
   * wird NICHTS ausgespielt — sicherer Default für den Schulkontext:
   * ohne explizite Lehrkraft-Freigabe kein Content.
   */
  assignedScenarioIds: string[];
  /**
   * Ziel-Anteil an "Signal"-Posts (mit Manipulationstechnik) im Feed,
   * 0–1. Der Rest wird mit Ambient-Content aufgefüllt, damit nicht
   * jeder Post automatisch verdächtig wirkt. Default 0.25 (etwa jeder
   * vierte Post). Kann sich am Kompetenz-Level orientieren — siehe
   * computeAdaptiveSignalRatio().
   */
  signalRatio?: number;
}

const AGE_ORDER: Record<AgeRating, number> = {
  all_ages: 0,
  "12_plus": 1,
  "16_plus": 2,
};

function isAgeAppropriate(item: ContentItem, ctx: FeedContext): boolean {
  return AGE_ORDER[item.ageRating] <= AGE_ORDER[ctx.userAgeRating];
}

function isScenarioAssigned(item: ContentItem, ctx: FeedContext): boolean {
  // Kein Szenario am Content -> Ambient-Content, szenario-unabhängig
  // wiederverwendbar -> immer zulässig (sofern eine Klasse überhaupt
  // mindestens ein Szenario zugewiesen hat, sonst greift ohnehin die
  // sichere Voreinstellung "kein Content ohne Freigabe" weiter oben).
  if (!item.scenarioId) return ctx.assignedScenarioIds.length > 0;
  return ctx.assignedScenarioIds.includes(item.scenarioId);
}

function isSignal(item: ContentItem): boolean {
  return item.manipulationTechniques.length > 0;
}

function scoreItem(item: ContentItem, ctx: FeedContext): number {
  let score = 1;

  // Bereits gesehen -> stark abwerten
  if (ctx.recentlySeenContentIds.includes(item.id)) {
    score -= 5;
  }

  // Gleiche Technik wie zuletzt gezeigt -> leicht abwerten (Abwechslung fördern)
  const overlap = item.manipulationTechniques.filter((t) =>
    ctx.recentTechniques.includes(t)
  ).length;
  score -= overlap * 0.5;

  // Bevorzuge Content, der auf Kompetenzen mit niedrigem Level abzielt
  const lowProgressBoost = item.targetCompetencies.reduce((acc, compId) => {
    const progress = ctx.competencyProgress.find((p) => p.competencyId === compId);
    const level = progress?.level ?? 1;
    return acc + (5 - level) * 0.3;
  }, 0);
  score += lowProgressBoost;

  return score;
}

/**
 * Wählt die nächsten Feed-Items aus einem Pool von "live" Content.
 * Diese Funktion ist reine Logik (kein DB-Zugriff) -> gut testbar.
 */
/**
 * Mischt Signal- (manipulativ) und Ambient-Content (neutral) so, dass:
 * - nie zwei Signal-Posts direkt hintereinander erscheinen (kein
 *   erkennbares "jetzt kommt garantiert wieder was Verdächtiges"-Muster)
 * - die Ziel-Quote im Schnitt eingehalten wird, aber mit Zufallsstreuung
 *   statt starrem Takt (sonst wäre der TAKT selbst das erkennbare Muster)
 * - kein Bias eingebaut ist, der erraten lässt, wann der nächste
 *   Signal-Post kommt
 */
function interleaveByRatio(
  signal: ContentItem[],
  ambient: ContentItem[],
  ratio: number,
  count: number
): ContentItem[] {
  const result: ContentItem[] = [];
  const sig = [...signal];
  const amb = [...ambient];
  let lastWasSignal = false;

  while (result.length < count && (sig.length > 0 || amb.length > 0)) {
    const wantSignal = Math.random() < ratio;
    const canUseSignal = sig.length > 0 && !lastWasSignal && (wantSignal || amb.length === 0);
    const canUseAmbient = amb.length > 0;

    if (canUseSignal) {
      result.push(sig.shift()!);
      lastWasSignal = true;
    } else if (canUseAmbient) {
      result.push(amb.shift()!);
      lastWasSignal = false;
    } else if (sig.length > 0) {
      // nur noch Signal übrig, auch wenn das Zwei-hintereinander-Verbot
      // dadurch zwangsläufig gebrochen wird — besser als leeren Feed
      result.push(sig.shift()!);
      lastWasSignal = true;
    } else {
      break;
    }
  }

  return result;
}

export function selectNextFeedItems(
  pool: ContentItem[],
  ctx: FeedContext,
  count: number
): ContentItem[] {
  const eligible = pool.filter(
    (item) =>
      item.status === "live" &&
      isAgeAppropriate(item, ctx) &&
      isScenarioAssigned(item, ctx)
  );

  const scored = eligible
    .map((item) => ({ item, score: scoreItem(item, ctx) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);

  const signal = scored.filter(isSignal);
  const ambient = scored.filter((item) => !isSignal(item));

  return interleaveByRatio(signal, ambient, ctx.signalRatio ?? 0.25, count);
}

/**
 * Adaptive Quote: wer noch wenig Kompetenz-Fortschritt hat, sieht
 * anteilig mehr Ambient-Content (leichterer Einstieg, siehe
 * "Progressive Disclosure" in 04_DESIGN_PRINCIPLES). Steigt der
 * durchschnittliche Kompetenz-Level, steigt auch die Signal-Quote.
 */
export function computeAdaptiveSignalRatio(
  competencyProgress: UserCompetencyProgress[]
): number {
  if (competencyProgress.length === 0) return 0.15;
  const avgLevel =
    competencyProgress.reduce((sum, p) => sum + p.level, 0) / competencyProgress.length;
  // Level 1 -> ~0.15, Level 5 -> ~0.35
  return Math.min(0.35, 0.1 + avgLevel * 0.05);
}
