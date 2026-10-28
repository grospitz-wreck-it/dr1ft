"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Image as ImageIcon, Info, Sparkles } from "lucide-react";

type LearningModel = "backward_design" | "constructive_alignment" | "kolb";
type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

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

const MODEL_OPTIONS: { value: LearningModel; title: string; short: string; effect: string; result: string; visual: string[] }[] = [
  {
    value: "backward_design",
    title: "Vom Lernziel ausgehen",
    short: "Ziel → Nachweis → Lernweg",
    effect: "DR1FT plant rückwärts: erst das gewünschte Können, dann ein sichtbarer Nachweis und daraus passende Lernschritte.",
    result: "Die Stationen arbeiten auf ein klares Lernziel hin. Die Redaktion kann prüfen, woran sich der Lernerfolg erkennen lässt.",
    visual: ["Lernziel", "Nachweis", "Feed & Aufgaben"],
  },
  {
    value: "constructive_alignment",
    title: "Ziel, Aufgabe und Nachweis verbinden",
    short: "Alles greift ineinander",
    effect: "Jedes Lernziel wird mit einer passenden Aktivität und einem beobachtbaren Nachweis verknüpft.",
    result: "Du erhältst Lernschritte, bei denen Aufgabe und erwarteter Lernerfolg zusammenpassen – statt nur thematisch passende Inhalte.",
    visual: ["Lernziel", "Feed-Aktivität", "Nachweis"],
  },
  {
    value: "kolb",
    title: "Durch Erfahrung lernen",
    short: "Erleben → Reflektieren → Ausprobieren",
    effect: "DR1FT baut den Lernweg um eine Erfahrung herum auf: erleben, darüber nachdenken, ein Prinzip erkennen und es erneut anwenden.",
    result: "Der Lernplan enthält einen nachvollziehbaren Erfahrungsbogen statt einer reinen Folge von Informationen.",
    visual: ["Erleben", "Reflektieren", "Erkennen", "Ausprobieren"],
  },
];

const BLOOM_OPTIONS: { value: BloomLevel; title: string; prompt: string; effect: string }[] = [
  { value: "understand", title: "Verstehen", prompt: "Zusammenhänge in eigenen Worten erklären", effect: "Die Lernenden erklären, was passiert und warum." },
  { value: "apply", title: "Anwenden", prompt: "Wissen in einer konkreten Situation nutzen", effect: "Die Lernenden wenden eine Strategie auf einen konkreten Fall an." },
  { value: "analyze", title: "Analysieren", prompt: "Hinweise vergleichen und Zusammenhänge erkennen", effect: "Die Lernenden untersuchen Hinweise, Muster oder Interessen." },
  { value: "evaluate", title: "Bewerten", prompt: "Eine Entscheidung treffen und begründen", effect: "Die Lernenden wägen Optionen ab und begründen ihre Entscheidung." },
  { value: "create", title: "Eigenes entwickeln", prompt: "Eine eigene Lösung oder Handlung entwickeln", effect: "Die Lernenden entwerfen eine eigene Antwort, Lösung oder Handlungsstrategie." },
];

function MiniFlow({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1" aria-label={"Ablauf: " + items.join(" → ")}>
      {items.map((item, index) => (
        <span key={item} className="contents">
          <span className="flex min-h-8 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg border border-violet-100 bg-white px-1.5 py-1 text-center text-[10px] font-semibold leading-3 text-slate-700">{item}</span>
          {index < items.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-violet-400" aria-hidden="true" />}
        </span>
      ))}
    </div>
  );
}

function InfoTip({ children }: { children: ReactNode }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <Info className="h-3.5 w-3.5 cursor-help text-slate-400" aria-label="Mehr erfahren" />
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-normal leading-4 text-white shadow-xl group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  );
}

