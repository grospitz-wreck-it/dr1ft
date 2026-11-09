export const AVATAR_CATEGORIES = [
  { id: "COL", key: "collectible", label: "Collectibles" },
  { id: "POP", key: "popculture", label: "Pop Culture" },
  { id: "ANI", key: "animals", label: "Tiere" },
  { id: "MOV", key: "movies", label: "Blockbuster" },
  { id: "MON", key: "monsters", label: "Monster & Aliens" },
  { id: "JOB", key: "professions", label: "Berufe" },
] as const;

export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number]["key"];
export const PLAYER_AVATAR_STYLES = [
  { id: "voxel-art", label: "Pixel" },
  { id: "adventurer", label: "Abenteuer" },
  { id: "adventurer-neutral", label: "Neutral" },
  { id: "avataaars", label: "Comic" },
  { id: "bottts", label: "Roboter" },
  { id: "fun-emoji", label: "Emoji" },
  { id: "lorelei", label: "Illustration" },
  { id: "micah", label: "Skizze" },
  { id: "miniavs", label: "Mini" },
  { id: "personas", label: "Personas" },
  { id: "pixel-art-neutral", label: "Pixel neutral" },
  { id: "thumbs", label: "Thumbs" },
] as const;
export type PlayerAvatarStyle = (typeof PLAYER_AVATAR_STYLES)[number]["id"];
export const PLAYER_AVATAR_STYLE: PlayerAvatarStyle = "voxel-art";

const AVATAR_IDS = AVATAR_CATEGORIES.flatMap((category) =>
  Array.from({ length: 50 }, (_, index) => `DR1FT-${category.id}-${String(index + 1).padStart(3, "0")}`)
);

export function isDr1ftAvatarId(value: string | null | undefined): boolean {
  return Boolean(value && /^DR1FT-(COL|POP|ANI|MOV|MON|JOB)-\d{3}$/.test(value));
}
export function avatarCategoryFromId(id: string): AvatarCategory {
  return AVATAR_CATEGORIES.find((item) => id.startsWith(`DR1FT-${item.id}-`))?.key ?? "collectible";
}
export function getDefaultAvatarId(seed: string | null | undefined): string {
  const value = seed || "dr1ft";
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return AVATAR_IDS[(hash >>> 0) % AVATAR_IDS.length];
}
function resolveAvatar(seed: string | null | undefined): { style: PlayerAvatarStyle; seed: string } {
  const value = seed || "dr1ft";
  const separator = value.indexOf("::");
  if (separator > 0) {
    const candidate = value.slice(0, separator);
    if (PLAYER_AVATAR_STYLES.some((style) => style.id === candidate)) return { style: candidate as PlayerAvatarStyle, seed: value.slice(separator + 2) || "dr1ft" };
  }
  return { style: PLAYER_AVATAR_STYLE, seed: value };
}
export function avatarUrl(seed: string | null | undefined, size = 96): string {
  if (isDr1ftAvatarId(seed)) return `/avatars/${avatarCategoryFromId(seed)}/${seed}.webp`;
  if (seed && seed.startsWith("DR1FT-")) return `/avatars/collectible/${getDefaultAvatarId(seed)}.webp`;
  const avatar = resolveAvatar(seed);
  return `https://api.dicebear.com/10.x/${avatar.style}/svg?seed=${encodeURIComponent(avatar.seed)}&size=${size}&animationVariant=medium&borderRadius=18`;
}
export function avatarStyleFromSeed(seed: string | null | undefined): PlayerAvatarStyle { return resolveAvatar(seed).style; }
export function avatarSeedWithStyle(seed: string | null | undefined, style: PlayerAvatarStyle): string {
  return `${style}::${resolveAvatar(seed).seed}`;
}
