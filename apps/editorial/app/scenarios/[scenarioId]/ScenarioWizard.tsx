"use client";

import { Children, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type Step = {
  title: string;
  description: string;
  complete: boolean;
};

export function ScenarioWizard({
  steps,
  children,
}: {
  steps: Step[];
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const panels = Children.toArray(children);
  const active = steps[current];
  const completed = steps.filter((step) => step.complete).length;
  const progress = Math.round(((current + 1) / steps.length) * 100);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <section className="sticky top-2 z-30 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-md sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">DR1FT · Szenario-Studio</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">Szenario einrichten</h2>
            <p className="mt-1 text-xs text-slate-500">Schritt {current + 1} von {steps.length} · {completed} bereits erledigt</p>
          </div>
          <div className="sm:w-44">
            <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-slate-500">
              <span>Dein Fortschritt</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: progress + "%" }} />
            </div>
          </div>
        </div>

        <nav aria-label="Schritte der Szenario-Erstellung" className="mt-4 grid grid-cols-4 gap-1 sm:mt-5 sm:gap-3">
          {steps.map((step, index) => {
            const selected = index === current;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => setCurrent(index)}
                aria-current={selected ? "step" : undefined}
                className={"group min-w-0 rounded-xl border p-2 text-left transition sm:flex sm:items-center sm:gap-2.5 sm:p-3 " +
                  (selected
                    ? "border-accent bg-accent text-white shadow-md shadow-accent/15"
                    : step.complete
                      ? "border-emerald-200 bg-emerald-50/70 text-slate-800 hover:border-emerald-400"
                      : "border-slate-200 bg-white text-slate-600 hover:border-accent/50 hover:bg-accent/5")}
              >
                <span className={"mx-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold sm:mx-0 " +
                  (selected ? "bg-white/15 text-white" : step.complete ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-accent/10 group-hover:text-accent")}>
                  {step.complete && !selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="mt-1.5 block min-w-0 sm:mt-0">
                  <span className={"block truncate text-[10px] font-bold sm:text-xs " + (selected ? "text-white" : "text-slate-900")}>{step.title}</span>
                  <span className={"mt-0.5 hidden truncate text-[10px] sm:block " + (selected ? "text-white/75" : "text-slate-500")}>{step.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </section>

      <div className="min-h-[320px]">
        <div key={current} className="animate-in fade-in slide-in-from-right-2 duration-200">
          {panels[current]}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => { setCurrent((value) => Math.max(0, value - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 sm:px-4"
        >
          <ArrowLeft className="h-4 w-4" /> <span>Zurück</span>
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-900">{active.title}</p>
          <p className="hidden text-[10px] text-slate-500 sm:block">Deine Änderungen bleiben erhalten</p>
        </div>
        {current < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => { setCurrent((value) => Math.min(steps.length - 1, value + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 sm:px-4"
          >
            <span>Weiter</span> <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800"><Check className="h-4 w-4" /> Abschluss</span>
        )}
      </footer>
    </div>
  );
}
