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
}: {
  action: Action;
  contentItemId: string;
  currentCreatorId: string | null;
  currentCreatorName?: string | null;
  creators: Creator[];
  interestKeys: string[];
  interestLabels: string[];
}) {
  const recommendations = useMemo(() => {
    const normalize = (value: unknown) =>
      String(value ?? "").toLocaleLowerCase("de").replace(/[_-]+/g, " ").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();

    const signals = [...interestKeys, ...interestLabels].map(normalize).filter((value) => value.length > 2);
    return creators
      .filter((creator) => creator.is_active !== false)
      .map((creator) => {
        const persona = creator.persona && typeof creator.persona === "object"
          ? creator.persona as Record<string, unknown>
          : {};
        const profileKeys = Array.isArray(persona.interestKeys) ? persona.interestKeys.map(normalize) : [];
        const profileText = normalize([
          JSON.stringify(creator.persona ?? {}),
          ...(creator.interest_tags ?? []),
          creator.bio,
          creator.story_role,
          creator.npc_category,
          creator.npc_role,
        ].join(" "));
        const exactKeyMatches = signals.filter((signal) => profileKeys.includes(signal)).length;
        const textMatches = signals.filter((signal) => profileText.includes(signal)).length;
        // Stable catalog keys are strongest; labels/tags and profile text provide fallbacks for legacy NPCs.
        const score = exactKeyMatches * 5 + textMatches;
        return { creator, score, exactKeyMatches, textMatches };
      })
      .sort((a, b) => b.score - a.score || a.creator.display_name.localeCompare(b.creator.display_name, "de"));
  }, [creators, interestKeys, interestLabels]);
  const suggested = recommendations.filter((item) => item.score > 0).slice(0, 3);
  const fallbackSuggestion = recommendations[0] ?? null;
  const defaultSuggestion = suggested[0] ?? fallbackSuggestion;
  const suggestedIds = new Set(suggested.map((item) => item.creator.id));
  const current = creators.find((creator) => creator.id === currentCreatorId);
  const selectedCreatorId = currentCreatorId ?? defaultSuggestion?.creator.id ?? "";

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-medium text-slate-700">
        <span className="inline-flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-violet-600" /> NPC-Zuordnung</span>
        <span className="max-w-[55%] truncate text-right text-slate-500">{current?.display_name ?? currentCreatorName ?? "Noch keiner vorgeschlagen"}</span>
      </summary>
      <form action={action} className="space-y-3 border-t border-slate-200 p-3">
        <input type="hidden" name="contentItemId" value={contentItemId} />
        <label className="block text-xs font-medium text-slate-700">
          Wer soll diesen Post veröffentlichen?
          <select name="creatorId" defaultValue={selectedCreatorId} className="control mt-1.5">
            <option value="">Keine Figur zuordnen</option>
            {suggested.length > 0 && <optgroup label="Passende Vorschläge">{suggested.map(({ creator, score }) => <option key={creator.id} value={creator.id}>{creator.display_name} · {score} Treffer</option>)}</optgroup>}{fallbackSuggestion && !suggestedIds.has(fallbackSuggestion.creator.id) && <optgroup label="Weitere Empfehlung"><option value={fallbackSuggestion.creator.id}>{fallbackSuggestion.creator.display_name} · allgemeiner Vorschlag</option></optgroup>}
            <optgroup label="Alle globalen NPCs">{creators.filter((creator) => !suggestedIds.has(creator.id) && creator.id !== fallbackSuggestion?.creator.id).map((creator) => <option key={creator.id} value={creator.id}>{creator.display_name}{creator.creator_role ? " · " + creator.creator_role : ""}</option>)}</optgroup>
          </select>
        </label>
        {suggested.length > 0 ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-500"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" /> Der passendste NPC ist bereits vorausgewählt. Die Reihenfolge berücksichtigt stabile Interessen-Keys, alte Interessen-Tags und weitere Profilangaben. Du kannst jederzeit eine andere Figur wählen.</p>
        ) : (
          <p className="text-[11px] leading-4 text-slate-500">Es gibt keinen eindeutigen Themen-Treffer. Deshalb ist ein aktiver globaler NPC als Startvorschlag vorausgewählt – du kannst ihn ändern oder „Keine Figur zuordnen“ wählen.</p>
        )}
        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Zuordnung speichern</button>
      </form>
    </details>
  );
}
