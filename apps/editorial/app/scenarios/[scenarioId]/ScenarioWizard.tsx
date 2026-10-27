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
    <div className="w-full space-y-5">
      <section className="relative z-10 overflow-hidden rounded-[28px] border border-[#d8d2ff] bg-[#0b1024] p-4 text-white shadow-[0_18px_50px_rgba(67,56,202,0.16)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#bcb2ff]"><span className="h-1.5 w-1.5 rounded-full bg-[#7cf7d4] shadow-[0_0_10px_#7cf7d4]" /> DR1FT · Szenario-Studio</p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">Szenario einrichten</h2>
            <p className="mt-1 text-xs text-slate-300">Schritt {current + 1} von {steps.length} · {completed} bereits erledigt</p>
          </div>
          <div className="sm:w-44">
            <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-slate-300">
              <span>Dein Fortschritt</span><span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#7cf7d4] shadow-[0_0_12px_rgba(124,247,212,0.4)] transition-all duration-500" style={{ width: progress + "%" }} />
            </div>
          </div>
        </div>

        <nav aria-label="Schritte der Szenario-Erstellung" className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 sm:gap-3">
          {steps.map((step, index) => {
            const selected = index === current;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => setCurrent(index)}
                aria-current={selected ? "step" : undefined}
                className={"group min-w-0 rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:flex sm:items-center sm:gap-2.5 sm:p-3 " +
                  (selected
                    ? "border-[#8b7bff] bg-gradient-to-br from-[#6545ed] via-[#5838d9] to-[#39269d] text-white shadow-[0_8px_24px_rgba(104,69,237,0.3)]"
                    : step.complete
                      ? "border-[#7cf7d4]/30 bg-[#7cf7d4]/[0.08] text-white hover:border-[#7cf7d4]/60"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-violet-300/50 hover:bg-white/[0.08]")}
              >
                <span className={"mx-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold sm:mx-0 " +
                  (selected ? "bg-white/15 text-white ring-1 ring-white/20" : step.complete ? "bg-[#7cf7d4] text-[#10172c]" : "bg-white/10 text-slate-300 group-hover:bg-violet-400/20 group-hover:text-white")}>
                  {step.complete && !selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="mt-1.5 block min-w-0 sm:mt-0">
                  <span className={"block truncate text-[10px] font-bold sm:text-xs " + (selected ? "text-white" : step.complete ? "text-white" : "text-slate-100")}>{step.title}</span>
                  <span className={"mt-0.5 hidden truncate text-[10px] sm:block " + (selected ? "text-white/75" : "text-slate-400")}>{step.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </section>

      <div className="min-h-[320px] w-full">
        <div key={current} className="animate-in fade-in slide-in-from-right-2 duration-200">
          {panels[current]}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-white via-violet-50/70 to-cyan-50/60 p-3 shadow-md shadow-violet-900/5 sm:p-4">
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
