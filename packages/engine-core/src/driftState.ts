import type { ContentItem } from "@dr1ft/shared-types";
import type { ContentSemantics, SocialDynamic, WorldSignal } from "./contentSemantics";

export interface DriftInteraction { contentItemId: string; interactionType: string; }

export interface SocialWorldState {
  attention: number; engagement: number; visibility: number;
  peerPressure: number; conformity: number; majorityTendency: number;
  socialProximity: number; friendInfluence: number; belonging: number;
  comparison: number; fomo: number; conflict: number; exclusion: number;
  escalation: number; trust: number; reflection: number;
}

const SIGNALS: Record<WorldSignal, keyof SocialWorldState> = {
  influencer: "visibility", mobbing: "exclusion", status: "comparison", fomo: "fomo",
  engagement: "engagement", provocation: "conflict", group_pressure: "peerPressure",
  exclusion: "exclusion", conflict: "conflict",
};
const DYNAMICS: Record<SocialDynamic, keyof SocialWorldState> = {
  belonging: "belonging", approval: "trust", competition: "comparison", comparison: "comparison",
  pressure: "peerPressure", humiliation: "exclusion", escalation: "escalation", reflection: "reflection",
};

export const EMPTY_SOCIAL_WORLD_STATE: SocialWorldState = {
  attention: 0, engagement: 0, visibility: 0, peerPressure: 0, conformity: 0,
  majorityTendency: 0, socialProximity: 0, friendInfluence: 0, belonging: 0,
  comparison: 0, fomo: 0, conflict: 0, exclusion: 0, escalation: 0, trust: 0, reflection: 0,
};

function semantics(item: ContentItem): ContentSemantics {
  const extra = (item.extra ?? {}) as Record<string, unknown>;
  const read = <T extends string>(key: string) => Array.isArray(extra[key]) ? extra[key].filter((v): v is T => typeof v === "string") : [];
  return { ambientInterestKeys: [], worldSignals: read<WorldSignal>("worldSignals"), socialDynamics: read<SocialDynamic>("socialDynamics") };
}
function interactionWeight(type: string) { return type === "ignore" ? -0.35 : type === "view" ? 1 : 2; }
function add(state: SocialWorldState, key: keyof SocialWorldState, amount: number) { state[key] = Math.max(-1, Math.min(1, state[key] + amount)); }

export function deriveSocialWorldState(pool: ContentItem[], interactions: DriftInteraction[]): SocialWorldState {
  const state = { ...EMPTY_SOCIAL_WORLD_STATE };
  const byId = new Map(pool.map((item) => [item.id, item]));
  for (const interaction of interactions.slice(0, 80)) {
    const item = byId.get(interaction.contentItemId); if (!item) continue;
    const weight = interactionWeight(interaction.interactionType) / 20;
    const meta = semantics(item);
    for (const signal of meta.worldSignals) add(state, SIGNALS[signal], weight);
    for (const dynamic of meta.socialDynamics) add(state, DYNAMICS[dynamic], weight * 0.65);
  }
  state.attention = Math.max(0, Math.min(1, (state.visibility + state.engagement + 2) / 4));
  state.conformity = Math.max(0, Math.min(1, (state.peerPressure + state.belonging + state.comparison) / 3));
  state.majorityTendency = Math.max(0, Math.min(1, (state.conformity + state.engagement) / 2));
  state.socialProximity = Math.max(0, Math.min(1, (state.belonging + state.trust) / 2));
  state.friendInfluence = Math.max(0, Math.min(1, (state.socialProximity + state.peerPressure) / 2));
  return state;
}

export const deriveDriftState = deriveSocialWorldState;
