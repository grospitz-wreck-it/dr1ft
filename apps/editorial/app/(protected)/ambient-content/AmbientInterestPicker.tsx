"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

type InterestOption = {
  key: string;
  label: string;
  emoji: string | null;
  category: string;
};

type Props = {
  options: InterestOption[];
  initialValue?: string;
  placeholder?: string;
  maxSelections?: number;
  fieldName?: string;
  labelsFieldName?: string;
  eventName?: string;
};

export function AmbientInterestPicker({
  options,
  initialValue = "",
  placeholder = "Interesse suchen …",
  maxSelections = 3,
  fieldName = "interests",
  labelsFieldName = "interestLabels",
  eventName = "ambient-interests-change",
}: Props) {
  const [selected, setSelected] = useState<string[]>(
    () => initialValue.split(",").map((value) => value.trim()).filter(Boolean).slice(0, maxSelections),
  );
  const [query, setQuery] = useState("");

  const optionByKey = useMemo(
    () => new Map(options.map((option) => [option.key, option])),
    [options],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("de");
    return options
      .filter((option) => !selected.includes(option.key))
      .filter((option) => !normalized || `${option.label} ${option.category} ${option.key}`.toLocaleLowerCase("de").includes(normalized))
      .slice(0, 24);
  }, [options, query, selected]);

  function add(key: string) {
    if (!optionByKey.has(key) || selected.length >= maxSelections || selected.includes(key)) return;
    const next = [...selected, key];
    setSelected(next);
    window.dispatchEvent(new CustomEvent(eventName, { detail: next.map((selectedKey) => optionByKey.get(selectedKey)?.label ?? selectedKey) }));
    setQuery("");
  }

  function remove(key: string) {
    const next = selected.filter((item) => item !== key);
    setSelected(next);
    window.dispatchEvent(new CustomEvent(eventName, { detail: next.map((selectedKey) => optionByKey.get(selectedKey)?.label ?? selectedKey) }));
  }

  return (
    <div>
      <input type="hidden" name={fieldName} value={selected.join(",")} />
      <input type="hidden" name={labelsFieldName} value={selected.map((key) => optionByKey.get(key)?.label ?? key).join(",")} />
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selected.map((key) => {
          const interest = optionByKey.get(key);
          if (!interest) return null;
          return (
            <span key={key} className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 px-2.5 py-1 text-xs font-medium">
              <span>{interest.emoji} {interest.label}</span>
              <button type="button" onClick={() => remove(key)} aria-label={`${interest.label} entfernen`} className="rounded-full hover:bg-violet-100 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <span className="text-[11px] text-slate-400 self-center">{selected.length}/{maxSelections} ausgewählt · {options.length} Themen im Katalog</span>
      </div>
      {selected.length < maxSelections && (
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label="Interessen im gemeinsamen DR1FT-Katalog suchen"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          {filtered.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filtered.map((interest) => (
                <button
                  key={interest.key}
                  type="button"
                  onClick={() => add(interest.key)}
                  className="text-[11px] rounded-full border border-slate-100 bg-slate-100 px-2.5 py-1.5 text-slate-600 transition hover:bg-violet-50 hover:border-violet-100 hover:text-violet-700"
                >
                  {interest.emoji} {interest.label}
                </button>
              ))}
            </div>
          )}
          {query && filtered.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">Kein passendes Interesse im gemeinsamen Katalog. Neue Interessen müssen dort ergänzt werden.</p>
          )}
        </>
      )}
    </div>
  );
}
