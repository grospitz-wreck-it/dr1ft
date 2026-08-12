// ============================================================
// Analytics Engine — Referenzlogik
//
// Die eigentliche Berechnung läuft in Postgres (siehe
// 0005_analytics_engine.sql, compute_competency_level()), damit
// Kompetenz-Fortschritt und Mission-Abschluss atomar in einer
// Transaktion passieren. Diese Datei spiegelt dieselbe Formel in
// TypeScript — NICHT als zweite Laufzeit-Quelle der Wahrheit, sondern
// für:
//
// - Vorschau im Admin-Dashboard ("Was würde bei Abschluss von Mission X
//   für die Kompetenz Y passieren?"), ohne DB-Roundtrip
// - Unit-Tests der Formel, ohne eine echte Postgres-Instanz zu brauchen
//
// Bei Änderung der Formel: IMMER beide Stellen synchron halten
// (SQL ist die Quelle, die live wirkt).
// ============================================================

/**
 * Muss exakt compute_competency_level() aus 0005_analytics_engine.sql
 * entsprechen.
 */
export function computeCompetencyLevel(evidenceCount: number): 1 | 2 | 3 | 4 | 5 {
  const level = Math.min(5, Math.max(1, 1 + Math.floor(evidenceCount / 2)));
  return level as 1 | 2 | 3 | 4 | 5;
}

/**
 * Simuliert, auf welches Level eine Kompetenz nach Abschluss einer
 * weiteren Mission springen würde — für die Admin-Vorschau.
 */
export function previewNextLevel(currentEvidenceCount: number): {
  currentLevel: 1 | 2 | 3 | 4 | 5;
  nextLevel: 1 | 2 | 3 | 4 | 5;
  willLevelUp: boolean;
} {
  const currentLevel = computeCompetencyLevel(currentEvidenceCount);
  const nextLevel = computeCompetencyLevel(currentEvidenceCount + 1);
  return { currentLevel, nextLevel, willLevelUp: nextLevel > currentLevel };
}
