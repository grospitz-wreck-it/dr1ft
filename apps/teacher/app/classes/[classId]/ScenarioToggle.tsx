"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, MinusCircle } from "lucide-react";
import { toggleScenarioAssignment, updateScenarioPacing } from "../actions";

type ModuleStatus = "Abgeschlossen" | "In Bearbeitung" | "Noch nicht begonnen" | "Nicht zugewiesen";

export function ScenarioToggle({
  classId,
  scenarioId,
  title,
  ageRating,
  initiallyAssigned,
  initialPacingMode = "compact",
  moduleStatus,
  moduleReport,
}: {
  classId: string;
  scenarioId: string;
  title: string;
  ageRating: string;
  initiallyAssigned: boolean;
  initialPacingMode?: "compact" | "as_designed";
  moduleStatus?: ModuleStatus;
  moduleReport?: string;
}) {
  const [selected, setSelected] = useState(initiallyAssigned);
  const [pacing, setPacing] = useState(initialPacingMode);
  const [pending, startTransition] = useTransition();
  useEffect(() => { setSelected(initiallyAssigned); setPacing(initialPacingMode); }, [initiallyAssigned, initialPacingMode]);

  const status = moduleStatus ?? (initiallyAssigned ? "Noch nicht begonnen" : "Nicht zugewiesen");
  const statusStyle = status === "Abgeschlossen"
    ? "bg-emerald-50 text-emerald-700"
    : status === "In Bearbeitung"
      ? "bg-violet-50 text-violet-700"
      : "bg-slate-100 text-slate-600";

  return (
    <li className={`group flex flex-col justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 md:flex-row md:items-center ${selected ? "bg-violet-50/45" : "bg-white"}`}>
      <label className="flex min-w-0 cursor-pointer items-start gap-3">
        <input type="radio" name={`active-module-${classId}`} checked={selected} onChange={() => { setSelected(true); startTransition(() => toggleScenarioAssignment(classId, scenarioId, true, pacing)); }} disabled={pending} className="mt-1 accent-violet-600" />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
            {title}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle}`}>
              {status === "Abgeschlossen" ? <CheckCircle2 className="h-3 w-3" /> : status === "Nicht zugewiesen" ? <MinusCircle className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
              {status}
            </span>
          </span>
          <span className="mt-1 block text-xs text-slate-500">{ageRating} · {selected ? "Aktives Modul" : "Nicht aktiv"}</span>
          {selected && moduleReport && <span className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">{moduleReport}</span>}
        </span>
      </label>
      {selected && <div className="flex items-center gap-2 md:shrink-0">
        <select value={pacing} disabled={pending} onChange={(e) => { const next = e.target.value as "compact" | "as_designed"; setPacing(next); startTransition(() => updateScenarioPacing(classId, scenarioId, next)); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"><option value="compact">Kompakt</option><option value="as_designed">Verteilt</option></select>
        <button type="button" onClick={() => { setSelected(false); startTransition(() => toggleScenarioAssignment(classId, scenarioId, false, pacing)); }} disabled={pending} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">Deaktivieren</button>
      </div>}
    </li>
  );
}
