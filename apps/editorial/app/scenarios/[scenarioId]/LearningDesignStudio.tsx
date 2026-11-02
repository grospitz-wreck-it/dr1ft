"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Brain, CheckCircle2, Clock3, GripVertical, Image as ImageIcon, Sparkles, Target } from "lucide-react";
import { ContentModulePicker, type ContentModuleId } from "./ContentModulePicker";

type BloomLevel = "understand" | "apply" | "analyze" | "evaluate" | "create";

type Props = {
  scenarioId: string;
  learningCards?: any[];
  contentItems?: { id: string; title?: string | null; body?: string | null; type?: string | null; media_url?: string | null; media_type?: string | null; status?: string | null }[];
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

export function LearningDesignStudio({ scenarioId, latestDesign, contentItems = [], learningCards = [] }: Props) {
  const [duration, setDuration] = useState(25);
    const [goal, setGoal] = useState<BloomLevel>((latestDesign?.bloom_target as BloomLevel) || "evaluate");
  const [learningPattern, setLearningPattern] = useState("experience_first");

  const PATTERNS = [
    { value: "experience_first", title: "Erleben zuerst", note: "Eine Feed-Situation öffnet den Lernweg." },
    { value: "decision_first", title: "Entscheidung zuerst", note: "Eine Entscheidung macht den Konflikt greifbar." },
    { value: "challenge_first", title: "Herausforderung zuerst", note: "Eine Aufgabe setzt den Lernprozess in Gang." },
    { value: "explore_discover", title: "Entdecken", note: "Hinweise und Perspektiven werden erkundet." },
  ] as const;
  const [contentModules, setContentModules] = useState<ContentModuleId[]>(["feed_post"]);
  const [ambient, setAmbient] = useState<"focused" | "balanced" | "lively">("balanced");
  const [showFlowPreview, setShowFlowPreview] = useState(false);
  const [flowOrder, setFlowOrder] = useState<number[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [manualItems, setManualItems] = useState<{ id: string; label: string; kind: "Lernmoment" | "Ambient" }[]>([]);
  const [showAddContent, setShowAddContent] = useState(false);
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const selectedGoal = GOALS.find((item) => item.value === goal) ?? GOALS[3];
  const selectedPattern = PATTERNS.find((item) => item.value === learningPattern) ?? PATTERNS[0];
  const patternOpenings: Record<string, string> = {
    experience_first: "Feed-Situation erleben",
    decision_first: "Erste Entscheidung treffen",
    challenge_first: "Herausforderung annehmen",
    explore_discover: "Offene Hinweise erkunden",
  };
  const preview = [patternOpenings[learningPattern], ...PATHS[goal].slice(1)];
  const stepCount = duration <= 10 ? 3 : duration <= 25 ? 5 : duration <= 45 ? 7 : 9;
  const ambientMinutes = ambient === "focused" ? 0 : ambient === "balanced" ? 5 : 12;
  const totalDuration = duration + ambientMinutes;
  const ambientCount = ambient === "focused" ? 0 : ambient === "balanced" ? Math.max(1, Math.ceil(stepCount / 3)) : Math.max(2, Math.ceil(stepCount / 2));
  type FlowItem = { id: string; label: string; kind: "Lernmoment" | "Ambient" };
  const learningItems: FlowItem[] = Array.from({ length: stepCount }, (_, index): FlowItem => ({ id: `learning-${index}`, label: preview[index % preview.length], kind: "Lernmoment" }));
  const ambientItems: FlowItem[] = Array.from({ length: ambientCount }, (_, index): FlowItem => ({ id: `ambient-${index}`, label: "Ambient", kind: "Ambient" }));
  const existingItems: FlowItem[] = contentItems.map((item) => ({ id: `content-${item.id}`, label: item.title?.trim() || item.body?.trim().replace(/\s+/g, " ").slice(0, 42) || "Unbenannter Inhalt", kind: "Lernmoment" }));
  const baseFlow: FlowItem[] = [...learningItems];
  ambientItems.forEach((item, index) => baseFlow.splice(Math.min(baseFlow.length, (index + 1) * Math.ceil(stepCount / (ambientCount + 1)) + index), 0, item));
  existingItems.forEach((item, index) => baseFlow.splice(Math.min(baseFlow.length, index * Math.max(1, Math.floor(stepCount / Math.max(existingItems.length, 1))) + 1), 0, item));
  baseFlow.push(...manualItems);
  const flow: FlowItem[] = (flowOrder ?? baseFlow.map((_, index) => index))
    .map(index => baseFlow[index])
    .filter((item): item is FlowItem => item !== undefined);
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
            learningPattern,
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
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">Du bestimmst Ziel und Einstieg. DR1FT entwickelt daraus den passenden Lernweg.</p>
          </div>
          {latestDesign && <span className="ml-auto hidden shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm sm:block">Entwurf v{latestDesign.version}</span>}
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <div>
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-bold text-slate-900">1. Lernziel wählen</h3></div>
          <p className="mt-1 text-xs text-slate-500">Das ist keine Kosmetik: Deine Auswahl steuert den kognitiven Anspruch und wird an die Generierung übergeben.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {GOALS.map((option) => <GoalCard key={option.value} active={goal === option.value} option={option} onClick={() => { setGoal(option.value); setFlowOrder(null); }} />)}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">2. Wie beginnt das Szenario?</h3>
          <p className="mt-1 text-xs text-slate-500">Das Lernmuster bestimmt den dramaturgischen Einstieg – nicht einen starren Ablauf.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {PATTERNS.map((pattern) => (
              <button
                key={pattern.value}
                type="button"
                aria-pressed={learningPattern === pattern.value}
                onClick={() => { setLearningPattern(pattern.value); setFlowOrder(null); }}
                className={"rounded-xl border px-3 py-3 text-left transition " + (learningPattern === pattern.value
                  ? "border-violet-400 bg-violet-50 ring-1 ring-violet-200"
                  : "border-slate-200 bg-white hover:border-violet-200")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{pattern.title}</span>
                  {learningPattern === pattern.value && <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" />}
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-slate-500">{pattern.note}</span>
              </button>
            ))}
          </div>
        </div>

        <ContentModulePicker selected={contentModules} onChange={setContentModules} scenarioId={scenarioId} cards={learningCards} />

        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-bold text-slate-900">3. Zeitrahmen</h3></div>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-semibold text-slate-600">Zeit
                <select value={duration} onChange={(e) => { setDuration(Number(e.target.value)); setFlowOrder(null); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400">
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
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">So greifen Einstieg und Lernziel ineinander</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {preview.map((item, index) => <span key={item} className="flex items-center gap-2"><span className={"rounded-full border px-3 py-2 text-xs font-semibold shadow-sm " + (index === 0 ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800" : "border-violet-100 bg-white text-slate-700")}>{item}</span>{index < preview.length - 1 && <ArrowRight className="h-4 w-4 text-violet-400" />}</span>)}
            </div>
            <div className="mt-4 rounded-xl border border-white/80 bg-white/70 p-3 text-xs leading-5 text-slate-600">
              <div><strong className="text-slate-800">Dein Einstieg:</strong> {selectedPattern.title} – {selectedPattern.note}</div>
              <div className="mt-1"><strong className="text-slate-800">Dein kognitives Ziel:</strong> {selectedGoal.title} – {selectedGoal.subtitle}</div>
              <div className="mt-2 border-t border-violet-50 pt-2"><strong className="text-slate-800">Pädagogische Einordnung:</strong> {pedagogy[goal].model}</div>
              <div className="mt-1">{pedagogy[goal].note}</div>
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
            {([["focused","Fokussiert","Nur der Lernweg"],["balanced","Ausgewogen","+ ca. 5 Min. Feed entdecken"],["lively","Lebendig","+ ca. 10–15 Min. Entdeckungszeit"]] as const).map(([value,title,note]) => <button key={value} type="button" onClick={() => { setAmbient(value); setFlowOrder(null); }} className={`rounded-xl border p-3 text-left ${ambient === value ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"}`}><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-[11px] text-slate-500">{note}</span></button>)}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-white px-4 py-3">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full border-4 border-violet-100 bg-violet-50"><Clock3 className="h-4 w-4 text-violet-600" /></div><div><strong className="block text-sm text-slate-900">Geschätztes Gesamterlebnis</strong><span className="text-[11px] text-slate-500">Lernzeit plus Feed-Entdeckung und Ambient-Momente</span></div></div>
            <strong className="text-lg text-violet-700">ca. {totalDuration}–{totalDuration + (duration <= 25 ? 5 : 10)} Min.</strong>
          </div>
          {showFlowPreview && <div className="mt-4 overflow-x-auto rounded-2xl border border-violet-100 bg-white p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Lernweg-Vorschau</p><p className="mt-1 text-xs text-slate-500">Verschiebe die Karten oder ergänze eigene Inhalte. Die Vorschau folgt deinen Einstellungen.</p></div><button type="button" onClick={() => setShowAddContent(!showAddContent)} className="shrink-0 rounded-xl border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">＋ Inhalte hinzufügen</button></div>{showAddContent && <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-violet-100 bg-violet-50/60 p-3"><button type="button" onClick={() => { setManualItems([...manualItems, { id: `manual-${Date.now()}`, label: "Eigener Lernmoment", kind: "Lernmoment" }]); setFlowOrder(null); setShowAddContent(false); }} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">＋ Lernmoment</button><button type="button" onClick={() => { setManualItems([...manualItems, { id: `manual-${Date.now()}`, label: "Eigener Ambient-Moment", kind: "Ambient" }]); setFlowOrder(null); setShowAddContent(false); }} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">＋ Ambient</button></div>}<div className="mt-4 flex min-w-max gap-3">{flow.map((item,index) => { const contentId = item.id.startsWith("content-") ? item.id.slice(8) : null; const source = contentId ? contentItems.find((content) => content.id === contentId) : null; return <div key={item.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex === null || dragIndex === index) return; const next = [...flow]; const [moved] = next.splice(dragIndex, 1); next.splice(index, 0, moved); const mapped = next.map(item => baseFlow.findIndex(candidate => candidate.id === item.id)); setFlowOrder(mapped); setDragIndex(null); }} className={`relative w-32 cursor-grab rounded-xl border p-2.5 active:cursor-grabbing ${source ? "border-sky-200 bg-sky-50/70" : item.kind === "Ambient" ? "border-slate-200 bg-slate-50" : "border-violet-200 bg-violet-50"}`}><GripVertical className="absolute right-2 top-2 h-3 w-3 text-slate-300" />{source ? <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-white shadow-sm">{source.media_url && source.media_type === "image" ? <img src={source.media_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-600"><ImageIcon className="h-3.5 w-3.5" /> Feed-Inhalt</div>}</div> : <div className="aspect-[4/3] rounded-lg bg-white/70 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.kind}</div>}<p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-700">{item.label}</p><span className="mt-1 block text-[10px] text-slate-400">{source ? "Vorhandener Inhalt · " : ""}{index + 1}</span></div>})}</div></div>}
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
