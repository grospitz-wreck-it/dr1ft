import type { ContentItem, UserCompetencyProgress, AgeRating } from "@dr1ft/shared-types";

export type DriftDirection = "center" | "influencer" | "mobbing";

export interface DriftState {
  direction: DriftDirection;
  intensity: number;
}

export interface FeedContext {
  userAgeRating: AgeRating;
  competencyProgress: UserCompetencyProgress[];
  recentlySeenContentIds: string[];
  recentTechniques: string[];
  assignedScenarioIds: string[];
  signalRatio?: number;
  interestKeys?: string[];
  driftState?: DriftState;
}

const AGE_ORDER: Record<AgeRating, number> = { all_ages: 0, "12_plus": 1, "16_plus": 2 };

function isAgeAppropriate(item: ContentItem, ctx: FeedContext): boolean {
  return AGE_ORDER[item.ageRating] <= AGE_ORDER[ctx.userAgeRating];
}

function isScenarioAssigned(item: ContentItem, ctx: FeedContext): boolean {
  if (!item.scenarioId) return ctx.assignedScenarioIds.length > 0;
  return ctx.assignedScenarioIds.includes(item.scenarioId);
}

function isSignal(item: ContentItem): boolean {
  return item.manipulationTechniques.length > 0;
}

function itemInterestKeys(item: ContentItem): string[] {
  const extra = item.extra as Record<string, unknown>;
  const keys = extra.ambientInterestKeys ?? extra.interestKeys;
  return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === "string") : [];
}

function scoreInterest(item: ContentItem, ctx: FeedContext): number {
  const interests = ctx.interestKeys ?? [];
  if (!interests.length || isSignal(item)) return 0;
  const overlap = itemInterestKeys(item).filter((key) => interests.includes(key)).length;
  return Math.min(2.4, overlap * 1.2);
}

function scoreDrift(item: ContentItem, ctx: FeedContext): number {
  const drift = ctx.driftState;
  if (!drift || drift.direction === "center" || drift.intensity <= 0) return 0;
  const text = `${item.manipulationTechniques.join(" ")} ${item.title ?? ""} ${item.body ?? ""}`.toLowerCase();
  const influencer = /influencer|engagement bait|sponsorship|brand|fomo|status|creator|reichweite|followers|viral/.test(text);
  const mobbing = /mobbing|harassment|humiliation|pile|shaming|ausgrenz|spott|provokation|gruppendruck|eskalation/.test(text);
  const matches = drift.direction === "influencer" ? influencer : mobbing;
  return matches ? drift.intensity * 2.2 : 0;
}

function scoreItem(item: ContentItem, ctx: FeedContext): number {
  let score = 1;
  if (ctx.recentlySeenContentIds.includes(item.id)) score -= 5;
  const overlap = item.manipulationTechniques.filter((t) => ctx.recentTechniques.includes(t)).length;
  score -= overlap * 0.5;
  const lowProgressBoost = item.targetCompetencies.reduce((acc, compId) => {
    const progress = ctx.competencyProgress.find((p) => p.competencyId === compId);
    return acc + (5 - (progress?.level ?? 1)) * 0.3;
  }, 0);
  score += lowProgressBoost;
  score += scoreInterest(item, ctx);
  score += scoreDrift(item, ctx);
  return score;
}

function interleaveByRatio(signal: ContentItem[], ambient: ContentItem[], ratio: number, count: number): ContentItem[] {
  const result: ContentItem[] = [];
  const sig = [...signal];
  const amb = [...ambient];
  let lastWasSignal = false;
  while (result.length < count && (sig.length > 0 || amb.length > 0)) {
    const wantSignal = Math.random() < ratio;
    const canUseSignal = sig.length > 0 && !lastWasSignal && (wantSignal || amb.length === 0);
    if (canUseSignal) {
      result.push(sig.shift()!); lastWasSignal = true;
    } else if (amb.length > 0) {
      result.push(amb.shift()!); lastWasSignal = false;
    } else if (sig.length > 0) {
      result.push(sig.shift()!); lastWasSignal = true;
    } else break;
  }
  return result;
}

export function selectNextFeedItems(pool: ContentItem[], ctx: FeedContext, count: number): ContentItem[] {
  const eligible = pool.filter((item) => item.status === "live" && isAgeAppropriate(item, ctx) && isScenarioAssigned(item, ctx));
  const scored = eligible.map((item) => ({ item, score: scoreItem(item, ctx) })).sort((a, b) => b.score - a.score).map((s) => s.item);
  const signal = scored.filter(isSignal);
  const ambient = scored.filter((item) => !isSignal(item));
  return interleaveByRatio(signal, ambient, ctx.signalRatio ?? 0.25, count);
}

export function computeAdaptiveSignalRatio(competencyProgress: UserCompetencyProgress[]): number {
  if (competencyProgress.length === 0) return 0.15;
  const avgLevel = competencyProgress.reduce((sum, p) => sum + p.level, 0) / competencyProgress.length;
  return Math.min(0.35, 0.1 + avgLevel * 0.05);
}
