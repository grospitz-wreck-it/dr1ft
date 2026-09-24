"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

type Props = {
  options: string[];
  initialValue?: string;
  placeholder?: string;
};

export function AmbientInterestPicker({
  options,
  initialValue = "",
  placeholder = "z.B. Gaming, Musik, Sport",
}: Props) {
  const initial = useMemo(
    () => initialValue.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 3),
    [initialValue],
  );
  const [selected, setSelected] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  function add(value: string) {
    const clean = value.trim();
    if (!clean || selected.length >= 3 || selected.includes(clean)) return;
    setSelected((current) => [...current, clean]);
    setDraft("");
  }

  function remove(value: string) {
    setSelected((current) => current.filter((item) => item !== value));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    }
    if (event.key === "Backspace" && !draft && selected.length) {
      remove(selected[selected.length - 1]);
    }
  }

  return (
    <div>
      <input type="hidden" name="interests" value={selected.join(", ")} />
      <div className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 flex flex-wrap items-center gap-1.5 focus-within:border-accent">
        {selected.map((interest) => (
          <span
            key={interest}
            className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 px-2.5 py-1 text-xs font-medium"
          >
            {interest}
            <button
              type="button"
              onClick={() => remove(interest)}
              aria-label={`${interest} entfernen`}
              className="rounded-full hover:bg-violet-100 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selected.length < 3 && (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (draft.trim()) add(draft);
            }}
            placeholder={selected.length ? "weiteres Interesse …" : placeholder}
            className="min-w-[180px] flex-1 border-0 outline-none bg-transparent text-sm py-1"
          />
        )}
        {selected.length >= 3 && (
          <span className="text-[11px] text-slate-400 ml-1">max. 3 ausgewählt</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {options.map((interest) => {
          const active = selected.includes(interest);
          return (
            <button
              key={interest}
              type="button"
              onClick={() => (active ? remove(interest) : add(interest))}
              disabled={!active && selected.length >= 3}
              className={`text-[11px] rounded-full border px-2.5 py-1.5 transition ${
                active
                  ? "bg-violet-100 border-violet-200 text-violet-800"
                  : "bg-slate-100 border-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {interest}
            </button>
          );
        })}
      </div>
    </div>
  );
}
