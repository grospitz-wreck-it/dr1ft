const AVATAR_CATEGORIES = [
  { id: "COL", key: "collectible" },
  { id: "POP", key: "popculture" },
  { id: "ANI", key: "animals" },
  { id: "MOV", key: "movies" },
  { id: "MON", key: "monsters" },
  { id: "JOB", key: "professions" },
] as const;

const AVATAR_IDS = AVATAR_CATEGORIES.flatMap((category) =>
  Array.from({ length: 50 }, (_, index) => `DR1FT-${category.id}-${String(index + 1).padStart(3, "0")}`)
);

function isDr1ftAvatarId(value: string | null | undefined): value is string {
  return Boolean(value && /^DR1FT-(COL|POP|ANI|MOV|MON|JOB)-\d{3}$/.test(value));
}

function defaultAvatarId(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return AVATAR_IDS[(hash >>> 0) % AVATAR_IDS.length];
}

/**
 * Teacher-side avatar resolver.
 * Existing Dicebear seeds are mapped deterministically to the DR1FT avatar set;
 * no external avatar service is requested and no profile data is modified.
 */
export function studentAvatarUrl(seed: string | null | undefined): string {
  const id = isDr1ftAvatarId(seed) ? seed : defaultAvatarId(seed || "dr1ft");
  const categoryId = id.slice(6, 9);
  const category = AVATAR_CATEGORIES.find((item) => item.id === categoryId)?.key ?? "collectible";
  return `/avatars/${category}/${id}.webp`;
}
