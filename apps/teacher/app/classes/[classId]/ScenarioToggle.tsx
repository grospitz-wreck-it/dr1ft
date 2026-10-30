"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, Check, Clock3, Sparkles } from "lucide-react";
import { toggleScenarioAssignment, updateScenarioPacing, updateScenarioSchedule } from "../actions";

type ModuleStatus = "Abgeschlossen" | "In Bearbeitung" | "Noch nicht begonnen" | "Nicht zugewiesen";

function datePart(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function timePart(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function ScenarioToggle({
  classId, scenarioId, title, description, coverImageUrl, ageRating, initiallyAssigned,
  initialPacingMode = "compact", moduleStatus, moduleReport,
  scheduledStartAt = null, scheduledEndAt = null, showReportsAtEnd = false,
}: {
  classId: string;
  scenarioId: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  ageRating: string;
  initiallyAssigned: boolean;
  initialPacingMode?: "compact" | "as_designed";
  moduleStatus?: ModuleStatus;
  moduleReport?: string;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  showReportsAtEnd?: boolean;
}) {
  const [selected, setSelected] = useState(initiallyAssigned);
  const [pacing, setPacing] = useState(initialPacingMode);
  const [startDate, setStartDate] = useState(datePart(scheduledStartAt));
  const [startTime, setStartTime] = useState(timePart(scheduledStartAt));
  const [endDate, setEndDate] = useState(datePart(scheduledEndAt));
  const [endTime, setEndTime] = useState(timePart(scheduledEndAt));
  const [releaseReports, setReleaseReports] = useState(showReportsAtEnd);
  const [pending, startTransition] = useTransition();
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    setSelected(initiallyAssigned);
    setPacing(initialPacingMode);
    setStartDate(datePart(scheduledStartAt));
    setStartTime(timePart(scheduledStartAt));
    setEndDate(datePart(scheduledEndAt));
    setEndTime(timePart(scheduledEndAt));
    setReleaseReports(showReportsAtEnd);
  }, [initiallyAssigned, initialPacingMode, scheduledStartAt, scheduledEndAt, showReportsAtEnd]);

  const status = moduleStatus ?? (initiallyAssigned ? "Noch nicht begonnen" : "Nicht zugewiesen");
  const now = Date.now();
  const startsAt = scheduledStartAt ? new Date(scheduledStartAt).getTime() : null;
  const endsAt = scheduledEndAt ? new Date(scheduledEndAt).getTime() : null;
  const hasSchedule = Boolean(scheduledStartAt || scheduledEndAt);
  const scheduleState = startsAt !== null && startsAt > now ? "Geplant" : endsAt !== null && endsAt <= now ? "Beendet" : "Live";
  const scheduleTone = scheduleState === "Live" ? "bg-emerald-50 text-emerald-700" : scheduleState === "Geplant" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600";

  function saveSchedule() {
    setScheduleMessage("");
    if ((startDate && !startTime) || (!startDate && startTime) || (endDate && !endTime) || (!endDate && endTime)) {
      setScheduleMessage("Bitte Datum und Uhrzeit jeweils vollständig angeben.");
      return;
    }
    const start = startDate && startTime ? new Date(`${startDate}T${startTime}`).toISOString() : null;
    const end = endDate && endTime ? new Date(`${endDate}T${endTime}`).toISOString() : null;
    if (start && end && new Date(end) <= new Date(start)) {
      setScheduleMessage("Das Ende muss nach dem Start liegen.");
      return;
    }
    if (releaseReports && !end) {
      setScheduleMessage("Für die Reporting-Freigabe ist eine Endzeit erforderlich.");
      return;
    }
    startTransition(async () => {
      try {
        await updateScenarioSchedule(classId, scenarioId, start, end, releaseReports);
        setScheduleMessage("Zeitplan gespeichert.");
      } catch (error) {
        setScheduleMessage(error instanceof Error ? error.message : "Zeitplan konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <li className={`group flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-200"}`}>
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-violet-100 via-indigo-100 to-sky-100">
        {coverImageUrl ? <img src={coverImageUrl} alt={`Teaserbild: ${title}`} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-violet-400"><Sparkles className="h-10 w-10" /></div>}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">{ageRating}</span>
          {hasSchedule && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${scheduleTone}`}><Clock3 className="h-3 w-3" />{scheduleState}</span>}
        </div>
        {selected && <span className="absolute right-3 top-3 rounded-full bg-violet-600 p-2 text-white shadow"><Check className="h-4 w-4" /></span>}
      </div>
      <div className="px-4 pb-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
              {title}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{selected ? status : "Nicht zugewiesen"}</span>
            </span>
            <span className="mt-1 block text-xs text-slate-500">{ageRating} · {selected ? "Aktives Modul" : "Nicht aktiv"}</span>
            <span className="mt-2 block line-clamp-3 text-sm leading-5 text-slate-600">{description?.trim() || "Für dieses Szenario liegt noch keine Kurzbeschreibung vor."}</span>
            {selected && moduleReport && <span className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">{moduleReport}</span>}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 md:shrink-0">
          {hasSchedule && <span title={scheduleState} className={`inline-flex items-center gap-1 text-[10px] font-semibold ${scheduleTone.replace("bg-emerald-50 ", "").replace("bg-violet-50 ", "").replace("bg-slate-100 ", "")}`}><Clock3 className="h-3 w-3" />{scheduleState}</span>}
          <button type="button" role="switch" aria-checked={selected} aria-label={selected ? title + " deaktivieren" : title + " aktivieren"} onClick={() => { const next = !selected; setSelected(next); startTransition(() => toggleScenarioAssignment(classId, scenarioId, next, pacing)); }} disabled={pending} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${selected ? "bg-violet-600" : "bg-slate-300"}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${selected ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {selected && <div className="flex items-center gap-2 md:shrink-0">
          <select value={pacing} disabled={pending} onChange={(e) => { const next = e.target.value as "compact" | "as_designed"; setPacing(next); startTransition(() => updateScenarioPacing(classId, scenarioId, next)); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"><option value="compact">Kompakt</option><option value="as_designed">Verteilt</option></select>
        </div>}
      </div>

      {selected && <div className="ml-0 rounded-xl border border-violet-100 bg-white p-4">
        <button type="button" onClick={() => setScheduleOpen((open) => !open)} className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-violet-700"><CalendarClock className="h-4 w-4" />{scheduleOpen ? "Zeitplan schließen" : "Zeitplan bearbeiten"}</button>
        {scheduleOpen && <>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Missions-Zeitplan</p>
        <p className="mt-1 text-xs text-slate-500">Leer lassen, um die Mission ohne Zeitbegrenzung verfügbar zu halten. Zeiten entsprechen deiner lokalen Zeitzone.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 text-xs font-medium text-slate-700">Live ab</legend>
            <input aria-label="Startdatum" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
            <input aria-label="Startuhrzeit" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 text-xs font-medium text-slate-700">Live bis</legend>
            <input aria-label="Enddatum" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
            <input aria-label="Enduhrzeit" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
          </fieldset>
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={releaseReports} onChange={(e) => setReleaseReports(e.target.checked)} disabled={pending} className="mt-0.5 accent-violet-600" />
          <span><span className="font-medium">Schüler-Reportings nach Ende freigeben</span><span className="mt-0.5 block text-xs text-slate-500">Die Auswertung wird erst nach der Endzeit im Lehrer-Dashboard freigeschaltet.</span></span>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveSchedule} disabled={pending} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Speichert …" : "Zeitplan speichern"}</button>
          {scheduleMessage && <p role="status" className="text-xs text-slate-500">{scheduleMessage}</p>}
        </div>
        </>}
      </div>}
      </div>
    </li>
  );
}
