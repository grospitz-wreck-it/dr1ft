"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";

type Interest = { key: string; label: string; emoji: string | null; category: string };

export function NpcInterestSelector({ interests }: { interests: Interest[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const grouped = useMemo(
    () => interests.reduce<Record<string, Interest[]>>((groups, interest) => {
      (groups[interest.category] ??= []).push(interest);
      return groups;
    }, {}),
    [interests],
  );

  function toggle(key: string) {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : current.length < 3
          ? [...current, key]
          : current,
    );
  }

  return (
    <div>
      <input type="hidden" name="interestKeys" value={selected.join(",")} />
      <div className="flex items-center justify-between mb-2">
        <span className="label">INTERESSEN</span>
        <span className="text-[11px] font-semibold text-violet-600">{selected.length}/3</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">Wähle genau 3 Interessen. Sie sind die kanonische Grundlage für späteres Content-Matching.</p>
      <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-4">
        {Object.entries(grouped).map(([category, categoryInterests]) => (
          <div key={category}>
            <div className="text-[10px] uppercase tracking-[.16em] font-semibold text-slate-400 mb-2">{category}</div>
            <div className="flex flex-wrap gap-2">
              {categoryInterests.map((interest) => {
                const isSelected = selected.includes(interest.key);
                const disabled = !isSelected && selected.length >= 3;
                return (
                  <button
                    key={interest.key}
                    type="button"
                    onClick={() => toggle(interest.key)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
                      isSelected
                        ? "border-violet-400 bg-violet-50 text-violet-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/40"
                    } ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
                  >
                    <span aria-hidden="true">{interest.emoji}</span>
                    <span>{interest.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {selected.length !== 3 && (
        <p className="text-[11px] text-amber-600 mt-2">Noch {3 - selected.length} Interesse{3 - selected.length === 1 ? "" : "n"} auswählen.</p>
      )}
    </div>
  );
}
