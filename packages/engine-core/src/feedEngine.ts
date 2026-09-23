import type { ContentItem, UserCompetencyProgress, AgeRating } from "@dr1ft/shared-types";
import type { SocialWorldState } from "./driftState";
import { getContentSemantics } from "./contentSemantics";

export interface FeedContext {
  userAgeRating: AgeRating; competencyProgress: UserCompetencyProgress[]; recentlySeenContentIds: string[];
  recentTechniques: string[]; assignedScenarioIds: string[]; signalRatio?: number; interestKeys?: string[];
  socialWorldState?: SocialWorldState;
}
const AGE_ORDER: Record<AgeRating, number> = { all_ages: 0, "12_plus": 1, "16_plus": 2 };
function isAgeAppropriate(item: ContentItem, ctx: FeedContext) { return AGE_ORDER[item.ageRating] <= AGE_ORDER[ctx.userAgeRating]; }
function isScenarioAssigned(item: ContentItem, ctx: FeedContext) { return !item.scenarioId ? ctx.assignedScenarioIds.length > 0 : ctx.assignedScenarioIds.includes(item.scenarioId); }
function isSignal(item: ContentItem) { return item.manipulationTechniques.length > 0; }
function itemInterestKeys(item: ContentItem) { const extra = item.extra as Record<string, unknown>; const keys = extra.ambientInterestKeys ?? extra.interestKeys; return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === "string") : []; }
function scoreInterest(item: ContentItem, ctx: FeedContext) { const interests = ctx.interestKeys ?? []; if (!interests.length || isSignal(item)) return 0; return Math.min(2.4, itemInterestKeys(item).filter((key) => interests.includes(key)).length * 1.2); }
function scoreWorld(item: ContentItem, ctx: FeedContext) {
  const world = ctx.socialWorldState; if (!world || isSignal(item)) return 0;
  const { worldSignals, socialDynamics } = getContentSemantics(item.extra as Record<string, unknown>);
  let score = 0;
  const signalWeights: Partial<Record<keyof SocialWorldState, number>> = { visibility: 1, engagement: 1, comparison: .7, fomo: .8, belonging: .7, peerPressure: .9, conflict: .8, exclusion: .8, escalation: .9, reflection: .5, trust: .5 };
  for (const signal of worldSignals) {
    const key = ({ influencer: "visibility", mobbing: "exclusion", status: "comparison", fomo: "fomo", engagement: "engagement", provocation: "conflict", group_pressure: "peerPressure", exclusion: "exclusion", conflict: "conflict" } as const)[signal];
    score += (world[key] ?? 0) * (signalWeights[key] ?? .5);
  }
  for (const dynamic of socialDynamics) {
    const key = ({ belonging: "belonging", approval: "trust", competition: "comparison", comparison: "comparison", pressure: "peerPressure", humiliation: "exclusion", escalation: "escalation", reflection: "reflection" } as const)[dynamic];
    score += (world[key] ?? 0) * .45;
  }
  return Math.max(-1.5, Math.min(2.5, score));
}
function scoreItem(item: ContentItem, ctx: FeedContext) {
  let score = 1; if (ctx.recentlySeenContentIds.includes(item.id)) score -= 5;
  score -= item.manipulationTechniques.filter((t) => ctx.recentTechniques.includes(t)).length * .5;
  score += item.targetCompetencies.reduce((acc, id) => acc + (5 - (ctx.competencyProgress.find((p) => p.competencyId === id)?.level ?? 1)) * .3, 0);
  return score + scoreInterest(item, ctx) + scoreWorld(item, ctx);
}
function interleaveByRatio(signal: ContentItem[], ambient: ContentItem[], ratio: number, count: number) { const result: ContentItem[] = []; const sig=[...signal], amb=[...ambient]; let last=false; while(result.length<count&&(sig.length||amb.length)){const want=Math.random()<ratio;if(sig.length&&!last&&(want||!amb.length)){result.push(sig.shift()!);last=true;}else if(amb.length){result.push(amb.shift()!);last=false;}else if(sig.length){result.push(sig.shift()!);last=true;}else break;}return result; }
export function selectNextFeedItems(pool: ContentItem[], ctx: FeedContext, count: number) { const eligible=pool.filter((item)=>item.status==="live"&&isAgeAppropriate(item,ctx)&&isScenarioAssigned(item,ctx));const scored=eligible.map((item)=>({item,score:scoreItem(item,ctx)})).sort((a,b)=>b.score-a.score).map((s)=>s.item);return interleaveByRatio(scored.filter(isSignal),scored.filter((item)=>!isSignal(item)),ctx.signalRatio??.25,count); }
export function computeAdaptiveSignalRatio(progress: UserCompetencyProgress[]) { if(!progress.length)return .15;const avg=progress.reduce((s,p)=>s+p.level,0)/progress.length;return Math.min(.35,.1+avg*.05); }
