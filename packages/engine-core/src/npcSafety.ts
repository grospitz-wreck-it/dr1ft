// ============================================================
// DR1FT — NPC Communication Safety
// ============================================================
// NPCs may have a pointed worldview, but their communication remains
// suitable for a school simulation. This is a hard runtime boundary,
// not a personality suggestion.

export type NpcSafetyDecision = {
  allowed: boolean;
  text: string;
  reason?: string;
};

const HARD_BLOCK = [
  /\b(kill|murder|rape|suicide|bomb|shoot|stab)\b/i,
  /\b(hate|destroy)\s+(all|every|those)\b/i,
  /\b(go|drop)\s+dead\b/i,
  /\b(nazi|heil\s+hitler)\b/i,
];

const ABUSE_PATTERNS = [
  /\bidiot|moron|loser|retard\b/i,
  /\bshut\s+up\b/i,
  /\bkill\s+yourself\b/i,
];

const TARGETED_HARASSMENT = [
  /\byou\s+(are|re)\s+(worthless|disgusting|pathetic)\b/i,
  /\bno\s+one\s+(likes|needs|wants)\s+you\b/i,
];

/**
 * Last-mile guard for generated NPC text. The model is allowed to be
 * opinionated, skeptical or provocative about ideas, but not abusive,
 * threatening or personally degrading toward students/groups.
 */
export function guardNpcCommunication(input: string): NpcSafetyDecision {
  const text = input.trim();
  if (!text) return { allowed: false, text: "", reason: "empty" };
  if (text.length > 500) return { allowed: false, text: "", reason: "too_long" };
  if (HARD_BLOCK.some((pattern) => pattern.test(text))) {
    return { allowed: false, text: "", reason: "hard_block" };
  }
  if (ABUSE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { allowed: false, text: "", reason: "abusive_language" };
  }
  if (TARGETED_HARASSMENT.some((pattern) => pattern.test(text))) {
    return { allowed: false, text: "", reason: "targeted_harassment" };
  }
  return { allowed: true, text };
}

/**
 * Prompt boundary used for every Gemini NPC generation call.
 * Political/worldview sharpness is allowed; personal attacks are not.
 */
export const NPC_COMMUNICATION_SAFETY = `
KOMMUNIKATIONSREGELN — HARTE GRENZE:
- Der NPC darf politisch, gesellschaftlich oder weltanschaulich eine klare und auch spitze Meinung vertreten.
- Er darf einer Idee widersprechen, skeptisch sein oder etwas pointiert formulieren.
- Er darf NICHT Schüler persönlich beleidigen, bedrohen, entwürdigen oder gezielt fertig machen.
- Keine Gewaltandrohungen, Selbstverletzungsaufforderungen, sexualisierten Inhalte oder menschenfeindlichen Aufrufe.
- Kein gezieltes Mobbing gegen einzelne Schüler oder geschützte Gruppen.
- Keine Eskalationsspirale: Bei Provokation wird der NPC höchstens kurz gereizt oder zieht sich zurück.
- Wenn eine Antwort zu aggressiv würde, formuliere sie sachlich-spitz um oder wähle IGNORE.
- Kommunikation bleibt kurz, glaubwürdig und für eine schulische Simulation geeignet.
`;
