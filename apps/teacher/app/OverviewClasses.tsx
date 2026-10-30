"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, BookOpen, GraduationCap, Plus, Search, Users, X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClass, setClassActive } from "./classes/actions";

type Mission = { id: string; title: string; cover_image_url: string | null };
type ClassItem = {
  id: string;
  name: string;
  gradeLevel: number | null;
  schoolYear: string;
  isActive: boolean;
  thumbnailUrl: string | null;
  studentCount: number;
  missions: Mission[];
};

export function OverviewClasses({ classes }: { classes: ClassItem[] }) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const activeCount = classes.filter((item) => item.isActive).length;
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("de-DE");
    return classes.filter((item) => (showInactive || item.isActive) &&
      (!term || (item.name + " " + item.schoolYear + " " + (item.gradeLevel ?? "")).toLocaleLowerCase("de-DE").includes(term)));
  }, [classes, query, showInactive]);

  function toggleClass(item: ClassItem) {
    setPendingId(item.id);
    startTransition(async () => {
      try {
        await setClassActive(item.id, !item.isActive);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-600">Unterricht gestalten</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[28px]">Deine Klassen</h2>
          <p className="mt-1 text-sm text-slate-500">Alle Lernräume, Missionen und Schüler:innen an einem Ort.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">
          <Plus className="h-4 w-4" /> Neue Klasse
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Klasse suchen …" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{activeCount} aktive {activeCount === 1 ? "Klasse" : "Klassen"} · {classes.length} insgesamt</span>
          <button type="button" onClick={() => setShowInactive((value) => !value)} className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100">
            {showInactive ? "Nur aktive" : "Inaktive anzeigen"}
          </button>
        </div>
      </div>

      {visible.length ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {visible.map((item, index) => (
            <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg">
              <div className="flex gap-4 p-4 sm:p-5">
                <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 sm:h-28 sm:w-36">
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-violet-400"><Users className="h-8 w-8" /></div>}
                  <span className="absolute left-2 top-2 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-violet-700">DR1FT</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-extrabold text-slate-950">{item.name}</h3>
                    <span className={"rounded-full px-2 py-1 text-[10px] font-bold " + (item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{item.isActive ? "Aktiv" : "Inaktiv"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Jahrgang {item.gradeLevel ?? "—"} · Schuljahr {item.schoolYear}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-cyan-600" />{item.studentCount} Schüler:innen</span>
                    <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-violet-600" />{item.missions.length} aktive {item.missions.length === 1 ? "Mission" : "Missionen"}</span>
                  </div>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <button type="button" role="switch" aria-checked={item.isActive} aria-label={item.isActive ? item.name + " deaktivieren" : item.name + " aktivieren"} disabled={pendingId === item.id || isPending} onClick={() => toggleClass(item)} className={"relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 " + (item.isActive ? "bg-violet-600" : "bg-slate-300")}>
                    <span className={"h-5 w-5 rounded-full bg-white shadow transition-transform " + (item.isActive ? "translate-x-6" : "translate-x-1")} />
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/65 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {item.missions.length ? item.missions.slice(0, 3).map((mission) => (
                      <span key={mission.id} title={mission.title} className="inline-flex max-w-[190px] items-center gap-2 rounded-full border border-violet-100 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
                        {mission.cover_image_url ? <img src={mission.cover_image_url} alt="" className="h-5 w-5 rounded-full object-cover" /> : <Sparkles className="h-3.5 w-3.5 text-violet-500" />}
                        <span className="truncate">{mission.title}</span>
                      </span>
                    )) : <span className="text-[10px] text-slate-400">Noch keine aktive Mission zugewiesen</span>}
                    {item.missions.length > 3 && <span className="self-center text-[10px] font-bold text-violet-600">+{item.missions.length - 3}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" role="switch" aria-checked={item.isActive} aria-label={item.isActive ? item.name + " deaktivieren" : item.name + " aktivieren"} disabled={pendingId === item.id || isPending} onClick={() => toggleClass(item)} className={"relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 sm:hidden " + (item.isActive ? "bg-violet-600" : "bg-slate-300")}>
                      <span className={"h-5 w-5 rounded-full bg-white shadow transition-transform " + (item.isActive ? "translate-x-6" : "translate-x-1")} />
                    </button>
                    <a href={"/classes/" + item.id} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700">Öffnen <ArrowRight className="h-3.5 w-3.5" /></a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-violet-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">{query ? "Keine passende Klasse gefunden" : "Noch keine Klassen vorhanden"}</p>
          <p className="mt-1 text-xs text-slate-500">Lege einen Lernraum an und starte mit DR1FT.</p>
          <button type="button" onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Klasse anlegen</button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-class-title" className="my-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(46,16,101,.28)]">
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-500 px-6 py-6 text-white">
              <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border-[22px] border-white/10" />
              <div className="relative flex items-start justify-between gap-4">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-violet-100">DR1FT / LEHRKRAFT</p><h3 id="create-class-title" className="mt-2 text-2xl font-extrabold tracking-tight">Neuen Lernraum erstellen</h3><p className="mt-1 text-sm text-white/80">Deine Klasse. Ihr gemeinsamer Startpunkt.</p></div>
                <button type="button" onClick={() => setShowCreate(false)} aria-label="Dialog schließen" className="rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/25"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <form action={createClass} className="space-y-4 p-6">
              <label className="block text-xs font-bold text-slate-700">Klassenname<input name="name" required maxLength={60} placeholder="z. B. 6E oder Medien-AG" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">Jahrgang<input name="gradeLevel" type="number" min="1" max="13" placeholder="z. B. 6" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
                <label className="block text-xs font-bold text-slate-700">Schuljahr<input name="schoolYear" defaultValue="2026/27" required className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
              </div>
              <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Abbrechen</button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20"><Plus className="h-4 w-4" /> Klasse erstellen</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
