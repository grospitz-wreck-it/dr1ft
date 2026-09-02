import type { ContentItem } from "@dr1ft/shared-types";
import type { DriftDirection, DriftState } from "./feedEngine";

export interface DriftInteraction {
  contentItemId: string;
  interactionType: string;
}

const INFLUENCER = /influencer|engagement bait|sponsorship|brand|fomo|status|creator|reichweite|followers|viral/i;
const MOBBING = /mobbing|harassment|humiliation|pile|shaming|ausgrenz|spott|provokation|gruppendruck|eskalation/i;

export function deriveDriftState(pool: ContentItem[], interactions: DriftInteraction[]): DriftState {
  const byId = new Map(pool.map((item) => [item.id, item]));
  let influencer = 0;
  let mobbing = 0;

  for (const interaction of interactions.slice(0, 80)) {
    const item = byId.get(interaction.contentItemId);
    if (!item) continue;
    const text = `${item.manipulationTechniques.join(" ")} ${item.title ?? ""} ${item.body ?? ""}`;
    const weight = interaction.interactionType === "view" ? 1 : interaction.interactionType === "ignore" ? -0.35 : 2;
    if (INFLUENCER.test(text)) influencer += weight;
    if (MOBBING.test(text)) mobbing += weight;
  }

  const total = influencer + mobbing;
  if (total <= 1.5) return { direction: "center", intensity: 0 };

  const delta = influencer - mobbing;
  const direction: DriftDirection = delta > 1.5 ? "influencer" : delta < -1.5 ? "mobbing" : "center";
  const intensity = direction === "center" ? 0 : Math.min(1, Math.abs(delta) / Math.max(6, total));
  return { direction, intensity };
}
