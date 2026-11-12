// ============================================================
// Narrative Engine — Referenzlogik
//
// Die eigentliche Freischaltung läuft in Postgres (siehe
// 0007_narrative_engine.sql: start_arc_for_user, advance_story_arc_after_mission),
// weil sie atomar mit dem Mission-Abschluss passieren muss (derselbe
// Grund wie bei Mission/Analytics Engine). Diese Datei bildet dieselbe
// Sequenz-Logik rein ab — nützlich für eine Admin-Vorschau
// ("Wie sieht der Story-Verlauf für diese Arc aus?") ohne Datenbank.
// ============================================================

export interface ArcStepDef {
  orderIndex: number;
  missionId: string;
  missionTitle: string;
}

export interface ArcPreviewResult {
  orderedSteps: ArcStepDef[];
  isSequential: boolean; // Warnung, falls order_index Lücken hat
}

/**
 * Prüft und sortiert die Schritte einer Arc für die Admin-Vorschau.
 * Erkennt Lücken in der Reihenfolge (z.B. 0, 1, 3 statt 0, 1, 2),
 * die in der DB zu einer "hängenden" Freischaltung führen würden.
 */
export function previewArcSequence(steps: ArcStepDef[]): ArcPreviewResult {
  const sorted = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
  const isSequential = sorted.every((step, i) => step.orderIndex === i);
  return { orderedSteps: sorted, isSequential };
}

/**
 * Simuliert, welche Mission nach Abschluss von `completedMissionId`
 * als Nächstes freigeschaltet würde — für die Admin-Vorschau.
 */
export function previewNextUnlock(
  steps: ArcStepDef[],
  completedMissionId: string
): ArcStepDef | null {
  const { orderedSteps } = previewArcSequence(steps);
  const currentIndex = orderedSteps.findIndex((s) => s.missionId === completedMissionId);
  if (currentIndex === -1) return null;
  return orderedSteps[currentIndex + 1] ?? null;
}
