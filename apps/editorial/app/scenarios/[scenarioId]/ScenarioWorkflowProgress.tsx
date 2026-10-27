"use client";

import { Check, Circle, FileText, Flag, Layers3, ListChecks } from "lucide-react";

type WorkflowStep = {
  number: number;
  title: string;
  description: string;
  href: string;
  complete: boolean;
  currentHint: string;
};

export function ScenarioWorkflowProgress({
  hasLearningDesign,
  learningStepCount,
  postCount,
  missionCount,
  isActive,
}: {
  hasLearningDesign: boolean;
  learningStepCount: number;
  postCount: number;
  missionCount: number;
  isActive: boolean;
}) {
  const steps: WorkflowStep[] = [
    {
      number: 1,
      title: "Thema & Ziel",
      description: "Szenario-Grundlage",
      href: "#workflow-basics",
      complete: true,
      currentHint: "Thema ist angelegt",
    },
    {
      number: 2,
      title: "Lernplan",
      description: "Lernziel und Lernschritte",
      href: "#workflow-plan",
      complete: hasLearningDesign && learningStepCount > 0,
      currentHint: hasLearningDesign ? "Lernplan ist angelegt" : "Lernplan erstellen",
    },
    {
      number: 3,
      title: "Posts erstellen",
      description: "Spielbare Inhalte",
      href: "#workflow-posts",
      complete: postCount > 0 && missionCount > 0,
      currentHint: postCount > 0 ? `${postCount} Post(s) vorhanden` : "Mindestens einen Post erstellen",
    },
    {
      number: 4,
      title: "Prüfen & freigeben",
      description: "Letzter Check",
      href: "#workflow-review",
      complete: isActive,
      currentHint: isActive ? "Szenario ist aktiv" : "Vor Veröffentlichung prüfen",
    },
  ];

  const completedCount = steps.filter((step) => step.complete).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <section aria-label="Erstellungsfortschritt" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Dein Arbeitsablauf</div>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Schritt für Schritt zur Post-Mission</h2>
          <p className="mt-1 text-xs text-slate-500">Du kannst jederzeit zu einem Schritt zurückkehren. Deine vorhandenen Inhalte bleiben erhalten.</p>
        </div>
        <div className="min-w-[150px] sm:text-right">
          <div className="text-xs font-semibold text-slate-700">{completedCount} von 4 Schritten erledigt</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <nav aria-label="Schritte der Missionserstellung" className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <a
            key={step.number}
            href={step.href}
            className={`group flex min-w-0 items-start gap-3 rounded-xl border p-3 transition hover:border-accent/50 hover:bg-accent/5 ${step.complete ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}
          >
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${step.complete ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-accent/10 group-hover:text-accent"}`}>
              {step.complete ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{step.number}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">{step.description}</span>
              <span className={`mt-2 block text-[11px] font-medium ${step.complete ? "text-emerald-700" : "text-slate-500"}`}>{step.currentHint}</span>
            </span>
          </a>
        ))}
      </nav>
      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        Der Fortschritt wird aus den vorhandenen Szenario-Daten abgeleitet. Es werden keine zusätzlichen Daten gespeichert.
      </p>
    </section>
  );
}
