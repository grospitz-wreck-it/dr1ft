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
    <li className={`flex flex-col justify-between gap-4 px-4 py-4 md:flex-row md:items-center ${selected ? "bg-violet-50/40" : ""}`}>
      <label className="flex min-w-0 cursor-pointer items-start gap-3">
        <input type="radio" name={`active-module-${classId}`} checked={selected} onChange={() => { setSelected(true); startTransition(() => toggleScenarioAssignment(classId, scenarioId, true, pacing)); }} disabled={pending} className="mt-1 accent-violet-600" />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
            {title}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
              {status === "Abgeschlossen" ? <CheckCircle2 className="h-3 w-3" /> : status === "Nicht zugewiesen" ? <MinusCircle className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
              {status}
            </span>
          </span>
          <span className="mt-1 block text-xs text-slate-400">{ageRating} · {selected ? "Aktives Modul" : "Nicht aktiv"}</span>
          {selected && moduleReport && <span className="mt-2 block text-xs leading-5 text-slate-500">{moduleReport}</span>}
        </span>
      </label>
      {selected && <div className="flex items-center gap-2 md:shrink-0">
        <select value={pacing} disabled={pending} onChange={(e) => { const next = e.target.value as "compact" | "as_designed"; setPacing(next); startTransition(() => updateScenarioPacing(classId, scenarioId, next)); }} className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs"><option value="compact">Kompakt</option><option value="as_designed">Verteilt</option></select>
        <button type="button" onClick={() => { setSelected(false); startTransition(() => toggleScenarioAssignment(classId, scenarioId, false, pacing)); }} disabled={pending} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white">Deaktivieren</button>
      </div>}
    </li>
  );
}
