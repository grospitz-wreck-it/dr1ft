"use client";

import { useEffect, useState } from "react";
import { eventBus } from "@dr1ft/engine-core";

export interface CompetencyDisplay {
  id: string;
  title: string;
  level: number;
}

function LevelBar({ level }: { level: number }) {
  const safeLevel = Math.max(1, Math.min(5, level));

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={safeLevel}
    >
      <div
        className="h-full rounded-full bg-teal-500 transition-[width] duration-500 ease-out"
        style={{ width: `${(safeLevel / 5) * 100}%` }}
      />
    </div>
  );
}

export function CompetencyPanel({
  initial,
  userId,
  classInstanceId,
}: {
  initial: CompetencyDisplay[];
  userId: string;
  classInstanceId: string;
}) {
  const [competencies, setCompetencies] = useState(initial);
  const [justUpdated, setJustUpdated] = useState<string | null>(null);

  useEffect(() => {
    setCompetencies(initial);
  }, [initial]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = eventBus.on("CompetencyUpdated", (event) => {
      if (
        event.userId !== userId ||
        event.classInstanceId !== classInstanceId
      ) {
        return;
      }

      setCompetencies((previous) =>
        previous.map((competency) =>
          competency.id === event.competencyId
            ? { ...competency, level: event.level }
            : competency
        )
      );

      setJustUpdated(event.competencyId);

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setJustUpdated(null), 1500);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [userId, classInstanceId]);

  if (competencies.length === 0) return null;

  return (
    <section className="mx-auto my-5 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Dein Fortschritt
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Entwicklung deiner Medienkompetenzen
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
          {competencies.length} Kompetenzen
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {competencies.map((competency) => (
          <div
            key={competency.id}
            className={`min-w-0 rounded-lg px-2 py-1.5 transition-colors ${
              justUpdated === competency.id ? "bg-teal-50" : ""
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-slate-700">
                {competency.title}
              </span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">
                {Math.max(1, Math.min(5, competency.level))}/5
              </span>
            </div>
            <LevelBar level={competency.level} />
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
        Fortschritt entsteht durch abgeschlossene Lernmissionen – nicht durch
        Scrollen oder Liken.
      </p>
    </section>
  );
}
