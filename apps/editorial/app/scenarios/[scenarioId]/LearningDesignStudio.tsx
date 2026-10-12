"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Image as ImageIcon, Info, RefreshCw, Sparkles } from "lucide-react";

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

export function LearningDesignStudio({ scenarioId, latestDesign }: Props) {
  const [duration, setDuration] = useState(25);
  const [stepCount, setStepCount] = useState(7);
  const [model, setModel] = useState<"backward_design" | "constructive_alignment" | "kolb">("backward_design");
  const [bloom, setBloom] = useState<"remember" | "understand" | "apply" | "analyze" | "evaluate" | "create">("evaluate");
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function InfoTip({ children }: { children: React.ReactNode }) {
    return (
      <span className="group relative inline-flex ml-1 align-middle">
        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" aria-label="Mehr erfahren" />
        <span className="pointer-events-none absolute z-20 left-1/2 top-full mt-2 hidden w-72 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] leading-4 text-white shadow-xl group-hover:block group-focus-within:block">
          {children}
        </span>
      </span>
    );
  }

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
        setMessage(result.stepCount + " Lernschritte als Draft erzeugt.");
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
        setMessage(result.created + " Content-Elemente als Draft erzeugt.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Content-Generierung fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pädagogisches Design</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Erst Lernziel und Evidenz, dann Lernschritte, Missionen und Content. Alles bleibt redaktioneller Draft.
            </p>
          </div>
        </div>
        {latestDesign && (
          <span className="text-[11px] rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">
            v{latestDesign.version} · {latestDesign.status}
          </span>
        )}
      </div>

      <div className="mt-5 grid md:grid-cols-4 gap-3">
        <label className="text-xs text-slate-600 font-medium">
          Zeit für das Lernmodul
          <InfoTip>Wie viel Zeit steht ungefähr zur Verfügung? Die KI nutzt diese Zeit, um Umfang und Anzahl der Lernschritte sinnvoll zu planen.</InfoTip>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700">
            <option value={10}>10–15 Minuten</option>
            <option value={25}>20–30 Minuten</option>
            <option value={45}>ca. 45 Minuten</option>
            <option value={60}>60 Minuten oder mehr</option>
          </select>
        </label>

        <label className="text-xs text-slate-600 font-medium">
          Lernschritte
          <InfoTip>Wie viele Stationen soll das Modul ungefähr haben? Das ist nur eine Orientierung für die KI. Die Redaktion kann die Schritte anschließend verändern.</InfoTip>
          <input value={stepCount} onChange={(e) => setStepCount(Number(e.target.value))} type="number" min={3} max={16} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" />
        </label>

        <label className="text-xs text-slate-600 font-medium">
          Lernansatz
          <InfoTip>Hier legst du fest, worauf die Planung besonders achten soll. Die pädagogischen Prinzipien werden automatisch in den Lernplan übersetzt.</InfoTip>
          <select value={model} onChange={(e) => setModel(e.target.value as typeof model)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700">
            <option value="backward_design">Vom Lernziel aus planen</option>
            <option value="constructive_alignment">Lernziel, Aufgabe und Nachweis verbinden</option>
            <option value="kolb">Lernen durch Erfahrung</option>
          </select>
          <div className="mt-1 text-[10px] text-slate-400">
            {model === "backward_design" && "Backward Design"}
            {model === "constructive_alignment" && "Constructive Alignment"}
            {model === "kolb" && "Kolb · Erfahrungslernen"}
          </div>
        </label>

        <label className="text-xs text-slate-600 font-medium">
          Kognitive Anforderung
          <InfoTip>Wie anspruchsvoll soll das Denken sein? Bloom beschreibt die kognitive Anforderung von einfachem Erinnern bis zum eigenständigen Erschaffen.</InfoTip>
          <select value={bloom} onChange={(e) => setBloom(e.target.value as typeof bloom)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700">
            <option value="understand">Verstehen · Zusammenhänge erklären</option>
            <option value="apply">Anwenden · Wissen einsetzen</option>
            <option value="analyze">Analysieren · Zusammenhänge untersuchen</option>
            <option value="evaluate">Bewerten · begründet entscheiden</option>
            <option value="create">Erschaffen · etwas Eigenes entwickeln</option>
          </select>
          <div className="mt-1 text-[10px] text-slate-400">Bloom · kognitive Anforderung</div>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={createDesign} className="inline-flex items-center gap-2 rounded-xl bg-accent text-white px-4 py-2.5 text-xs font-semibold disabled:opacity-50">
          <Sparkles className="w-3.5 h-3.5" />
          {busy ? "Learning Design wird erzeugt …" : "Learning Design erzeugen"}
        </button>

        <button type="button" disabled={busy || !latestDesign} onClick={createContent} className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 text-accent px-4 py-2.5 text-xs font-semibold disabled:opacity-40">
          <ImageIcon className="w-3.5 h-3.5" />
          Content aus Lernplan erzeugen
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </div>
      )}

      {latestDesign?.pedagogical_warnings && Array.isArray(latestDesign.pedagogical_warnings) && latestDesign.pedagogical_warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800">Pädagogische Hinweise</div>
          <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">
            {latestDesign.pedagogical_warnings.map((warning, index) => <li key={index}>{String(warning)}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Was DR1FT dabei automatisch beachtet</div>
        <div className="mt-2 grid sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" /><span><strong>Lernziel → Nachweis</strong><br /><span className="text-slate-400">Es wird geprüft, woran Lernen erkennbar ist.</span></span></div>
          <div className="flex items-start gap-2 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" /><span><strong>Lernschritt → Mission</strong><br /><span className="text-slate-400">Aufgaben passen zum jeweiligen Lernziel.</span></span></div>
          <div className="flex items-start gap-2 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" /><span><strong>Content → Funktion</strong><br /><span className="text-slate-400">Inhalte werden nicht nur zur Dekoration erzeugt.</span></span></div>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3" />
        Bilder werden mit Prompt und Generationshistorie gespeichert und können bei redaktioneller Ablehnung neu erzeugt werden.
      </div>
    </section>
  );
}