export function LearningDesignStudio({ scenarioId, latestDesign }: Props) {
  const [duration, setDuration] = useState(25);
  const [stepCount, setStepCount] = useState(7);
  const [model, setModel] = useState<LearningModel>("backward_design");
  const [bloom, setBloom] = useState<BloomLevel>("evaluate");
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const selectedModel = MODEL_OPTIONS.find((option) => option.value === model) ?? MODEL_OPTIONS[0];
  const selectedBloom = BLOOM_OPTIONS.find((option) => option.value === bloom) ?? BLOOM_OPTIONS[3];

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
        setMessage(result.stepCount + " Lernschritte wurden als Entwurf erzeugt. Bitte prüfe die pädagogischen Zuordnungen vor der Freigabe.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Generierung fehlgeschlagen.");
      }
    });
  }

  function createContent() {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/scenarios/" + scenarioId + "/learning-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learningDesignId: latestDesign?.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Content-Generierung fehlgeschlagen.");
        setMessage(result.created + " Content-Elemente wurden als Entwurf erzeugt.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Content-Generierung fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Lernplan gestalten</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Wie sollen die Lernenden lernen?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
              Wähle einen Lernweg und die Art des Denkens. DR1FT nutzt beides, um Lernplan-Stationen, Aufgaben und Nachweise vorzuschlagen. Du behältst die redaktionelle Kontrolle.
            </p>
          </div>
        </div>
        {latestDesign && (
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            v{latestDesign.version} · {latestDesign.status}
          </span>
        )}
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">1. Rahmen festlegen</h3>
              <p className="mt-1 text-xs text-slate-500">Wie lang und umfangreich soll das Lernmodul werden?</p>
            </div>
            <span className="hidden text-xs text-slate-400 sm:block">Kann später angepasst werden</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Zeit für das Lernmodul
              <InfoTip>Die verfügbare Zeit beeinflusst den Umfang und die geschätzte Dauer der einzelnen Lernschritte.</InfoTip>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                <option value={10}>10–15 Minuten</option>
                <option value={25}>20–30 Minuten</option>
                <option value={45}>Ca. 45 Minuten</option>
                <option value={60}>60 Minuten oder mehr</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Wie viele Stationen soll der Lernplan haben?
              <InfoTip>Eine Station ist ein didaktischer Abschnitt – nicht zwingend ein einzelner Feed-Post. Sie kann einen oder mehrere Beiträge und Aufgaben bündeln. Die Zahl ist ein Vorschlag und lässt sich danach redaktionell anpassen.</InfoTip>
              <select value={stepCount} onChange={(e) => setStepCount(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                {[3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map((count) => <option key={count} value={count}>{count} Stationen</option>)}
              </select>
            </label>
          </div>
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">2. Lernweg auswählen</h3>
            <p className="mt-1 text-xs text-slate-500">Das verändert, wie DR1FT die Lernschritte aufbaut – nicht das Lernziel selbst.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {MODEL_OPTIONS.map((option) => {
              const selected = model === option.value;
              return (
                <button key={option.value} type="button" onClick={() => setModel(option.value)} aria-pressed={selected} className={"rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-violet-100 " + (selected ? "border-violet-400 bg-violet-50/70 ring-1 ring-violet-300" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{option.title}</span>
                    <span className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " + (selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 text-transparent")}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="mt-2 block text-xs font-medium text-violet-700">{option.short}</span>
                  <MiniFlow items={option.visual} />
                  <span className="mt-3 block text-xs leading-5 text-slate-600">{option.effect}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">So wirkt es auf die Feed-Konzeption</p>
            <MiniFlow items={selectedModel.visual} />
          </div>
          <div className="mt-3 flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <p className="text-xs leading-5 text-slate-600"><strong className="text-slate-800">Was das für deinen Lernplan bedeutet: </strong>{selectedModel.result}</p>
          </div>
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">3. Denk-Anforderung auswählen</h3>
            <p className="mt-1 text-xs text-slate-500">Was sollen Lernende mit dem Thema tun können? Das legt den kognitiven Anspruch fest.</p>
          </div>
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bloom: vom einfachen zum komplexen Denken</p>
            <div className="flex items-end gap-1.5" aria-label="Bloom-Taxonomie: Verstehen, Anwenden, Analysieren, Bewerten, Eigenes entwickeln">
              {[{ label: "Verstehen", height: "h-7" }, { label: "Anwenden", height: "h-9" }, { label: "Analysieren", height: "h-11" }, { label: "Bewerten", height: "h-12" }, { label: "Entwickeln", height: "h-14" }].map((level) => <div key={level.label} className={"min-w-0 flex-1 rounded-t-lg border border-violet-200 bg-gradient-to-t from-violet-100 to-fuchsia-50 " + level.height} aria-label={level.label} title={level.label} />)}
            </div>
            <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[9px] font-medium leading-3 text-slate-600">{["Verstehen", "Anwenden", "Analysieren", "Bewerten", "Entwickeln"].map((label) => <span key={label} className="min-w-0 break-words">{label}</span>)}</div>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">Je höher die Anforderung, desto mehr soll der Feed zu begründetem Urteilen oder eigenem Gestalten anregen – nicht nur Informationen zeigen.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {BLOOM_OPTIONS.map((option, index) => {
              const selected = bloom === option.value;
              return (
                <button key={option.value} type="button" onClick={() => setBloom(option.value)} aria-pressed={selected} className={"rounded-xl border p-3 text-left transition focus:outline-none focus:ring-4 focus:ring-violet-100 " + (selected ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                  <span className="flex items-center gap-2">
                    <span className={"flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold " + (selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500")}>{index + 1}</span>
                    <span className="text-sm font-semibold text-slate-900">{option.title}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{option.prompt}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold text-slate-800">Beispiel für die gewählte Anforderung: {selectedBloom.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{selectedBloom.effect} DR1FT soll Aufgaben und erwartete Nachweise auf dieses Niveau ausrichten. Die Redaktion prüft, ob das zur Altersgruppe und zum Lernziel passt.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">Deine Auswahl im Überblick</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SummaryItem label="Umfang" value={duration === 10 ? "10–15 Minuten" : duration === 25 ? "20–30 Minuten" : duration === 45 ? "Ca. 45 Minuten" : "60+ Minuten"} />
            <SummaryItem label="Lernweg" value={selectedModel.title} />
            <SummaryItem label="Denk-Anforderung" value={selectedBloom.title} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Beim Erzeugen erstellt DR1FT einen neuen Lernplan-Entwurf mit Lernzielen, Lernschritten, Missionen, Content-Plan und pädagogischen Hinweisen. Die Auswahl ist eine Planungsgrundlage, keine automatische Qualitätsfreigabe.</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-slate-500">
            <p className="font-semibold text-slate-800">Du behältst die Kontrolle.</p>
            <p>Der bestehende Entwurf bleibt erhalten; eine neue Generierung legt eine neue Version an.</p>
          </div>
          <button type="button" disabled={busy} onClick={createDesign} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-50">
            <Sparkles className="h-4 w-4" />
            {busy ? "Lernplan wird erstellt …" : "Lernplan erstellen"}
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><ImageIcon className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Content aus einem Lernplan erzeugen</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{latestDesign ? "Erzeugt passende Content-Entwürfe auf Basis der gespeicherten Lernplan-Version." : "Erst einen Lernplan erstellen. Danach kannst du passende Content-Entwürfe daraus ableiten."}</p>
            </div>
          </div>
          <button type="button" disabled={busy || !latestDesign} onClick={createContent} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ImageIcon className="h-4 w-4" /> Content erzeugen
          </button>
        </div>

        {message && <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-5 text-slate-700">{message}</div>}

        {latestDesign?.pedagogical_warnings && Array.isArray(latestDesign.pedagogical_warnings) && latestDesign.pedagogical_warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-900">Pädagogische Hinweise zum aktuellen Entwurf</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {latestDesign.pedagogical_warnings.map((warning, index) => <li key={index}>{String(warning)}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
  </div>;
}
