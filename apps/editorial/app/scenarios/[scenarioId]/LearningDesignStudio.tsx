"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Image as ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import { generateLearningDesign } from "./learning-design-actions";
import { generateLearningContent, regenerateLearningImage, rejectLearningImage } from "./learning-content-actions";

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

  function createDesign() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await generateLearningDesign(scenarioId, {
          durationMinutes: duration,
          learningStepCount: stepCount,
          primaryLearningModel: model,
          bloomTarget: bloom,
        });
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
        const result = await generateLearningContent(scenarioId, latestDesign?.id);
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
        <label className="text-xs text-slate-500">
          Zieldauer
          <div className="flex items-center gap-2 mt-1">
            <input value={duration} onChange={(e) => setDuration(Number(e.target.value))} type="number" min={5} max={120} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <span>Min.</span>
          </div>
        </label>

        <label className="text-xs text-slate-500">
          Lernschritte
          <input value={stepCount} onChange={(e) => setStepCount(Number(e.target.value))} type="number" min={3} max={16} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>

        <label className="text-xs text-slate-500">
          Lernmodell
          <select value={model} onChange={(e) => setModel(e.target.value as typeof model)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="backward_design">Backward Design</option>
            <option value="constructive_alignment">Constructive Alignment</option>
            <option value="kolb">Kolb / Erfahrungslernen</option>
          </select>
        </label>

        <label className="text-xs text-slate-500">
          Bloom-Ziel
          <select value={bloom} onChange={(e) => setBloom(e.target.value as typeof bloom)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="understand">Verstehen</option>
            <option value="apply">Anwenden</option>
            <option value="analyze">Analysieren</option>
            <option value="evaluate">Bewerten</option>
            <option value="create">Erzeugen</option>
          </select>
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

      <div className="mt-5 pt-4 border-t border-slate-100 grid sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Lernziel → Evidenz</div>
        <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Lernschritt → Mission</div>
        <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Content → pädagogische Funktion</div>
      </div>

      <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3" />
        Bilder werden mit Prompt und Generationshistorie gespeichert und können bei redaktioneller Ablehnung neu erzeugt werden.
      </div>
    </section>
  );
}
