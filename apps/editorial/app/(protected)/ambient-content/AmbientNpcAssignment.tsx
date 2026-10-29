"use client";

import { useMemo } from "react";
import { UserRound, Sparkles } from "lucide-react";

type Creator = {
  id: string;
  display_name: string;
  creator_role: string | null;
  persona: unknown;
  interest_tags?: string[] | null;
  bio?: string | null;
  story_role?: string | null;
  npc_category?: string | null;
  npc_role?: string | null;
  age_bands?: string[] | null;
  is_active?: boolean | null;
};
type Action = (formData: FormData) => Promise<void>;

export function AmbientNpcAssignment({
  action,
  contentItemId,
  currentCreatorId,
  currentCreatorName,
  creators,
  interestKeys,
  interestLabels,
  postText,
  postTopic,
  usageCounts,
}: {
  action: Action;
  contentItemId: string;
  currentCreatorId: string | null;
  currentCreatorName?: string | null;
  creators: Creator[];
  interestKeys: string[];
  interestLabels: string[];
  postText: string;
  postTopic?: string | null;
  usageCounts: Record<string, number>;
}) {
  const recommendations = useMemo(() => {
    const normalize = (value: unknown) =>
      String(value ?? "").toLocaleLowerCase("de").replace(/[_-]+/g, " ").replace(/[^\wäöüß ]/gi, " ").replace(/\s+/g, " ").trim();
    const tokens = (value: unknown) => normalize(value).split(" ").filter((token) => token.length >= 4);
    const postRaw = [postText, postTopic, ...interestLabels].join(" ");
    const postNorm = normalize(postRaw);
    const postTokens = tokens(postRaw).filter((token, index, all) => all.indexOf(token) === index);
    const signalCandidates = [...interestKeys, ...interestLabels].map(normalize).filter((value) => value.length > 2);
    const signals = signalCandidates.filter((value, index, all) => all.indexOf(value) === index);

    return creators
      .filter((creator) => creator.is_active !== false)
      .map((creator) => {
        const persona = creator.persona && typeof creator.persona === "object"
          ? creator.persona as Record<string, unknown>
          : {};
        const profileKeys = Array.isArray(persona.interestKeys) ? persona.interestKeys.map(normalize) : [];
        const tags = (creator.interest_tags ?? []).map(normalize);
        const profileTextRaw = [
          JSON.stringify(persona),
          ...(creator.interest_tags ?? []),
          creator.bio,
          creator.story_role,
          creator.npc_category,
          creator.npc_role,
        ].filter(Boolean).join(" ");
        const profileNorm = normalize(profileTextRaw);
        const profileTokens = tokens(profileTextRaw).filter((token, index, all) => all.indexOf(token) === index);
        const exactKeyMatches = signals.filter((signal) => profileKeys.includes(signal)).length;
        const tagMatches = signals.filter((signal) => tags.includes(signal)).length;
        const postTagOverlap = postTokens.filter((token) => profileTokens.includes(token)).length;
        const textMatches = signals.filter((signal) => profileNorm.includes(signal)).length;

        const identity = normalize([
          creator.display_name,
          creator.npc_category,
          creator.npc_role,
          creator.story_role,
          persona.name,
          persona.organization,
          persona.brand,
          persona.party,
        ].join(" "));
        const entityLike = /official|pressestelle|initiative|stiftung|netzwerk|partei|bewegung|verband|lab|botanicals|club|update|news|24|beauty|glow|blush|velvet|aufbruch|fre(e|i)e bildung/.test(identity);
        const isPoliticalOrCampaign = /politik|parteipolitik|aktivismus|kampagne|bürgerrechte|direkte demokratie|klimaschutz/.test(tags.join(" "));
        const isRestricted = entityLike || isPoliticalOrCampaign;
        const identityTokens = tokens([creator.display_name, creator.npc_category, creator.npc_role, persona.organization, persona.brand, persona.party]);
        const identityMatch = identityTokens.some((word) => postNorm.includes(word));
        const topicMatch = tags.some((tag) => tag.length > 3 && postNorm.includes(tag)) || postTokens.some((token) => tags.some((tag) => tokens(tag).includes(token))) || signals.some((signal) => signal.length > 3 && postNorm.includes(signal));
        // Branded/institutional/political accounts only qualify when the post is specifically about their identity or a relevant topic.
        const allowed = !isRestricted || identityMatch || topicMatch;

        const rawScore = exactKeyMatches * 12 + tagMatches * 10 + textMatches * 3 + postTagOverlap * 2;
        const useCount = usageCounts[creator.id] ?? 0;
        // Usage penalty discourages one prolific NPC from dominating the feed.
        const score = Math.max(0, rawScore - Math.min(12, useCount * 0.35));
        return { creator, score, rawScore, useCount, exactKeyMatches, tagMatches, postTagOverlap, allowed };
      })
      .filter((item) => item.allowed && item.rawScore >= 8)
      .sort((a, b) => b.score - a.score || a.useCount - b.useCount || a.creator.display_name.localeCompare(b.creator.display_name, "de"));
  }, [creators, interestKeys, interestLabels, postText, postTopic, usageCounts]);

  const suggested = recommendations.slice(0, 3);
  const suggestedIds = new Set(suggested.map((item) => item.creator.id));
  const current = creators.find((creator) => creator.id === currentCreatorId);
  const selectedCreatorId = currentCreatorId ?? suggested[0]?.creator.id ?? "";

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-medium text-slate-700">
        <span className="inline-flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-violet-600" /> NPC-Zuordnung</span>
        <span className="max-w-[55%] truncate text-right text-slate-500">{current?.display_name ?? currentCreatorName ?? suggested[0]?.creator.display_name ?? "Keine passende Figur"}</span>
      </summary>
      <form action={action} className="space-y-3 border-t border-slate-200 p-3">
        <input type="hidden" name="contentItemId" value={contentItemId} />
        <label className="block text-xs font-medium text-slate-700">
          Wer soll diesen Post veröffentlichen?
          <select name="creatorId" defaultValue={selectedCreatorId} className="control mt-1.5">
            <option value="">Keine Figur zuordnen</option>
            {suggested.length > 0 && <optgroup label="Inhaltlich passende Vorschläge">{suggested.map(({ creator, score, useCount }) => <option key={creator.id} value={creator.id}>{creator.display_name} · Relevanz {Math.round(score)} · {useCount} Posts</option>)}</optgroup>}
            <optgroup label="Alle globalen NPCs">{creators.filter((creator) => !suggestedIds.has(creator.id)).map((creator) => <option key={creator.id} value={creator.id}>{creator.display_name}{creator.creator_role ? " · " + creator.creator_role : ""}</option>)}</optgroup>
          </select>
        </label>
        {suggested.length > 0 ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-500"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" /> Die Rangfolge berücksichtigt Interessen, Textpassung und bisherige Nutzung. Marken-, Organisations- und politische Profile werden nur bei passendem Thema berücksichtigt.</p>
        ) : (
          <p className="text-[11px] leading-4 text-amber-700">Kein ausreichend belastbarer Treffer. Es wird bewusst kein zufälliger NPC vorausgewählt. Wähle manuell eine Figur oder lass den Post ohne NPC.</p>
        )}
        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Zuordnung speichern</button>
      </form>
    </details>
  );
}
