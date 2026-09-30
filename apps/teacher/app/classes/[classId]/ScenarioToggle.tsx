"use client";

import { useState, useTransition } from "react";
import { toggleScenarioAssignment, updateScenarioPacing } from "../actions";

export function ScenarioToggle({ classId, scenarioId, title, ageRating, initiallyAssigned, initialPacingMode = "compact" }: { classId: string; scenarioId: string; title: string; ageRating: string; initiallyAssigned: boolean; initialPacingMode?: "compact" | "as_designed" }) {
  const [selected, setSelected] = useState(initiallyAssigned);
  const [pacing, setPacing] = useState(initialPacingMode);
  const [pending, startTransition] = useTransition();

  return <li className={`px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${selected ? "bg-indigo-50/50" : ""}`}>
    <label className="flex items-start gap-3 cursor-pointer min-w-0">
      <input type="radio" name={`active-module-${classId}`} checked={selected} onChange={() => { setSelected(true); startTransition(() => toggleScenarioAssignment(classId, scenarioId, true, pacing)); }} disabled={pending} className="mt-1" />
      <span><span className="block font-medium text-slate-900">{title}</span><span className="block text-xs text-slate-400 mt-0.5">{ageRating} · {selected ? "Aktiv" : "Nicht aktiv"}</span></span>
    </label>
    {selected && <div className="flex items-center gap-2">
      <select value={pacing} disabled={pending} onChange={(e) => { const next = e.target.value as "compact" | "as_designed"; setPacing(next); startTransition(() => updateScenarioPacing(classId, scenarioId, next)); }} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white"><option value="compact">Kompakt</option><option value="as_designed">Verteilt</option></select>
      <button type="button" onClick={() => { setSelected(false); startTransition(() => toggleScenarioAssignment(classId, scenarioId, false, pacing)); }} disabled={pending} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white">Deaktivieren</button>
    </div>}
  </li>;
}