"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, GraduationCap, Plus, Search, Users, X, Sparkles, Pencil, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClass, setClassActive } from "./classes/actions";
import { subscribeToClass } from "./classes/subscriptionActions";
import { ClassVisual, getFallbackClassVisualId } from "./classes/[classId]/ClassVisual";

type Mission = { id: string; title: string; cover_image_url: string | null };
type ClassItem = {
  id: string;
  name: string;
  gradeLevel: number | null;
  schoolYear: string;
  isActive: boolean;
  thumbnailUrl: string | null;
  classVisualId: string | null;
  imagePositionX: number;
  imagePositionY: number;
  imageZoom: number;
  studentCount: number;
  missions: Mission[];
  schoolName?: string;
  isSubscribed?: boolean;
  isMine?: boolean;
};
type SearchableClass = { id: string; name: string; gradeLevel: number | null; schoolYear: string; schoolName: string; studentCount: number; isSubscribed: boolean; isMine: boolean };

export function OverviewClasses({ classes, searchableClasses = [], canCreateClasses = false }: { classes: ClassItem[]; searchableClasses?: SearchableClass[]; canCreateClasses?: boolean }) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const activeCount = classes.filter((item) => item.isActive).length;
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("de-DE");
    if (term) return searchableClasses.filter((item) => (item.name + " " + item.schoolName + " " + item.schoolYear + " " + (item.gradeLevel ?? "")).toLocaleLowerCase("de-DE").includes(term));
    return classes.filter((item) => showInactive || item.isActive);
  }, [classes, searchableClasses, query, showInactive]);

  function subscribeClass(id: string) {
    setSubscribeError(""); setPendingId(id);
    startTransition(async () => { try { await subscribeToClass(id); router.refresh(); } catch (error) { setSubscribeError(error instanceof Error ? error.message : "Klasse konnte nicht abonniert werden."); } finally { setPendingId(null); } });
  }

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

      </div>

      <div className="mt-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Alle Schulklassen suchen …" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
          </div>
          {canCreateClasses && <button type="button" onClick={() => setShowCreate(true)} aria-label="Neue Klasse anlegen" title="Neue Klasse anlegen" className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"><Users className="h-5 w-5" /><Plus className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full bg-violet-50" /></button>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{query.trim() ? `${visible.length} Treffer in deiner Schule` : `${activeCount} aktive ${activeCount === 1 ? "Klasse" : "Klassen"} · ${classes.length} insgesamt`}</span>
          <button type="button" onClick={() => setShowInactive((value) => !value)} className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100">
            {showInactive ? "Nur aktive" : "Inaktive anzeigen"}
          </button>
        </div>
      </div>

      {subscribeError && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{subscribeError}</p>}
      {visible.length ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm divide-y divide-slate-100">
          {visible.map((item: any) => (
            <article key={item.id} className="group flex min-w-0 items-center gap-3 px-3 py-2.5 transition hover:bg-violet-50/40 sm:gap-4 sm:px-4">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-900 sm:h-12 sm:w-12">
                {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${item.imagePositionX}% ${item.imagePositionY}%`, transform: `scale(${item.imageZoom})` }} /> : <ClassVisual visualId={item.classVisualId ?? getFallbackClassVisualId(item.id)} className="h-full w-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h3 className="truncate text-sm font-extrabold text-slate-950">{item.name}</h3>
                  <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold "+(item.isActive === false?"bg-slate-100 text-slate-500":"bg-emerald-50 text-emerald-700")}>{item.isActive === false?"Inaktiv":"Aktiv"}</span>
                  {item.isSubscribed && <span title="Bereits abonniert" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700"><Check className="h-3 w-3" /> Abonniert</span>}
                  {query.trim() && item.schoolName && <span className="text-[10px] text-slate-400">{item.schoolName}</span>}
                  <span className="hidden text-[10px] text-slate-400 sm:inline">Jahrgang {item.gradeLevel ?? "—"} · {item.schoolYear}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-cyan-600"/>{item.studentCount} Schüler:innen</span>
                  <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-violet-600"/>{item.missions?.length ?? 0} Missionen</span>
                  <span className="sm:hidden">Jg. {item.gradeLevel ?? "—"} · {item.schoolYear}</span>
                  {(item.missions?.length ?? 0)>0&&<span className="hidden max-w-[210px] truncate text-slate-400 lg:inline" title={item.missions.map((m: Mission)=>m.title).join(", ")}>{item.missions[0].title}{item.missions.length>1?" +"+(item.missions.length-1):""}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                {item.isMine !== false ? <><button type="button" role="switch" aria-checked={item.isActive} aria-label={item.isActive?item.name+" deaktivieren":item.name+" aktivieren"} title={item.isActive?"Klasse deaktivieren":"Klasse aktivieren"} disabled={pendingId===item.id||isPending} onClick={()=>toggleClass(item)} className={"relative inline-flex h-6 w-10 items-center rounded-full transition-colors disabled:opacity-50 "+(item.isActive?"bg-violet-600":"bg-slate-300")}><span className={"h-[18px] w-[18px] rounded-full bg-white shadow transition-transform "+(item.isActive?"translate-x-[19px]":"translate-x-1")}/></button><Link href={"/classes/"+item.id} aria-label={item.name+" verwalten"} title="Klasse verwalten" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"><Pencil className="h-4 w-4"/></Link></> : item.isSubscribed ? <span title="Diese Klasse ist bereits abonniert" className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><Check className="mr-1 inline h-3.5 w-3.5"/>Abonniert</span> : <button type="button" disabled={isPending} onClick={()=>subscribeClass(item.id)} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">{pendingId===item.id?"Wird abonniert …":"Abonnieren"}</button>}
                
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-violet-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">{query ? "Keine passende Klasse gefunden" : "Noch keine Klassen vorhanden"}</p>
          <p className="mt-1 text-xs text-slate-500">{canCreateClasses ? "Lege einen Lernraum an und starte mit DR1FT." : "Klassen werden durch Schuladmins oder die Schulleitung angelegt."}</p>
          {canCreateClasses && <button type="button" onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Klasse anlegen</button>}
        </div>
      )}

      {canCreateClasses && showCreate && (
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
