"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Brain, CheckCircle2, Clock3, Sparkles, Target } from "lucide-react";

type BloomLevel = "understand" | "apply" | "analyze" | "evaluate" | "create";

type Props = {
  scenarioId: string;
  latestDesign?: {
    id: string; version: number; status: string; title: string;
    description: string | null; primary_learning_model: string;
    bloom_target: string; pedagogical_warnings: unknown;
  } | null;
};

const GOALS: { value: BloomLevel; title: string; subtitle: string; icon: string }[] = [
  { value: "understand", title: "Verstehen", subtitle: "Zusammenhänge erkennen und erklären", icon: "💡" },
  { value: "apply", title: "Anwenden", subtitle: "Wissen in einer Situation nutzen", icon: "🛠️" },
  { value: "analyze", title: "Analysieren", subtitle: "Hinweise, Muster und Zusammenhänge erkennen", icon: "🔎" },
  { value: "evaluate", title: "Bewerten", subtitle: "Optionen abwägen und Urteile begründen", icon: "⚖️" },
  { value: "create", title: "Entwickeln", subtitle: "Eigene Ideen und Lösungen gestalten", icon: "✨" },
];

const PATHS: Record<BloomLevel, string[]> = {
  understand: ["Entdecken", "Zusammenhänge erkennen", "Verstehen"],
  apply: ["Situation erleben", "Ausprobieren", "Anwenden"],
  analyze: ["Hinweise entdecken", "Muster erkennen", "Analysieren"],
  evaluate: ["Perspektiven sammeln", "Optionen abwägen", "Urteil begründen"],
  create: ["Ideen sammeln", "Lösungen entwickeln", "Gestalten"],
};

function GoalCard({ active, option, onClick }: { active: boolean; option: typeof GOALS[number]; onClick: () => void }) {
  return <button type="button" onClick={onClick}
    className={"group relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all " +
      (active ? "border-violet-400 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-sky-50 shadow-md shadow-violet-100 ring-1 ring-violet-200"
        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-sm")}>
    <span className="mb-2 flex items-center justify-between">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg shadow-sm">{option.icon}</span>
      {active && <CheckCircle2 className="h-5 w-5 text-violet-600" />}
    </span>
    <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
    <span className="mt-1 block text-[11px] leading-4 text-slate-500">{option.subtitle}</span>
  </button>;
}

export function LearningDesignStudio({ scenarioId, latestDesign }: Props) {
  const [duration, setDuration] = useState(25);
  const [stepCount, setStepCount] = useState(7);
  const [goal, setGoal] = useState<BloomLevel>((latestDesign?.bloom_target as BloomLevel) || "evaluate");
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const selectedGoal = GOALS.find((item) => item.value === goal) ?? GOALS[3];
  const preview = PATHS[goal];

  function createDesign() {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/scenarios/" + scenarioId + "/learning-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes: duration,
            learningStepCount: stepCount,
            // Der Builder übersetzt das einfache Ziel im Hintergrund in die passende didaktische Struktur.
            primaryLearningModel: "backward_design",
            bloomTarget: goal,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Generierung fehlgeschlagen.");
        setMessage(result.stepCount + " Stationen wurden als Entwurf erstellt. Du kannst sie anschließend gezielt weiterentwickeln.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Generierung fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/70 via-white to-fuchsia-50/60 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-200">
            <Brain className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">Lernweg gestalten</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Was sollen Lernende am Ende können?</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">Du triffst zwei einfache Entscheidungen. Die didaktische Struktur entsteht im Hintergrund – nachvollziehbar statt kompliziert.</p>
          </div>
          {latestDesign && <span className="ml-auto hidden shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm sm:block">Entwurf v{latestDesign.version}</span>}
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">1. Lernziel wählen</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">Das ist keine Kosmetik: Deine Auswahl steuert den kognitiven Anspruch und wird an die Generierung übergeben.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {GOALS.map((option) => <GoalCard key={option.value} active={goal === option.value} option={option} onClick={() => setGoal(option.value)} />)}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-bold text-slate-900">2. Rahmen festlegen</h3></div>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-semibold text-slate-600">Zeit
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400">
                  <option value={10}>10–15 Minuten</option><option value={25}>20–30 Minuten</option><option value={45}>Ca. 45 Minuten</option><option value={60}>60 Minuten oder mehr</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Lernweg
                <select value={stepCount} onChange={(e) => setStepCount(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400">
                  {[3,4,5,6,7,8,9,10,12].map((count) => <option key={count} value={count}>{count} Stationen</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4">
            <div className="absolute -right-8 -top-8 text-7xl opacity-[0.08]">🧭</div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">So könnte sich der Lernweg anfühlen</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {preview.map((item, index) => <span key={item} className="flex items-center gap-2">
                <span className="rounded-full border border-violet-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">{item}</span>
                {index < preview.length - 1 && <ArrowRight className="h-4 w-4 text-violet-400" />}
              </span>)}
            </div>
            <div className="mt-5 rounded-xl border border-white/80 bg-white/70 p-3 text-xs leading-5 text-slate-600">
              <strong className="text-slate-800">{selectedGoal.title}:</strong> DR1FT nutzt diesen Anspruch als Leitlinie für Lernziele, Stationen und die spätere KI-Generierung.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-500"><strong className="text-slate-700">Einfach bedienen, fachlich fundiert.</strong> Weitere pädagogische Details bleiben im Hintergrund und können später bei Bedarf gezielt bearbeitet werden.</p>
          <button type="button" disabled={busy} onClick={createDesign} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50">
            <Sparkles className="h-4 w-4" />{busy ? "Lernweg wird erstellt …" : "Lernweg erstellen"}
          </button>
        </div>

        {message && <div role="status" className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm leading-5 text-slate-700">{message}</div>}
      </div>
    </section>
  );
}
