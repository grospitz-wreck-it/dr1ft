// DR1FT Ambient Language Library
// Source-grounded prompt knowledge. This is guidance, not a dictionary to copy verbatim.
// Sources reviewed 2026-08-30:
// - BachelorPrint: Jugendsprache – Definition, Funktion & Beispiele
// - QuillBot: Jugendsprache | Liste, Merkmale & Beispiele
// - Simon Schnetzer: Jugendwörter 2026 – Wie gut erkennt KI die Trends?
// - PONS/Langenscheidt: Jugendwort des Jahres 2026 – Top 10

export const AMBIENT_LANGUAGE_LIBRARY = {
  principles: [
    "Jugendsprache ist kein einheitlicher Dialekt. Alter, Region, soziales Umfeld, Interessen und Online-Communities beeinflussen die tatsächliche Sprache.",
    "Jugendsprache ist schnelllebig: aktuelle Begriffe können kurzfristig stark verbreitet und danach wieder unüblich sein.",
    "Social Media, Gaming, Musik, Serien und Popkultur wirken als starke Sprach- und Meme-Treiber.",
    "Typische Signale sind Anglizismen, Abkürzungen/Akronyme, Neologismen, Eindeutschungen, Slang, Füllwörter, unvollständige Sätze, bildhafte Sprache, Übertreibungen und Ironie.",
    "Sprachökonomie ist wichtig: kurze, fragmentarische Aussagen können natürlicher wirken als vollständige Standardsätze.",
    "Jugendsprachliche Ausdrücke können Zugehörigkeit markieren. Sie dürfen deshalb kontextabhängig und sozial unterschiedlich verwendet werden.",
    "Ironie und Mehrdeutigkeit sind häufig wichtiger als die wörtliche Bedeutung eines Ausdrucks. Kontext entscheidet.",
    "Nicht jeder Jugendliche nutzt Jugendsprache stark. Ein glaubwürdiger Feed braucht auch komplett normale Standardsprache.",
  ],
  authenticityRules: [
    "Nie eine feste Liste von Jugendwörtern abarbeiten.",
    "Maximal wenige starke Slang-Signale pro Post; oft gar keine.",
    "Vermeide den Eindruck eines Erwachsenen, der Jugendliche imitieren will.",
    "Mische Standardsprache, Umgangssprache, Chat-Sprache und Jugendsprach-Signale.",
    "Variiere Satzlänge, Satzvollständigkeit, Groß-/Kleinschreibung, Interpunktion und Emoji-Nutzung.",
    "Tippfehler sind unregelmäßig und klein: eher Vertipper, fehlende Buchstaben oder fehlende Satzzeichen als absichtlich schlechtes Deutsch.",
    "Lowercase darf vorkommen, aber nicht als Pflichtstil.",
    "Abkürzungen und englische Einsprengsel nur dort einsetzen, wo sie zum Sprecher und Kontext passen.",
    "Regionale oder gruppenspezifische Sprache nicht als universelle Jugendsprache darstellen.",
    "Ein Begriff, der gerade viral ist, darf nicht automatisch in jedem Post auftauchen.",
  ],
  trend2026: {
    // Current trend candidates. Treat these as optional context signals, never as mandatory vocabulary.
    sourceDate: "2026-08-30",
    officialTop10: ["67", "Crashout", "Digga", "Du bist gut genug", "Gute Käse", "Macker", "Peak", "Ragebait", "Schere", "Süper"],
    aiObservedTermsFromSchnetzer: ["Six Seven", "Sybau", "Slop"],
    usageGuidance: [
      "67 / Six Seven: Insider-/Meme-Marker; keine feste Bedeutung erzwingen.",
      "Crashout: kann übertrieben oder ironisch für komplettes Ausrasten verwendet werden.",
      "Digga: Anrede, Füllwort oder Ausruf; nur bei passender Stimme.",
      "Gute Käse: humorvolle positive Bewertung, nicht wörtlich interpretieren.",
      "Macker: je nach Kontext Typ, Crush, Boyfriend oder Kumpel; ironische Verwendung möglich.",
      "Peak: Bewertung für etwas, das als Höhepunkt/10 von 10 empfunden wird.",
      "Ragebait: Begriff für bewusst provokanten Content; als Meta-Begriff verwenden, nicht als Aufforderung zum Ragebaiting.",
      "Schere: Gaming-geprägtes Eingeständnis eines Fehlers; Kontext beachten.",
      "Süper: spielerische/virale Variante von super; nicht zwanghaft einsetzen.",
      "Slop: kritischer Begriff für minderwertigen, massenhaft produzierten KI-Content; besonders relevant als interne Qualitätswarnung.",
    ],
  },
  ageGuidance: {
    "12_13": "Weniger Slang. Einfachere, konkrete Alltagssprache. Internet-/Gaming-Signale punktuell.",
    "14_15": "Breite Mischung aus Umgangssprache, Chat-Sprache, Memes und einzelnen aktuellen Begriffen.",
    "16_17": "Mehr Ironie, Kontextspiel, verkürzte Aussagen und variabler Slang; trotzdem nicht jeder Post jugendsprachlich.",
    "18_plus": "Natürlicher Social-/Alltagston, weniger demonstrativer Jugendslang; mehr Variation zwischen Umgangssprache und neutralem Ton.",
  },
} as const;

export function buildAmbientLanguagePrompt(ageBand: string, slangLevel: number, typoLevel: number) {
  const age = AMBIENT_LANGUAGE_LIBRARY.ageGuidance[ageBand as keyof typeof AMBIENT_LANGUAGE_LIBRARY.ageGuidance] ?? AMBIENT_LANGUAGE_LIBRARY.ageGuidance["14_15"];
  return [
    "LANGUAGE LIBRARY — SOURCE-GROUNDED",
    ...AMBIENT_LANGUAGE_LIBRARY.principles.map((x) => `- ${x}`),
    "AUTHENTICITY RULES",
    ...AMBIENT_LANGUAGE_LIBRARY.authenticityRules.map((x) => `- ${x}`),
    `AGE GUIDANCE: ${age}`,
    `SLANG INTENSITY: ${slangLevel}/3`,
    `TYPO INTENSITY: ${typoLevel}/3`,
    "TREND RULE: Current terms are optional context signals. Prefer natural usage over trend density.",
    `CURRENT 2026 CANDIDATES: ${AMBIENT_LANGUAGE_LIBRARY.trend2026.officialTop10.join(", ")}`,
  ].join("\n");
}
