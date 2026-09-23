// Hidden social-world context for NPC behavior.
// This is never exposed as a player-facing score, axis, level, or percentage.
import type { ContentItem } from "@dr1ft/shared-types";
import type { SocialWorldState } from "./driftState";
import { getContentSemantics } from "./contentSemantics";

export interface NpcWorldContext {
  state: SocialWorldState;
  signals: string[];
}

export function getNpcWorldContext(
  message: ContentItem,
  state: SocialWorldState,
): NpcWorldContext {
  const semantics = getContentSemantics((message.extra ?? {}) as Record<string, unknown>);
  return {
    state,
    signals: [...semantics.worldSignals, ...semantics.socialDynamics],
  };
}

export function scoreNpcOption(
  option: { techniqueTag?: string },
  state: SocialWorldState,
): number {
  const tag = (option.techniqueTag ?? "").toLowerCase();
  let score = 0;

  if (/belong|approval|friend|support/.test(tag)) {
    score += state.belonging + state.socialProximity + state.trust;
  }
  if (/status|competition|viral|engagement|attention/.test(tag)) {
    score += state.comparison + state.engagement + state.visibility;
  }
  if (/pressure|conform|majority|group/.test(tag)) {
    score += state.peerPressure + state.conformity + state.majorityTendency;
  }
  if (/conflict|provok|escalat|humiliation|exclusion|mobbing/.test(tag)) {
    score += state.conflict + state.escalation + state.exclusion;
  }
  if (/reflect|question|pause|critical/.test(tag)) {
    score += state.reflection;
  }

  return score;
}
