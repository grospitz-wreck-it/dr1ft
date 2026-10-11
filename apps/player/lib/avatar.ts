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

function resolveAvatar(seed: string | null | undefined): { style: PlayerAvatarStyle; seed: string } {
  const value = seed || "dr1ft";
  const separator = value.indexOf("::");
  if (separator > 0) {
    const candidate = value.slice(0, separator);
    if (PLAYER_AVATAR_STYLES.some((style) => style.id === candidate)) {
      return { style: candidate as PlayerAvatarStyle, seed: value.slice(separator + 2) || "dr1ft" };
    }
  }
  return { style: PLAYER_AVATAR_STYLE, seed: value };
}

export function avatarUrl(seed: string | null | undefined, size = 96): string {
  const avatar = resolveAvatar(seed);
  const safeSeed = encodeURIComponent(avatar.seed);
  return `https://api.dicebear.com/10.x/${avatar.style}/svg?seed=${safeSeed}&size=${size}&animationVariant=medium&borderRadius=18`;
}

export function avatarStyleFromSeed(seed: string | null | undefined): PlayerAvatarStyle {
  return resolveAvatar(seed).style;
}

export function avatarSeedWithStyle(seed: string | null | undefined, style: PlayerAvatarStyle): string {
  const current = resolveAvatar(seed).seed;
  return `${style}::${current}`;
}
