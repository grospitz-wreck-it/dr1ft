"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Plus, Search, X } from "lucide-react";
import { toggleScenarioAssignment } from "../actions";
import { ScenarioToggle } from "./ScenarioToggle";

type Scenario = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  age_rating: string;
};

type Assignment = {
  scenario_id: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  show_reports_at_end: boolean;
  title: string | null;
};

export function ClassModuleLibrary({
  classId,
  scenarios,
  assignment,
  moduleStatus,
  moduleReport,
}: {
  classId: string;
  scenarios: Scenario[];
  assignment: Assignment | null;
  moduleStatus: "Abgeschlossen" | "In Bearbeitung" | "Noch nicht begonnen";
  moduleReport: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const activeScenario = assignment
    ? scenarios.find((scenario) => scenario.id === assignment.scenario_id) ?? null
    : null;
  const filtered = scenarios.filter((scenario) => {
    const needle = query.trim().toLocaleLowerCase("de");
    return !needle || (scenario.title + " " + (scenario.description ?? "")).toLocaleLowerCase("de").includes(needle);
  });

  function subscribe(scenarioId: string) {
    if (pending) return;
    setError("");
    setPendingId(scenarioId);
    startTransition(async () => {
      try {
        await toggleScenarioAssignment(classId, scenarioId, true, "compact");
        setOpen(false);
        setQuery("");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Das Modul konnte nicht hinzugefügt werden.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Lerninhalt</p>
          <h2 className="mt-1.5 text-lg font-semibold text-slate-950">Modul für diese Klasse</h2>
          <p className="mt-1 text-sm text-slate-500">Wähle ein Lernmodul aus der DR1FT-Bibliothek. Lernfortschritte bleiben auch beim Wechsel erhalten.</p>
        </div>
        <button type="button" onClick={() => { setOpen(true); setError(""); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2">
          <Plus className="h-4 w-4" /> Modul wählen
        </button>
      </div>

      <div className="bg-slate-50/60 p-3 sm:p-4">
        {activeScenario && assignment ? (
          <ScenarioToggle
            classId={classId}
            scenarioId={activeScenario.id}
            title={activeScenario.title}
            description={activeScenario.description ?? ""}
            coverImageUrl={activeScenario.cover_image_url}
            ageRating={activeScenario.age_rating}
            initiallyAssigned
            moduleStatus={moduleStatus}
            moduleReport={moduleReport}
            scheduledStartAt={assignment.scheduled_start_at}
            scheduledEndAt={assignment.scheduled_end_at}
            showReportsAtEnd={assignment.show_reports_at_end}
          />
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-white px-5 py-7 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><BookOpen className="h-5 w-5" /></span>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Noch kein Modul ausgewählt</h3>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Stelle deiner Klasse ein passendes Lernmodul bereit. Du kannst jederzeit ein anderes Modul wählen.</p>
            <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"><Plus className="h-3.5 w-3.5" />Jetzt Modul auswählen</button>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="module-library-title">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">DR1FT · Lernbibliothek</p>
                <h2 id="module-library-title" className="mt-1 text-xl font-bold text-slate-950">Modul für deine Klasse wählen</h2>
                <p className="mt-1 text-sm text-slate-500">Ein Modul wird jeweils dieser Klasse zugewiesen. Beim Wechsel bleibt der bisherige Lernfortschritt erhalten.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-100 px-5 py-3 sm:px-7">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Module suchen …" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((scenario) => {
                  const isActive = assignment?.scenario_id === scenario.id;
                  return (
                    <article key={scenario.id} className={"overflow-hidden rounded-2xl border bg-white transition " + (isActive ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-200")}>
                      <div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-violet-100 to-cyan-100">
                        {scenario.cover_image_url ? <img src={scenario.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-violet-300"><BookOpen className="h-8 w-8" /></div>}
                        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">{scenario.age_rating}</span>
                        {isActive && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white"><Check className="h-3 w-3" />Aktuell zugewiesen</span>}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-bold text-slate-900">{scenario.title}</h3>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{scenario.description || "Für dieses Modul liegt noch keine Kurzbeschreibung vor."}</p>
                        <button type="button" onClick={() => subscribe(scenario.id)} disabled={pending || isActive} className={"mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 " + (isActive ? "border border-violet-200 bg-violet-50 text-violet-700" : "bg-violet-600 text-white hover:bg-violet-700")}>
                          {pendingId === scenario.id ? "Wird hinzugefügt …" : isActive ? <><Check className="h-3.5 w-3.5" />Bereits ausgewählt</> : <><Plus className="h-3.5 w-3.5" />Modul abonnieren</>}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-500">Keine passenden Module gefunden.</p>}
              {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
            </div>
            <div className="flex justify-end border-t border-slate-200 px-5 py-3 sm:px-7">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
