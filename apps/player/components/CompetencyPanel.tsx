"use client";
// apps/player/components/CompetencyPanel.tsx
//
// Bewusst KEINE Punkte/Badges/Streaks (siehe 04_DESIGN_PRINCIPLES:
// "Reflection over Rewards", Anti-Vision: kein Engagement-Reward-System).
// Stattdessen ruhige Fortschrittsbalken pro Kompetenz, die sich nur bei
// echten Lernmomenten aktualisieren (Mission-Abschluss über den
// bestehenden Event-Bus) — kein Live-Ticker pro Scroll-Bewegung, das
// würde vorab verraten, welcher Post gerade als "verdächtig" zählte.

import { useEffect, useState } from "react";
import { eventBus } from "@dr1ft/engine-core";

export interface CompetencyDisplay {
  id: string;
  title: string;
  level: number; // 1-5
}

function LevelBar({ level }: { level: number }) {
  return (
    <div className="h-1.5 w-full bg-ink-border rounded-full overflow-hidden">
      <div
        className="h-full bg-growth rounded-full transition-all duration-700 ease-out"
        style={{ width: `${(level / 5) * 100}%` }}
      />
    </div>
  );
}

export function CompetencyPanel({ initial }: { initial: CompetencyDisplay[] }) {
  const [competencies, setCompetencies] = useState(initial);
  const [justUpdated, setJustUpdated] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = eventBus.on("CompetencyUpdated", (event) => {
      setCompetencies((prev) =>
        prev.map((c) => (c.id === event.competencyId ? { ...c, level: event.level } : c))
      );
      setJustUpdated(event.competencyId);
      const t = setTimeout(() => setJustUpdated(null), 1500);
      return () => clearTimeout(t);
    });
    return unsubscribe;
  }, []);

  if (competencies.length === 0) return null;

  return (
    <div className="space-y-4">
      <p className="font-mono text-[11px] text-ash uppercase tracking-wide">
        Dein Fortschritt
      </p>
      {competencies.map((c) => (
        <div
          key={c.id}
          className={`transition-opacity ${justUpdated === c.id ? "animate-[slide-up_0.4s_ease-out]" : ""}`}
        >
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-body text-sm text-paper/90">{c.title}</span>
            <span className="font-mono text-[11px] text-ash">{c.level}/5</span>
          </div>
          <LevelBar level={c.level} />
        </div>
      ))}
      <p className="font-body text-xs text-ash/70 pt-2 leading-relaxed">
        Wächst durch abgeschlossene Reflexionen — nicht durch Scrollen
        oder Liken.
      </p>
    </div>
  );
}
