// Shared language guidance for DR1FT ambient-content generation.
// Kept deliberately deterministic so the editorial generator receives the
// same age/slang/typo guidance for every draft batch.

const AGE_GUIDANCE: Record<string, string> = {
  "12_13": "Sehr verständlich, alltagsnah und altersgerecht. Slang sparsam und kontextabhängig.",
  "14_15": "Natürlich jugendlich, aber nicht als Klischee. Mischung aus Standardsprache, Messenger-Sprache und einzelnen passenden Slang-Signalen.",
  "16_17": "Breiteres Register: Standardsprache, Messenger-Kürzungen, Anglizismen und gelegentlicher Slang je nach Stimme.",
  "18_plus": "Natürliches junges Erwachsenen-Register. Slang und Internet-Sprache nur dort, wo Stimme und Kontext es tragen.",
  all: "Altersneutrale, leicht verständliche Alltagssprache; jugendsprachliche Signale nur sehr sparsam.",
};

const LEVEL_GUIDANCE = [
  "keine zusätzlichen Signale",
  "gelegentliche passende Signale",
  "deutlich erkennbares, aber natürliches Register",
  "stark ausgeprägtes Register, ohne künstliche Slang-Häufung",
];

export function buildAmbientLanguagePrompt(
  ageBand: string,
  slangLevel: number,
  typoLevel: number
): string {
  const safeSlang = Math.min(3, Math.max(0, Number(slangLevel) || 0));
  const safeTypo = Math.min(3, Math.max(0, Number(typoLevel) || 0));

  return [
    "SPRACHBIBLIOTHEK",
    `- Altersgruppe: ${AGE_GUIDANCE[ageBand] ?? AGE_GUIDANCE.all}`,
    `- Jugendsprache-Level ${safeSlang}/3: ${LEVEL_GUIDANCE[safeSlang]}`,
    `- Tippfehler-Level ${safeTypo}/3: ${safeTypo === 0 ? "keine absichtlichen Tippfehler" : safeTypo === 1 ? "sehr seltene natürliche Vertipper" : safeTypo === 2 ? "gelegentliche natürliche Vertipper, ohne Lesbarkeit zu beeinträchtigen" : "mehrere, aber weiterhin plausible natürliche Vertipper"}`,
    "- Keine künstliche Ansammlung aktueller Jugendwörter.",
    "- Sprachsignale müssen zur Person, Situation und Textlänge passen.",
    "- Tippfehler niemals als Ersatz für natürliche Sprache verwenden.",
  ].join("\n");
}
