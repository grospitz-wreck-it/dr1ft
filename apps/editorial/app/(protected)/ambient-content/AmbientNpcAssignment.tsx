"use client";

import { useMemo } from "react";
import { UserRound, Sparkles } from "lucide-react";

type Creator = {
  id: string;
  display_name: string;
  creator_role: string | null;
  persona: unknown;
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
    const signals = [...interestKeys, ...interestLabels]
      .map((value) => value.toLocaleLowerCase("de").replace(/[_-]+/g, " ").trim())
      .filter((value) => value.length > 2);
    return creators
      .map((creator) => {
        const personaText = JSON.stringify(creator.persona ?? {}).toLocaleLowerCase("de").replace(/[_-]+/g, " ");
        const score = signals.reduce((total, signal) => total + (personaText.includes(signal) ? 1 : 0), 0);
        return { creator, score };
      })
      .sort((a, b) => b.score - a.score || a.creator.display_name.localeCompare(b.creator.display_name, "de"));
  }, [creators, interestKeys, interestLabels]);
  const suggested = recommendations.filter((item) => item.score > 0).slice(0, 3);
  const suggestedIds = new Set(suggested.map((item) => item.creator.id));
  const current = creators.find((creator) => creator.id === currentCreatorId);

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-medium text-slate-700">
        <span className="inline-flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-violet-600" /> NPC-Zuordnung</span>
        <span className="max-w-[55%] truncate text-right text-slate-500">{current?.display_name ?? currentCreatorName ?? "Noch keiner zugeordnet"}</span>
      </summary>
      <form action={action} className="space-y-3 border-t border-slate-200 p-3">
        <input type="hidden" name="contentItemId" value={contentItemId} />
        <label className="block text-xs font-medium text-slate-700">
          Wer soll diesen Post veröffentlichen?
          <select name="creatorId" defaultValue={currentCreatorId ?? ""} className="control mt-1.5">
            <option value="">Keine Figur zuordnen</option>
            {suggested.length > 0 && <optgroup label="Vorschläge nach Interessen">{suggested.map(({ creator, score }) => <option key={creator.id} value={creator.id}>{creator.display_name} · {score} Treffer</option>)}</optgroup>}
            <optgroup label="Alle globalen NPCs">{creators.filter((creator) => !suggestedIds.has(creator.id)).map((creator) => <option key={creator.id} value={creator.id}>{creator.display_name}{creator.creator_role ? " · " + creator.creator_role : ""}</option>)}</optgroup>
          </select>
        </label>
        {suggested.length > 0 ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-500"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" /> Vorschläge beruhen auf Überschneidungen zwischen Post-Tags und dem gespeicherten NPC-Profil. Sie sind nur Empfehlungen, keine automatische Zuordnung.</p>
        ) : (
          <p className="text-[11px] leading-4 text-slate-500">Noch keine klare Interessen-Überschneidung im Profil gefunden. Du kannst eine Figur manuell auswählen.</p>
        )}
        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Zuordnung speichern</button>
      </form>
    </details>
  );
}
