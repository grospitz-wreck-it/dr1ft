export const AVATAR_CATEGORIES = [
  { id: "COL", key: "collectible", label: "Collectibles" },
  { id: "POP", key: "popculture", label: "Pop Culture" },
  { id: "ANI", key: "animals", label: "Tiere" },
  { id: "MOV", key: "movies", label: "Blockbuster" },
  { id: "MON", key: "monsters", label: "Monster & Aliens" },
  { id: "JOB", key: "professions", label: "Berufe" },
] as const;

export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number]["key"];

const AVATAR_IDS = AVATAR_CATEGORIES.flatMap((category) =>
  Array.from({ length: 50 }, (_, index) => `DR1FT-${category.id}-${String(index + 1).padStart(3, "0")}`)
);

export function isDr1ftAvatarId(value: string | null | undefined): value is string {
  return Boolean(value && /^DR1FT-(COL|POP|ANI|MOV|MON|JOB)-\d{3}$/.test(value));
}

export function avatarCategoryFromId(id: string): AvatarCategory {
  const category = AVATAR_CATEGORIES.find((item) => id.startsWith(`DR1FT-${item.id}-`));
  return category?.key ?? "collectible";
}

export function getDefaultAvatarId(seed: string | null | undefined): string {
  const value = seed || "dr1ft";
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return AVATAR_IDS[(hash >>> 0) % AVATAR_IDS.length];
}

export function avatarUrl(seed: string | null | undefined, _size = 96): string {
  const id = isDr1ftAvatarId(seed) ? seed : getDefaultAvatarId(seed);
  return `/avatars/${avatarCategoryFromId(id)}/${id}.webp`;
}
