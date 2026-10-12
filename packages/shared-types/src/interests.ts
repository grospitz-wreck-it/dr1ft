/**
 * Canonical interest taxonomy shared by NPC authoring, content generation
 * and feed ranking.
 *
 * Keys are stable machine identifiers. Labels and aliases are for UI and
 * legacy-data import only; do not persist labels as canonical IDs.
 */
export const INTEREST_CATALOG = {
  music: { label: "Musik", aliases: ["musik", "music", "soundtracks", "songs", "lieder", "keyboard"] },
  gaming: { label: "Gaming", aliases: ["gaming", "games", "videospiele", "videogames", "zocken", "highscores", "pixelart", "retro"] },
  sports: { label: "Sport", aliases: ["sport", "sports", "fussball", "fußball", "basketball", "skaten", "skateboarding"] },
  animals: { label: "Tiere", aliases: ["tiere", "animals", "hunde", "katzen", "pets"] },
  books_fantasy: { label: "Bücher & Fantasy", aliases: ["bücher", "buecher", "books", "fantasy", "lesen", "geschichten"] },
  art_creativity: { label: "Kunst & Kreativität", aliases: ["kunst", "art", "malerei", "farben", "kreativität", "kreativitaet", "zeichnen", "basteln", "upcycling"] },
  food_cooking: { label: "Essen & Kochen", aliases: ["essen", "food", "kochen", "cooking", "backen", "rezepte"] },
  fashion_style: { label: "Mode & Style", aliases: ["mode", "fashion", "style", "streetstyle", "aesthetic", "clean girl", "grunge", "makeup", "erstesmakeup"] },
  technology: { label: "Technik", aliases: ["technik", "technology", "digitalisierung", "gadgets", "ki", "ai"] },
  nature_outdoors: { label: "Natur & Draußen", aliases: ["natur", "nature", "draussen", "draußen", "outdoors", "wolken", "wetter", "klima"] },
  school_social_life: { label: "Schule & soziales Leben", aliases: ["schule", "school", "freunde", "freundschaft", "klassenchat", "pausenhof", "gemeinschaft"] },
  memes_internet_culture: { label: "Memes & Internetkultur", aliases: ["memes", "meme", "internet", "internetculture", "internetskultur", "viraltrends", "hypes"] },
  science_space: { label: "Wissenschaft & Weltraum", aliases: ["wissenschaft", "science", "astronomie", "weltraum", "sterne", "forschung"] },
  climate_sustainability: { label: "Klima & Nachhaltigkeit", aliases: ["klimaschutz", "nachhaltigkeit", "sustainability", "vegan", "umwelt", "aktivismus"] },
  politics_society: { label: "Politik & Gesellschaft", aliases: ["politik", "parteipolitik", "bürgerrechte", "buergerrechte", "demokratie", "protestkultur", "aktivismus", "meinungsfreiheit"] },
  beauty_skincare: { label: "Beauty & Pflege", aliases: ["beauty", "skincare", "naturkosmetik", "greenbeauty", "hautpflege", "glowup", "seren"] },
  vehicles: { label: "Fahrzeuge & Mobilität", aliases: ["fahrzeuge", "autos", "mobilität", "mobilitaet", "tuning"] },
  building_design: { label: "Bauen & Design", aliases: ["architektur", "modellbau", "bauklötze", "baukloetze", "logik", "karten"] },
} as const;

export type CanonicalInterestKey = keyof typeof INTEREST_CATALOG;

function normalizeLookupValue(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const INTEREST_LOOKUP = new Map<string, CanonicalInterestKey>();

for (const [key, definition] of Object.entries(INTEREST_CATALOG) as [
  CanonicalInterestKey,
  (typeof INTEREST_CATALOG)[CanonicalInterestKey],
][]) {
  INTEREST_LOOKUP.set(normalizeLookupValue(key), key);
  INTEREST_LOOKUP.set(normalizeLookupValue(definition.label), key);
  for (const alias of definition.aliases) {
    INTEREST_LOOKUP.set(normalizeLookupValue(alias), key);
  }
}

/** Returns a canonical key for a known key/label/alias, otherwise null. */
export function normalizeInterestTag(value: string): CanonicalInterestKey | null {
  return INTEREST_LOOKUP.get(normalizeLookupValue(value)) ?? null;
}

/**
 * Canonicalizes known values, removes duplicates and preserves first-seen
 * order. Unknown values are deliberately omitted; use getUnknownInterestTags
 * during authoring/import validation to report them rather than silently save.
 */
export function normalizeInterestTags(values: readonly string[]): CanonicalInterestKey[] {
  const result: CanonicalInterestKey[] = [];
  const seen = new Set<CanonicalInterestKey>();

  for (const value of values) {
    const key = normalizeInterestTag(value);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }

  return result;
}

export function getUnknownInterestTags(values: readonly string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && normalizeInterestTag(value) === null);
}

export function getInterestLabel(key: CanonicalInterestKey): string {
  return INTEREST_CATALOG[key].label;
}
