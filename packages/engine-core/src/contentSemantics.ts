export type WorldSignal = "influencer" | "mobbing" | "status" | "fomo" | "engagement" | "provocation" | "group_pressure" | "exclusion" | "conflict";
export type SocialDynamic = "belonging" | "approval" | "competition" | "comparison" | "pressure" | "humiliation" | "escalation" | "reflection";

export interface ContentSemantics {
  ambientInterestKeys: string[];
  worldSignals: WorldSignal[];
  socialDynamics: SocialDynamic[];
}

const EMPTY: ContentSemantics = { ambientInterestKeys: [], worldSignals: [], socialDynamics: [] };

export function getContentSemantics(extra: Record<string, unknown> | null | undefined): ContentSemantics {
  if (!extra) return EMPTY;
  const read = <T extends string>(key: string): T[] => {
    const value = extra[key];
    return Array.isArray(value) ? value.filter((entry): entry is T => typeof entry === "string") : [];
  };
  return {
    ambientInterestKeys: read("ambientInterestKeys").slice(0, 8),
    worldSignals: read<WorldSignal>("worldSignals").slice(0, 8),
    socialDynamics: read<SocialDynamic>("socialDynamics").slice(0, 8),
  };
}
