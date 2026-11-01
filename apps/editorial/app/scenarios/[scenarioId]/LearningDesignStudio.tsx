"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Brain, CheckCircle2, Clock3, Sparkles, Target } from "lucide-react";

type LearningModel = "backward_design" | "constructive_alignment" | "kolb";
type BloomLevel = "understand" | "apply" | "analyze" | "evaluate" | "create";

type Props = {
  scenarioId: string;
  latestDesign?: {
    id: string;
    version: number;
    status: string;
    title: string;
    description: string | null;
    primary_learning_model: string;
    bloom_target: string;
    pedagogical_warnings: unknown;
  } | null;
};

const MODEL_OPTIONS: { value: LearningModel; title: string; subtitle: string; icon: string }[] = [
  { value: "backward_design", title: "Vom Ziel ausgehen", subtitle: "Erst klären, was am Ende gelingen soll.", icon: "🎯" },
  { value: "constructive_alignment", title: "Alles verbindet sich", subtitle: "Ziel, Aufgabe und Nachweis greifen ineinander.", icon: "🧩" },
  { value: "kolb", title: "Durch Erfahrung lernen", subtitle: "Erleben, reflektieren und neu ausprobieren.", icon: "🌱" },
];

const BLOOM_OPTIONS: { value: BloomLevel; title: string; prompt: string }[] = [
  { value: "understand", title: "Verstehen", prompt: "Zusammenhänge erklären" },
  { value: "apply", title: "Anwenden", prompt: "Wissen konkret nutzen" },
  { value: "analyze", title: "Analysieren", prompt: "Hinweise und Muster erkennen" },
  { value: "evaluate", title: "Bewerten", prompt: "Entscheidungen begründen" },
  { value: "create", title: "Entwickeln", prompt: "Eigene Lösungen gestalten" },
];

function ChoiceCard({
  active,
  title,
  subtitle,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"group relative rounded-2xl border p-4 text-left transition " + (active
        ? "border-violet-400 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-sm ring-1 ring-violet-200"
        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-sm")}
    >
      <span className="mb-3 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-sm">{icon}</span>
        {active && <CheckCircle2 className="h-5 w-5 text-violet-600" />}
      </span>
      <span className="block text-sm font-semibold text-slate-900">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{subtitle}</span>
    </button>
  );
}

export function LearningDesignStudio({ scenarioId, latestDesign }: Props) {
  const [duration, setDuration] = useState(25);
  const [stepCount, setStepCount] = useState(7);
  const [model, setModel] = useState<LearningModel>("backward_design");
  const [bloom, setBloom] = useState<BloomLevel>("evaluate");
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const selectedModel = MODEL_OPTIONS.find((item) => item.value === model) ?? MODEL_OPTIONS[0];
  const selectedBloom = BLOOM_OPTIONS.find((item) => item.value === bloom) ?? BLOOM_OPTIONS[3];

  const preview = model === "kolb"
    ? ["Erleben", "Reflektieren", selectedBloom.value === "create" ? "Ausprobieren" : "Anwenden"]
    : model === "constructive_alignment"
      ? ["Ziel klären", "Im Feed handeln", "Lernen sichtbar machen"]
      : ["Ziel klären", "Hinweise entdecken", selectedBloom.value === "evaluate" ? "Urteil begründen" : selectedBloom.title];

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
            primaryLearningModel: model,
            bloomTarget: bloom,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Generierung fehlgeschlagen.");
        setMessage(result.stepCount + " Lernschritte wurden als Entwurf erzeugt. Du kannst sie anschließend prüfen und weiterbearbeiten.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Generierung fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
            <Brain className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Lernplan gestalten</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Was sollen Lernende hier wirklich mitnehmen?</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
              Du triffst nur die wichtigen Entscheidungen. DR1FT übersetzt sie im Hintergrund in eine didaktische Struktur, die du anschließend prüfen kannst.
            </p>
          </div>
          {latestDesign && <span className="ml-auto hidden shrink-0 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 sm:block">Lernplan v{latestDesign.version}</span>}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-slate-900">Wie viel Raum haben wir?</h3>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <label className="text-xs font-medium text-slate-600">
                Zeit
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400">
                  <option value={10}>10–15 Minuten</option>
                  <option value={25}>20–30 Minuten</option>
                  <option value={45}>Ca. 45 Minuten</option>
                  <option value={60}>60 Minuten oder mehr</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Lernweg
                <select value={stepCount} onChange={(e) => setStepCount(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400">
                  {[3, 4, 5, 6, 7, 8, 9, 10, 12].map((count) => <option key={count} value={count}>{count} Stationen</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-fuchsia-50/50 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-slate-900">Was sollen Lernende tun können?</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">Wähle den Anspruch, der zu diesem Szenario passt.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BLOOM_OPTIONS.map((option) => {
                const active = bloom === option.value;
                return (
                  <button key={option.value} type="button" onClick={() => setBloom(option.value)} className={"rounded-full border px-3 py-2 text-left transition " + (active ? "border-violet-400 bg-violet-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200")}>
                    <span className="block text-xs font-semibold">{option.title}</span>
                    <span className={"mt-0.5 block text-[10px] " + (active ? "text-violet-100" : "text-slate-400")}>{option.prompt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Lernweg auswählen</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Wie soll sich das Lernen anfühlen?</h3>
            <p className="mt-1 text-xs text-slate-500">Keine Fachbegriffe nötig: Wähle einfach die Logik, die am besten zum Szenario passt.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {MODEL_OPTIONS.map((option) => (
              <ChoiceCard key={option.value} active={model === option.value} title={option.title} subtitle={option.subtitle} icon={option.icon} onClick={() => setModel(option.value)} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Dein Lernweg auf einen Blick</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedModel.title} · {selectedBloom.title}</p>
              <p className="mt-1 text-xs text-slate-500">{stepCount} Stationen · {duration === 10 ? "10–15" : duration === 25 ? "20–30" : duration === 45 ? "ca. 45" : "60+"} Minuten</p>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              {preview.map((item, index) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{item}</span>
                  {index < preview.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-violet-400" />}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-500">
            <strong className="text-slate-700">Die pädagogische Tiefe bleibt erhalten.</strong> DR1FT erstellt daraus Lernziele, Lernschritte und prüfbare Zusammenhänge. Du bekommst anschließend einen Entwurf – keine Black Box.
          </p>
          <button type="button" disabled={busy} onClick={createDesign} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50">
            <Sparkles className="h-4 w-4" />
            {busy ? "Lernplan wird erstellt …" : "Lernplan erstellen"}
          </button>
        </div>

        {message && <div role="status" className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm leading-5 text-slate-700">{message}</div>}

        {latestDesign?.pedagogical_warnings && Array.isArray(latestDesign.pedagogical_warnings) && latestDesign.pedagogical_warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-900">Hinweise zum aktuellen Entwurf</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {latestDesign.pedagogical_warnings.map((warning, index) => <li key={index}>{String(warning)}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
