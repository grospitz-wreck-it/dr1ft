"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarClock, Check, Image as ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toggleScenarioAssignment } from "../actions";
import { ScenarioToggle } from "./ScenarioToggle";
import { TeacherModuleBuilderModal } from "./TeacherModuleBuilderModal";
import { archiveTeacherModuleAssignment, assignExistingTeacherModule, setTeacherModuleAssignmentActive, updateTeacherModuleSchedule } from "./teacherModuleActions";

type Scenario = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  age_rating: string;
};

type TeacherModule = { id: string; module_id: string; school_id: string; assigned_by: string; is_active: boolean; title: string; description: string | null; introTitle?: string | null; introText?: string | null; cover_image_url: string | null; scheduled_start_at: string | null; scheduled_end_at: string | null; posts: Array<{ id: string; postType: "text" | "image" | "embed" | "mixed"; title: string; body: string; embedUrl: string; imageUrl: string | null }> };

type Assignment = {
  scenario_id: string;
  is_active: boolean;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  show_reports_at_end: boolean;
  title: string | null;
};

export function ClassModuleLibrary({
  classId,
  schoolId,
  teacherModules,
  availableTeacherModules,
  scenarios,
  assignments,
  moduleStatus,
  moduleReport,
}: {
  classId: string;
  schoolId: string | null;
  teacherModules: TeacherModule[];
  availableTeacherModules: Array<{ id: string; module_id: string; title: string; description: string; visibility_scope: "private" | "school" | "class"; posts: TeacherModule["posts"] }>;
  scenarios: Scenario[];
  assignments: Assignment[];
  moduleStatus: "Abgeschlossen" | "In Bearbeitung" | "Noch nicht begonnen";
  moduleReport: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [libraryTab, setLibraryTab] = useState<"dr1ft" | "own">("dr1ft");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const assignedIds = new Set(assignments.map((item) => item.scenario_id));
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
        <div className="flex flex-wrap items-center gap-2">
          {schoolId && <TeacherModuleBuilderModal classInstanceId={classId} schoolId={schoolId} />}
          <button type="button" onClick={() => { setOpen(true); setError(""); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2">
            <Plus className="h-4 w-4" /> Modul wählen
          </button>
        </div>
      </div>

      <div className="bg-slate-50/60 p-3 sm:p-4">
        {teacherModules.length > 0 && (
          <div className="mb-3 space-y-2">
            {teacherModules.map((module) => (
              <TeacherModuleCard key={module.id} classId={classId} schoolId={schoolId ?? ""} module={module} onError={setError} />
            ))}
          </div>
        )}
        {assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const scenario = scenarios.find((item) => item.id === assignment.scenario_id);
              if (!scenario) return null;
              return (
                <ScenarioToggle
                  key={assignment.scenario_id}
                  classId={classId}
                  scenarioId={scenario.id}
                  title={scenario.title}
                  description={scenario.description ?? ""}
                  coverImageUrl={scenario.cover_image_url}
                  ageRating={scenario.age_rating}
                  initiallyAssigned
                  initiallyActive={assignment.is_active}
                  moduleStatus={moduleStatus}
                  moduleReport={moduleReport}
                  scheduledStartAt={assignment.scheduled_start_at}
                  scheduledEndAt={assignment.scheduled_end_at}
                  showReportsAtEnd={assignment.show_reports_at_end}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-white px-5 py-7 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><BookOpen className="h-5 w-5" /></span>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Noch keine Module ausgewählt</h3>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Stelle deiner Klasse mehrere passende Lernmodule bereit. Lernfortschritte bleiben auch beim Archivieren erhalten.</p>
            <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"><Plus className="h-3.5 w-3.5" />Module auswählen</button>
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
                <p className="mt-1 text-sm text-slate-500">Du kannst mehrere Module parallel abonnieren. Bereits gespeicherte Lernfortschritte bleiben erhalten.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-100 px-5 py-3 sm:px-7">
              <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1">
                <button type="button" onClick={() => setLibraryTab("dr1ft")} className={"rounded-lg px-3 py-2 text-xs font-semibold " + (libraryTab === "dr1ft" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500")}>DR1FT-Szenarien</button>
                <button type="button" onClick={() => setLibraryTab("own")} className={"rounded-lg px-3 py-2 text-xs font-semibold " + (libraryTab === "own" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500")}>Eigene Szenarien</button>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Module suchen …" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {libraryTab === "dr1ft" ? <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((scenario) => {
                  const isActive = assignedIds.has(scenario.id);
                  return (
                    <article key={scenario.id} className={"overflow-hidden rounded-2xl border bg-white transition " + (isActive ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-200")}>
                      <div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-violet-100 to-cyan-100">
                        {scenario.cover_image_url ? <img src={scenario.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-violet-300"><BookOpen className="h-8 w-8" /></div>}
                        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">{scenario.age_rating}</span>
                        {isActive && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white"><Check className="h-3 w-3" />Bereits abonniert</span>}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-bold text-slate-900">{scenario.title}</h3>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{scenario.description || "Für dieses Modul liegt noch keine Kurzbeschreibung vor."}</p>
                        <button type="button" onClick={() => subscribe(scenario.id)} disabled={pending || isActive} className={"mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 " + (isActive ? "border border-violet-200 bg-violet-50 text-violet-700" : "bg-violet-600 text-white hover:bg-violet-700")}>
                          {pendingId === scenario.id ? "Wird hinzugefügt …" : isActive ? <><Check className="h-3.5 w-3.5" />Bereits abonniert</> : <><Plus className="h-3.5 w-3.5" />Modul abonnieren</>}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div> : <div className="space-y-3">
                {availableTeacherModules.filter((module) => {
                  const needle = query.trim().toLocaleLowerCase("de");
                  return (!needle || (module.title + " " + module.description).toLocaleLowerCase("de").includes(needle)) && !teacherModules.some((assigned) => assigned.module_id === module.id);
                }).map((module) => (
                  <article key={module.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Eigenes Szenario</p><h3 className="mt-1 text-sm font-bold text-slate-900">{module.title}</h3><p className="mt-1 text-xs text-slate-600">{module.description}</p></div>
                    <button type="button" disabled={pending} onClick={() => { setPendingId(module.id); startTransition(async () => { try { await assignExistingTeacherModule(classId, module.id); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Zuweisung fehlgeschlagen."); } finally { setPendingId(null); } }); }} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white">{pendingId === module.id ? "…" : "Aktivieren"}</button>
                  </article>
                ))}
                {availableTeacherModules.length === 0 && <p className="py-12 text-center text-sm text-slate-500">Keine eigenen Szenarien verfügbar.</p>}
              </div>}
              {libraryTab === "dr1ft" && filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-500">Keine passenden Module gefunden.</p>}
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


function TeacherModuleCard({ classId, schoolId, module, onError }: {
  classId: string;
  schoolId: string;
  module: TeacherModule;
  onError: (message: string) => void;
}) {
  const [active, setActive] = useState(module.is_active);
  const [pending, startTransition] = useTransition();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [startAt, setStartAt] = useState(module.scheduled_start_at ? new Date(module.scheduled_start_at).toISOString().slice(0,16) : "");
  const [endAt, setEndAt] = useState(module.scheduled_end_at ? new Date(module.scheduled_end_at).toISOString().slice(0,16) : "");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const router = useRouter();

  function saveSchedule() {
    setScheduleMessage("");
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) { setScheduleMessage("Das Ende muss nach dem Start liegen."); return; }
    startTransition(async () => {
      try {
        await updateTeacherModuleSchedule(classId, module.id, startAt ? new Date(startAt).toISOString() : null, endAt ? new Date(endAt).toISOString() : null);
        setScheduleMessage("Zeitplan gespeichert.");
        router.refresh();
      } catch (cause) { setScheduleMessage(cause instanceof Error ? cause.message : "Zeitplan konnte nicht gespeichert werden."); }
    });
  }

  function setStatus(next: boolean) {
    if (pending || next === active) return;
    setActive(next);
    startTransition(async () => {
      try {
        await setTeacherModuleAssignmentActive(classId, module.id, next);
        router.refresh();
      } catch (cause) {
        setActive(!next);
        onError(cause instanceof Error ? cause.message : "Modulstatus konnte nicht geändert werden.");
      }
    });
  }

  function archive() {
    if (pending || !window.confirm("Dieses Modul aus der Klasse entfernen? Das veröffentlichte Modul und die Inhalte bleiben erhalten.")) return;
    startTransition(async () => {
      try {
        await archiveTeacherModuleAssignment(classId, module.id);
        router.refresh();
      } catch (cause) {
        onError(cause instanceof Error ? cause.message : "Modul konnte nicht entfernt werden.");
      }
    });
  }

  return (
    <article className={"overflow-hidden rounded-xl border bg-white transition-colors " + (active ? "border-violet-300 bg-violet-50/30" : "border-slate-200 bg-slate-50/50 hover:border-slate-300")}>
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-[76px] w-[112px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-violet-100 to-sky-100 sm:h-[88px] sm:w-[132px]">
          {module.cover_image_url ? <img src={module.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-violet-300"><ImageIcon className="h-6 w-6" /></div>}
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">Eigenes Modul</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-slate-900">{module.title}</h3>
            {active ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700"><Check className="h-3 w-3" />Aktiv</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Inaktiv</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-600">{module.description?.trim() || "Für dieses Modul liegt noch keine Kurzbeschreibung vor."}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5">

          <button type="button" role="switch" aria-checked={active} aria-label={active ? module.title + " deaktivieren" : module.title + " aktivieren"} onClick={() => setStatus(!active)} disabled={pending} className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 " + (active ? "bg-violet-600" : "bg-slate-300")}>
            <span className={"inline-block h-4 w-4 rounded-full bg-white shadow transition-transform " + (active ? "translate-x-6" : "translate-x-1")} />
          </button>
          <span className="text-[9px] text-slate-400">{pending ? "…" : active ? "Aktiv" : "Inaktiv"}</span>
          <button type="button" onClick={archive} disabled={pending} aria-label="Modul aus Klasse entfernen" title="Modul aus dieser Klasse entfernen" className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 bg-white/65 text-slate-500 shadow-[0_4px_14px_rgba(30,41,59,.10)] backdrop-blur-xl transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-violet-100 px-3 py-2 sm:px-4">
        <button type="button" onClick={() => setScheduleOpen(value => !value)} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-700 hover:text-violet-900"><CalendarClock className="h-3.5 w-3.5" />{scheduleOpen ? "Zeitplan schließen" : (module.scheduled_start_at || module.scheduled_end_at) ? "Zeitplan bearbeiten" : "Zeitplan festlegen"}</button>
        <TeacherModuleBuilderModal classInstanceId={classId} schoolId={schoolId} editModule={{ id: module.module_id, title: module.title, description: module.description ?? "", introTitle: module.introTitle, introText: module.introText, posts: module.posts }} triggerLabel="Bearbeiten" />
        {(module.scheduled_start_at || module.scheduled_end_at) && !scheduleOpen && <p className="mt-1 text-[10px] text-slate-500">{module.scheduled_start_at ? new Date(module.scheduled_start_at).toLocaleString("de-DE") : "Sofort"}{module.scheduled_end_at ? " – " + new Date(module.scheduled_end_at).toLocaleString("de-DE") : ""}</p>}
        {scheduleOpen && <div className="mt-3 rounded-lg bg-violet-50/70 p-3">
          <p className="text-xs text-slate-600">Lege fest, wann das Modul für diese Klasse verfügbar ist. Ohne Zeitangabe bleibt es dauerhaft verfügbar.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">Live ab<input type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} disabled={pending} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"/></label>
            <label className="block text-xs font-medium text-slate-700">Live bis<input type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)} disabled={pending} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"/></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={saveSchedule} disabled={pending} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Speichert …" : "Zeitplan speichern"}</button>{scheduleMessage && <p role="status" className="text-xs text-slate-600">{scheduleMessage}</p>}</div>
        </div>}
      </div>
    </article>
  );
}
