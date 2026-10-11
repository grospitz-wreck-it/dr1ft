"use client";

import { useMemo, useState } from "react";

type InteractionDatum = { type: string; classId: string | null; schoolId: string | null; region: string | null };
type ClassOption = { id: string; name: string; schoolId: string; schoolName: string; region: string | null };
type SchoolOption = { id: string; name: string; region: string | null };
type ModuleDatum = { title: string; minutes: number | null };

const COLORS = ["#6554e8", "#16a673", "#e9a23b", "#e45b78", "#3895d5", "#8b5cf6", "#64748b", "#14b8a6"];

export function EditorialDashboard({
  schoolCount,
  classCount,
  studentCount,
  interactionEvents,
  schools,
  classes,
  modules,
}: {
  schoolCount: number;
  classCount: number;
  studentCount: number;
  interactionEvents: InteractionDatum[];
  schools: SchoolOption[];
  classes: ClassOption[];
  modules: ModuleDatum[];
}) {
  const [scope, setScope] = useState("global");
  const [region, setRegion] = useState("all");
  const [schoolId, setSchoolId] = useState("all");
  const [classId, setClassId] = useState("all");

  const regions = useMemo(() => Array.from(new Set(schools.map((school) => school.region).filter(Boolean) as string[])).sort(), [schools]);
  const visibleSchools = useMemo(() => schools.filter((school) => region === "all" || school.region === region), [schools, region]);
  const visibleClasses = useMemo(() => classes.filter((item) => (schoolId === "all" || item.schoolId === schoolId) && (region === "all" || item.region === region)), [classes, schoolId, region]);

  const filtered = interactionEvents.filter((event) => {
    if (scope === "region" && region !== "all" && event.region !== region) return false;
    if (scope === "school" && schoolId !== "all" && event.schoolId !== schoolId) return false;
    if (scope === "class" && classId !== "all" && event.classId !== classId) return false;
    if (scope === "region" && region === "all") return true;
    if (scope === "school" && schoolId === "all") return true;
    if (scope === "class" && classId === "all") return true;
    return true;
  });

  const interactionCounts = new Map<string, number>();
  for (const event of filtered) interactionCounts.set(event.type || "unknown", (interactionCounts.get(event.type || "unknown") ?? 0) + 1);
  const entries = Array.from(interactionCounts, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  const totalInteractions = entries.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;
  const gradient = entries.length
    ? `conic-gradient(${entries.map((item, index) => {
        const start = offset / Math.max(1, totalInteractions) * 100;
        offset += item.count;
        const end = offset / Math.max(1, totalInteractions) * 100;
        return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
      }).join(", ")})`
    : "conic-gradient(#e2e8f0 0% 100%)";

  const formatType = (value: string) => ({
    view: "Aufrufe",
    like: "Likes",
    comment: "Kommentare",
    report: "Meldungen",
    ignore: "Ignoriert",
    inspect_source: "Quellenprüfungen",
    compare_information: "Informationsvergleiche",
    share: "Geteilt",
  } as Record<string, string>)[value] ?? value.replaceAll("_", " ");

  const scopeLabel = scope === "global" ? "Gesamt" : scope === "region" ? (region === "all" ? "Alle Bundesländer" : region) : scope === "school" ? (schools.find((item) => item.id === schoolId)?.name ?? "Alle Schulen") : (classes.find((item) => item.id === classId)?.name ?? "Alle Klassen");

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-violet-600">DR1FT / ÜBERSICHT</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Nutzung, Reichweite und Lernaktivität auf einen Blick.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">Analytics-Hinweis</span>
          <p className="mt-1 max-w-xs leading-5">Interaktionen sind gespeicherte Ereignisse. Sie sind nicht automatisch ein Kompetenznachweis.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Schulen" value={schoolCount} detail="Registrierte Schulen" />
        <Kpi label="Klassen" value={classCount} detail="Klasseninstanzen" />
        <Kpi label="Schüler:innen" value={studentCount} detail="Aktive Klassenmitgliedschaften" />
        <Kpi label="Interaktionen" value={interactionEvents.length} detail="Gespeicherte Events im geladenen Datensatz" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Nutzungsanalyse</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Interaktionen</h2>
              <p className="mt-1 text-sm text-slate-500">{scopeLabel} · {totalInteractions.toLocaleString("de-DE")} Ereignisse</p>
            </div>
            <select aria-label="Auswertungsbereich" value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="global">Global</option>
              <option value="region">Bundesland</option>
              <option value="school">Schule</option>
              <option value="class">Klasse</option>
            </select>
          </div>
          {scope === "region" && <select aria-label="Bundesland" value={region} onChange={(e) => setRegion(e.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:max-w-xs"><option value="all">Alle Bundesländer</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select>}
          {scope === "school" && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><select aria-label="Bundesland" value={region} onChange={(e) => { setRegion(e.target.value); setSchoolId("all"); }} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Alle Bundesländer</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Schule" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Alle Schulen</option>{visibleSchools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
          {scope === "class" && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><select aria-label="Bundesland" value={region} onChange={(e) => { setRegion(e.target.value); setSchoolId("all"); setClassId("all"); }} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Alle Bundesländer</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Schule" value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setClassId("all"); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Alle Schulen</option>{visibleSchools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Klasse" value={classId} onChange={(e) => setClassId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Alle Klassen</option>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.schoolName}</option>)}</select></div>}
          <div className="mt-6 grid gap-6 md:grid-cols-[190px_minmax(0,1fr)] md:items-center">
            <div className="relative mx-auto h-44 w-44 rounded-full" style={{ background: gradient }} role="img" aria-label="Kreisdiagramm der Interaktionen nach Typ">
              <div className="absolute inset-[25%] flex flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-2xl font-semibold tracking-tight text-slate-900">{totalInteractions.toLocaleString("de-DE")}</span>
                <span className="text-[11px] text-slate-500">Interaktionen</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {entries.slice(0, 8).map((item, index) => <div key={item.type} className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="truncate">{formatType(item.type)}</span></span><span className="shrink-0 font-semibold tabular-nums text-slate-800">{item.count.toLocaleString("de-DE")} <span className="text-xs font-normal text-slate-400">{totalInteractions ? Math.round(item.count / totalInteractions * 100) : 0}%</span></span></div>)}
              {entries.length === 0 && <p className="text-sm text-slate-500">Für diesen Bereich liegen keine Interaktionen vor.</p>}
              {entries.length > 8 && <p className="text-xs text-slate-400">Weitere {entries.length - 8} Interaktionstypen sind im Gesamtergebnis enthalten.</p>}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Lernzeit</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Zeit je Modul</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">Die tatsächliche aktive Bearbeitungszeit ist derzeit noch nicht zuverlässig messbar. Angezeigt wird daher die hinterlegte Zielzeit, keine gemessene Durchschnittszeit.</p>
          <div className="mt-5 divide-y divide-slate-100">
            {modules.map((module) => <div key={module.title} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0 text-sm font-medium text-slate-700">{module.title}</span><span className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{module.minutes == null ? "Keine Zielzeit" : `ca. ${module.minutes} Min. geplant`}</span></div>)}
            {modules.length === 0 && <p className="py-4 text-sm text-slate-500">Noch keine Module mit Zielzeit vorhanden.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
        <strong>Hinweis zur Datenqualität:</strong> Die Interaktionsauswertung basiert auf gespeicherten Events. Tatsächliche aktive Zeit, Leerlaufzeit und vollständige Lern-Evidenz sind laut aktuellem Tracking-Prüfstand noch nicht durchgängig nachgewiesen.
      </section>
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value.toLocaleString("de-DE")}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}
