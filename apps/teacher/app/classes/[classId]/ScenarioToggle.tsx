"use client";
// apps/teacher/app/classes/[classId]/ScenarioToggle.tsx
// Checkbox, die die Server Action toggleScenarioAssignment direkt auslöst,
// plus Pacing-Auswahl (kompakt/verteilt) für bereits zugewiesene Szenarien.

import { useTransition } from "react";
import { toggleScenarioAssignment, updateScenarioPacing } from "../actions";

interface Props {
  classId: string;
  scenarioId: string;
  title: string;
  ageRating: string;
  initiallyAssigned: boolean;
  initialPacingMode?: "compact" | "as_designed";
}

export function ScenarioToggle({
  classId,
  scenarioId,
  title,
  ageRating,
  initiallyAssigned,
  initialPacingMode = "compact",
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between text-sm px-4 py-2.5 gap-2">
      <span>
        {title} <span className="text-slate-400">({ageRating})</span>
      </span>
      <div className="flex items-center gap-2">
        {initiallyAssigned && (
          <select
            defaultValue={initialPacingMode}
            disabled={isPending}
            onChange={(e) =>
              startTransition(() => {
                updateScenarioPacing(classId, scenarioId, e.target.value as "compact" | "as_designed");
              })
            }
            className="text-xs border border-border rounded-md px-1 py-0.5"
            title="Pacing-Modus"
          >
            <option value="compact">Kompakt (1 Stunde)</option>
            <option value="as_designed">Verteilt (mehrere Tage)</option>
          </select>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={initiallyAssigned}
            disabled={isPending}
            onChange={(e) => {
              const next = e.target.checked;
              startTransition(() => {
                toggleScenarioAssignment(classId, scenarioId, next);
              });
            }}
          />
          {isPending ? "speichert…" : initiallyAssigned ? "freigeschaltet" : "gesperrt"}
        </label>
      </div>
    </li>
  );
}
