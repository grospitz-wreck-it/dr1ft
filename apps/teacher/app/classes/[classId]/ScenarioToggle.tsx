"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, Check, Clock3, Image as ImageIcon } from "lucide-react";
import { toggleScenarioAssignment, updateScenarioSchedule } from "../actions";

type ModuleStatus = "Abgeschlossen" | "In Bearbeitung" | "Noch nicht begonnen" | "Nicht zugewiesen";

function datePart(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function timePart(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

export function ScenarioToggle({
  classId, scenarioId, title, description, coverImageUrl, ageRating, initiallyAssigned,
  moduleStatus, moduleReport, scheduledStartAt = null, scheduledEndAt = null, showReportsAtEnd = false,
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
    setStartDate(datePart(scheduledStartAt));
    setStartTime(timePart(scheduledStartAt));
    setEndDate(datePart(scheduledEndAt));
    setEndTime(timePart(scheduledEndAt));
    setReleaseReports(showReportsAtEnd);
  }, [initiallyAssigned, scheduledStartAt, scheduledEndAt, showReportsAtEnd]);

  const status = moduleStatus ?? (initiallyAssigned ? "Noch nicht begonnen" : "Nicht zugewiesen");
  const now = Date.now();
  const startsAt = scheduledStartAt ? new Date(scheduledStartAt).getTime() : null;
  const endsAt = scheduledEndAt ? new Date(scheduledEndAt).getTime() : null;
  const hasSchedule = Boolean(scheduledStartAt || scheduledEndAt);
  const scheduleState = startsAt !== null && startsAt > now ? "Geplant" : endsAt !== null && endsAt <= now ? "Beendet" : "Live";

  function changeAssignment(next: boolean) {
    if (pending || next === selected) return;
    setSelected(next);
    startTransition(async () => {
      try {
        await toggleScenarioAssignment(classId, scenarioId, next, "compact");
      } catch (error) {
        setSelected(!next);
        setScheduleMessage(error instanceof Error ? error.message : "Modulstatus konnte nicht geändert werden.");
      }
    });
  }

  function saveSchedule() {
    setScheduleMessage("");
    if ((startDate && !startTime) || (!startDate && startTime) || (endDate && !endTime) || (!endDate && endTime)) {
      setScheduleMessage("Bitte Datum und Uhrzeit jeweils vollständig angeben.");
      return;
    }
    const start = startDate && startTime ? new Date(startDate + "T" + startTime).toISOString() : null;
    const end = endDate && endTime ? new Date(endDate + "T" + endTime).toISOString() : null;
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
    <article className={"overflow-hidden rounded-xl border bg-white transition-colors " + (selected ? "border-violet-300 bg-violet-50/30" : "border-slate-200 hover:border-slate-300")}>
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-[76px] w-[112px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-violet-100 to-sky-100 sm:h-[88px] sm:w-[132px]">
          {coverImageUrl ? <img src={coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-violet-300"><ImageIcon className="h-6 w-6" /></div>}
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">{ageRating}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-slate-900">{title}</h3>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700"><Check className="h-3 w-3" />Aktiv</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Nicht zugewiesen</span>
            )}
            {selected && hasSchedule && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"><Clock3 className="h-3 w-3" />{scheduleState}</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-600">{description?.trim() || "Für dieses Szenario liegt noch keine Kurzbeschreibung vor."}</p>
          {selected && moduleReport && <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{moduleReport}</p>}
          {selected && hasSchedule && <p className="mt-1 text-[10px] text-slate-500">{scheduledStartAt ? new Date(scheduledStartAt).toLocaleString("de-DE") : "Sofort"}{scheduledEndAt ? " – " + new Date(scheduledEndAt).toLocaleString("de-DE") : ""}</p>}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button type="button" role="switch" aria-checked={selected} aria-label={selected ? title + " deaktivieren" : title + " aktivieren"} onClick={() => changeAssignment(!selected)} disabled={pending} className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 " + (selected ? "bg-violet-600" : "bg-slate-300")}>
            <span className={"inline-block h-4 w-4 rounded-full bg-white shadow transition-transform " + (selected ? "translate-x-6" : "translate-x-1")} />
          </button>
          <span className="text-[9px] text-slate-400">{pending ? "…" : selected ? "Aktiv" : "Aktivieren"}</span>
        </div>
      </div>

      {selected && (
        <div className="border-t border-violet-100 px-3 py-2 sm:px-4">
          <button type="button" onClick={() => setScheduleOpen((open) => !open)} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-700 hover:text-violet-900"><CalendarClock className="h-3.5 w-3.5" />{scheduleOpen ? "Zeitplan schließen" : hasSchedule ? "Zeitplan bearbeiten" : "Zeitplan festlegen"}</button>
          {scheduleOpen && (
            <div className="mt-3 rounded-lg bg-violet-50/70 p-3">
              <p className="text-xs text-slate-600">Lege fest, wann das Modul für die Klasse verfügbar ist. Ohne Zeitangabe bleibt es dauerhaft verfügbar.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <fieldset className="grid grid-cols-2 gap-2"><legend className="mb-1 text-xs font-medium text-slate-700">Live ab</legend><input aria-label="Startdatum" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" /><input aria-label="Startuhrzeit" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" /></fieldset>
                <fieldset className="grid grid-cols-2 gap-2"><legend className="mb-1 text-xs font-medium text-slate-700">Live bis</legend><input aria-label="Enddatum" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" /><input aria-label="Enduhrzeit" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" /></fieldset>
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={releaseReports} onChange={(e) => setReleaseReports(e.target.checked)} disabled={pending} className="mt-0.5 accent-violet-600" /><span><span className="font-medium">Schüler-Reportings nach Ende freigeben</span><span className="mt-0.5 block text-slate-500">Die Auswertung wird erst nach der Endzeit im Lehrer-Dashboard freigeschaltet.</span></span></label>
              <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={saveSchedule} disabled={pending} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Speichert …" : "Zeitplan speichern"}</button>{scheduleMessage && <p role="status" className="text-xs text-slate-600">{scheduleMessage}</p>}</div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
