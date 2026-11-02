"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type Step = {
  title: string;
  description: string;
  complete: boolean;
};

const SECTION_IDS = [
  "workflow-basics",
  "workflow-plan",
  "workflow-cards",
  "workflow-posts",
  "workflow-review",
];

export function ScenarioWizard({
  steps,
  children,
}: {
  steps: Step[];
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const completed = steps.filter((step) => step.complete).length;

  function goToStep(index: number) {
    const next = Math.max(0, Math.min(steps.length - 1, index));
    setCurrent(next);
    const target = document.getElementById(SECTION_IDS[next]);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="w-full space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">DR1FT · Szenario-Studio</p>
            <h2 className="mt-0.5 truncate text-base font-semibold tracking-tight text-slate-900">Szenario einrichten</h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold tabular-nums text-slate-700">{completed}/{steps.length} Bereiche</p>
            <p className="text-[10px] text-slate-400">vollständig</p>
          </div>
        </div>

        <nav aria-label="Szenario-Bereiche" className="mt-3 flex gap-1 overflow-x-auto border-t border-slate-100 pt-2">
          {steps.map((step, index) => {
            const selected = index === current;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => goToStep(index)}
                aria-current={selected ? "step" : undefined}
                className={
                  "inline-flex min-w-0 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition " +
                  (selected
                    ? "bg-violet-50 text-violet-800"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800")
                }
              >
                <span
                  className={
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] " +
                    (step.complete
                      ? "bg-emerald-100 text-emerald-700"
                      : selected
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-500")
                  }
                >
                  {step.complete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="truncate">{step.title}</span>
              </button>
            );
          })}
        </nav>
      </section>

      <div className="min-h-[320px] w-full">{children}</div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 py-3">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => goToStep(current - 1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Zurück
        </button>
        {current < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => goToStep(current + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95"
          >
            Weiter <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </footer>
    </div>
  );
}
