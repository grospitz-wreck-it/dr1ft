export const PLAYER_AVATAR_STYLE = "notionists";

export function avatarUrl(seed: string | null | undefined, size = 96): string {
  const safeSeed = encodeURIComponent(seed || "dr1ft");
  return `https://api.dicebear.com/10.x/${PLAYER_AVATAR_STYLE}/svg?seed=${safeSeed}&size=${size}`;
}
