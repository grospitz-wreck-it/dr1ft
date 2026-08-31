"use client";

import { useMemo, useState } from "react";

export type ModuleCompetency = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
};

const CATEGORY_ORDER = ["Denken", "Ich", "Andere", "Einfluss", "Verantwortung"];

export function ModuleCompetencySelector({
  competencies,
  initialPrimaryId = "",
  initialSecondaryIds = [],
  compact = false,
}: {
  competencies: ModuleCompetency[];
  initialPrimaryId?: string;
  initialSecondaryIds?: string[];
  compact?: boolean;
}) {
  const [primary, setPrimary] = useState(initialPrimaryId);
  const [secondary, setSecondary] = useState<string[]>(
    initialSecondaryIds.filter((id) => id !== initialPrimaryId).slice(0, 2),
  );

  const grouped = useMemo(
    () => CATEGORY_ORDER.map((category) => ({
      category,
      items: competencies.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0),
    [competencies],
  );

  function setPrimaryCompetency(id: string) {
    if (!id) {
      setPrimary("");
      return;
    }
    setSecondary((current) => current.filter((secondaryId) => secondaryId !== id));
    setPrimary(id);
  }

  function toggleSecondary(id: string) {
    if (id === primary) return;
    setSecondary((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 2
          ? [...current, id]
          : current,
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lernkompetenzen</p>
            <p className="mt-1 text-xs text-slate-400">Eine primäre, bis zu zwei sekundäre.</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
            {primary ? 1 + secondary.length : secondary.length}/3
          </span>
        </div>
      </div>

      <input type="hidden" name="primaryCompetencyId" value={primary} />
      {secondary.map((id) => <input key={id} type="hidden" name="secondaryCompetencyId" value={id} />)}

      <div className="space-y-3">
        {grouped.map((group) => (
          <section key={group.category}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.category}</p>
            <div className="grid gap-1.5">
              {group.items.map((item) => {
                const isPrimary = primary === item.id;
                const isSecondary = secondary.includes(item.id);
                const isSelected = isPrimary || isSecondary;
                const secondaryDisabled = !isSelected && secondary.length >= 2;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-2.5 transition ${isSelected ? "border-accent/40 bg-accent/5" : "border-border bg-white"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPrimaryCompetency(item.id)}
                        aria-pressed={isPrimary}
                        title="Als primäre Kompetenz setzen"
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${isPrimary ? "border-accent bg-accent text-white" : "border-slate-300 text-transparent hover:border-accent"}`}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSecondary(item.id)}
                        disabled={secondaryDisabled}
                        aria-pressed={isSecondary}
                        className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="block text-xs font-medium text-slate-800">{item.title}</span>
                        {!compact && item.description && <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{item.description}</span>}
                      </button>
                      {isSecondary && <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Sek.</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="text-[11px] leading-4 text-slate-400">
        Klick auf <strong>P</strong> = primär. Klick auf den Kompetenznamen = sekundär. Maximal 3 insgesamt.
      </p>
    </div>
  );
}
