"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Brain, CheckCircle2, Clock3, Sparkles, Target } from "lucide-react";
import { ContentModulePicker, type ContentModuleId } from "./ContentModulePicker";

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
    const [goal, setGoal] = useState<BloomLevel>((latestDesign?.bloom_target as BloomLevel) || "evaluate");
  const [contentModules, setContentModules] = useState<ContentModuleId[]>(["feed_post"]);
  const [ambient, setAmbient] = useState<"focused" | "balanced" | "lively">("balanced");
  const [showFlowPreview, setShowFlowPreview] = useState(false);
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const selectedGoal = GOALS.find((item) => item.value === goal) ?? GOALS[3];
  const preview = PATHS[goal];
  const stepCount = duration <= 10 ? 3 : duration <= 25 ? 5 : duration <= 45 ? 7 : 9;
  const ambientMinutes = ambient === "focused" ? 0 : ambient === "balanced" ? 5 : 12;
  const totalDuration = duration + ambientMinutes;
  const pedagogy: Record<BloomLevel, { model: string; note: string }> = {
    understand: { model: "Kolb · Erfahren → Beobachten → Einordnen", note: "Der Lernweg schafft zuerst Orientierung und verbindet Beobachtungen mit neuen Zusammenhängen." },
    apply: { model: "Kolb · Erproben im Kontext", note: "Wissen wird in einer konkreten Situation angewendet und anschließend überprüft." },
    analyze: { model: "Inquiry · Hinweise → Muster → Schlussfolgerung", note: "Lernende untersuchen Informationen, vergleichen Perspektiven und erkennen Zusammenhänge." },
    evaluate: { model: "Reflexiv · Perspektiven → Abwägen → Begründen", note: "Unterschiedliche Optionen werden geprüft und ein eigenes Urteil nachvollziehbar begründet." },
    create: { model: "Design-orientiert · Ideen → Entwurf → Gestaltung", note: "Lernende entwickeln auf Basis der Erkenntnisse eigene Ideen und Lösungen." },
  };

  function createDesign() {
    if (!contentModules.length) {
      setMessage("Wähle mindestens ein Content-Modul aus.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/scenarios/" + scenarioId + "/learning-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes: duration,
            learningStepCount: stepCount,
            primaryLearningModel: "backward_design",
            bloomTarget: goal,
            allowedContentModules: contentModules,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Generierung fehlgeschlagen.");
        setMessage(result.stepCount + " Lernschritte wurden als Entwurf erstellt. Die gewählten Content-Module werden als Vorgabe für die weitere Generierung mitgegeben.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Generierung fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/70 via-white to-fuchsia-50/60 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-200"><Brain className="h-6 w-6" /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">Lernweg gestalten</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Was sollen Lernende am Ende können?</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">Du triffst drei einfache Entscheidungen. Die didaktische Struktur entsteht im Hintergrund – nachvollziehbar statt kompliziert.</p>
          </div>
          {latestDesign && <span className="ml-auto hidden shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm sm:block">Entwurf v{latestDesign.version}</span>}
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <div>
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-bold text-slate-900">1. Lernziel wählen</h3></div>
          <p className="mt-1 text-xs text-slate-500">Das ist keine Kosmetik: Deine Auswahl steuert den kognitiven Anspruch und wird an die Generierung übergeben.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {GOALS.map((option) => <GoalCard key={option.value} active={goal === option.value} option={option} onClick={() => setGoal(option.value)} />)}
          </div>
        </div>

        <ContentModulePicker selected={contentModules} onChange={setContentModules} />

        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-bold text-slate-900">3. Rahmen festlegen</h3></div>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-semibold text-slate-600">Zeit
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400">
                  <option value={10}>10–15 Minuten</option><option value={25}>20–30 Minuten</option><option value={45}>Ca. 45 Minuten</option><option value={60}>60 Minuten oder mehr</option>
                </select>
              </label>
              <div className="rounded-xl border border-violet-100 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">Umfang</span>
                  <span className="text-xs font-bold text-violet-700">ca. {stepCount} Lernmomente</span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">Die Dauer steuert automatisch, wie viel Raum der Lernweg für Einstieg, Vertiefung und Reflexion erhält.</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4">
            <div className="absolute -right-8 -top-8 text-7xl opacity-[0.08]">🧭</div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">So könnte sich der Lernweg anfühlen</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {preview.map((item, index) => <span key={item} className="flex items-center gap-2"><span className="rounded-full border border-violet-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">{item}</span>{index < preview.length - 1 && <ArrowRight className="h-4 w-4 text-violet-400" />}</span>)}
            </div>
            <div className="mt-5 space-y-2 rounded-xl border border-white/80 bg-white/70 p-3 text-xs leading-5 text-slate-600">
              <div><strong className="text-slate-800">Pädagogische Einordnung:</strong> {pedagogy[goal].model}</div>
              <div>{pedagogy[goal].note}</div>
              <div className="border-t border-violet-50 pt-2 text-slate-500"><strong className="text-slate-700">{duration <= 10 ? "Kompakt" : duration <= 25 ? "Standard" : duration <= 45 ? "Vertiefend" : "Ausführlich"}:</strong> ca. {stepCount} Lernmomente werden passend zur gewählten Zeit geplant.</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="text-sm font-bold text-slate-900">Wie lebendig soll sich der Lernweg anfühlen?</h3><p className="mt-1 text-xs text-slate-500">Ambient-Content verändert die Feed-Erfahrung und die tatsächliche Entdeckungszeit.</p></div>
            <button type="button" onClick={() => setShowFlowPreview(!showFlowPreview)} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700">Lernweg-Vorschau</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {([["focused","Fokussiert","Nur der Lernweg"],["balanced","Ausgewogen","+ ca. 5 Min. Feed entdecken"],["lively","Lebendig","+ ca. 10–15 Min. Entdeckungszeit"]] as const).map(([value,title,note]) => <button key={value} type="button" onClick={() => setAmbient(value)} className={`rounded-xl border p-3 text-left ${ambient === value ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"}`}><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-[11px] text-slate-500">{note}</span></button>)}
          </div>
          <div className="mt-4 rounded-xl border border-violet-100 bg-white px-4 py-3 text-xs text-slate-600"><strong className="text-slate-800">Geschätztes Gesamterlebnis:</strong> ca. {totalDuration}–{totalDuration + (duration <= 25 ? 5 : 10)} Minuten <span className="text-slate-400">· Lernzeit plus Feed-Entdeckung und Ambient-Momente</span></div>
          {showFlowPreview && <div className="mt-4 overflow-x-auto rounded-2xl border border-violet-100 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Abstrakte Lernweg-Vorschau</p><p className="mt-1 text-xs text-slate-500">Die Reihenfolge wird später per Drag & Drop anpassbar.</p><div className="mt-4 flex min-w-max gap-3">{preview.flatMap((item,index) => [{label:item,kind:"Lernmoment"}, ...(ambient !== "focused" && index < preview.length - 1 ? [{label:"Ambient",kind:"Ambient"}] : [])]).map((item,index) => <div key={index} className={`w-28 rounded-xl border p-3 ${item.kind === "Ambient" ? "border-slate-200 bg-slate-50" : "border-violet-200 bg-violet-50"}`}><div className="aspect-[4/3] rounded-lg bg-white/70 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.kind}</div><p className="mt-2 text-xs font-semibold text-slate-700">{item.label}</p><span className="mt-1 block text-[10px] text-slate-400">{index + 1}</span></div>)}</div></div>}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-500"><strong className="text-slate-700">Einfach bedienen, fachlich fundiert.</strong> Du legst Ziel, verfügbare Bausteine und Umfang fest. Die konkrete pädagogische Planung übernimmt DR1FT.</p>
          <button type="button" disabled={busy || !contentModules.length} onClick={createDesign} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy ? "Lernweg wird erstellt …" : "Lernweg erstellen"}</button>
        </div>

        {message && <div role="status" className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm leading-5 text-slate-700">{message}</div>}
      </div>
    </section>
  );
}
