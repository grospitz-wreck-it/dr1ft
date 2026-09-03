"use client";

import { Check } from "lucide-react";
import { useState } from "react";

type Module = { id: string; title: string };

export function NpcModuleSelector({ modules, initialSelected = [] }: { modules: Module[]; initialSelected?: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  return (
    <div>
      <input type="hidden" name="moduleIds" value={selected.join(",")} />
      <div className="flex items-center justify-between mb-2">
        <span className="label">MODULE</span>
        <span className={`text-[11px] font-semibold ${selected.length ? "text-violet-600" : "text-amber-600"}`}>{selected.length ? `${selected.length} ausgewählt` : "mind. 1 auswählen"}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">Wähle die Module, in denen dieser Akteur grundsätzlich auftreten darf. Ein Akteur kann mehreren Modulen zugeordnet sein.</p>
      <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 space-y-1.5">
        {modules.map(module => {
          const isSelected = selected.includes(module.id);
          return <button key={module.id} type="button" onClick={() => toggle(module.id)} aria-pressed={isSelected} className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-xs transition ${isSelected ? "border-violet-300 bg-violet-50 text-violet-800" : "border-transparent bg-white text-slate-600 hover:border-slate-200"}`}><span>{module.title}</span>{isSelected && <Check className="w-4 h-4 shrink-0" />}</button>;
        })}
        {!modules.length && <div className="px-3 py-4 text-xs text-slate-400">Noch keine Module vorhanden.</div>}
      </div>
    </div>
  );
}
