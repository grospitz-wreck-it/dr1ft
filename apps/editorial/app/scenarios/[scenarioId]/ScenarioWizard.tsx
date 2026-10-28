"use client";

import { useState, type ReactNode } from "react";
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
  const active = steps[current];
  const completed = steps.filter((step) => step.complete).length;
  const progress = Math.round((completed / Math.max(steps.length, 1)) * 100);

  return (
    <div className="w-full space-y-5">
      <section className="relative z-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> DR1FT · Szenario-Studio</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Szenario einrichten</h2>
            <p className="mt-1 text-xs text-slate-500">Schritt {current + 1} von {steps.length}</p>
          </div>
        </div>

        <nav aria-label="Schritte der Szenario-Erstellung" className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 sm:gap-3">
          {steps.map((step, index) => {
            const selected = index === current;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => {
                  setCurrent(index);
                  const targetIds = ["workflow-basics", "workflow-plan", "workflow-posts", "workflow-review"];
                  const target = document.getElementById(targetIds[index]);
                  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-current={selected ? "step" : undefined}
                className={"group min-w-0 rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:flex sm:items-center sm:gap-2.5 sm:p-3 " +
                  (selected
                    ? "border-violet-500 bg-violet-50 text-violet-900"
                    : step.complete
                      ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/40")}
              >
                <span className={"mx-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold sm:mx-0 " +
                  (selected ? "bg-violet-600 text-white" : step.complete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-800")}>
                  {step.complete && !selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="mt-1.5 block min-w-0 sm:mt-0">
                  <span className={"block truncate text-[10px] font-bold sm:text-xs " + (selected ? "text-violet-900" : "text-slate-800")}>{step.title}</span>
                  <span className={"mt-0.5 hidden truncate text-[10px] sm:block " + (selected ? "text-violet-700" : "text-slate-500")}>{step.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </section>

      <div className="min-h-[320px] w-full">
        {children}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-1 py-4 sm:p-4">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => {
            const next = Math.max(0, current - 1);
            setCurrent(next);
            const targetIds = ["workflow-basics", "workflow-posts", "workflow-plan", "workflow-review"];
            const target = document.getElementById(targetIds[next]);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
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
            onClick={() => {
              const next = Math.min(steps.length - 1, current + 1);
              setCurrent(next);
              const targetIds = ["workflow-basics", "workflow-posts", "workflow-plan", "workflow-review"];
              const target = document.getElementById(targetIds[next]);
              if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
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
