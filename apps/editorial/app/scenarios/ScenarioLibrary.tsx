"use client";

import { useMemo, useState } from "react";
import { BookOpen, Building2, CheckCircle2, Flag, GraduationCap, Layers3, School, Search, Sparkles, ArrowUpRight, Users, SlidersHorizontal, List, LayoutGrid } from "lucide-react";
import { ScenarioCoverEditor } from "./ScenarioCoverEditor";

type Family = {
  key: string;
  title: string;
  description: string;
  variants: Array<{ id: string; age_band?: string | null; status?: string | null; is_active?: boolean; created_at?: string | null }>;
  coverImageUrl: string | null;
  missionCount: number;
  contentCount: number;
  activeVariants: number;
  activeClasses: number;
  schoolsInUse: number;
  completedMissions: number;
  learnersReached: number;
  createdAt: string;
};

const AGE_LABELS: Record<string, string> = {
  "9_11": "9–11 Jahre",
  "12_13": "12–13 Jahre",
  "14_15": "14–15 Jahre",
  "16_17": "16–17 Jahre",
  "18_plus": "18+ Jahre",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  live: "Aktiv",
  rejected: "Überarbeiten",
  archived: "Archiv",
};

function familyAgeBands(family: Family) {
  return Array.from(new Set(family.variants.map((variant) => variant.age_band).filter(Boolean))) as string[];
}

function familyStatuses(family: Family) {
  return Array.from(new Set(family.variants.map((variant) => variant.is_active ? "live" : (variant.status || "draft"))));
}

export function ScenarioLibrary({ families }: { families: Family[] }) {
  const [query, setQuery] = useState("");
  const [age, setAge] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    return families.filter((family) => {
      const text = [family.title, family.description, ...family.variants.map((variant) => variant.age_band || "")].join(" ").toLocaleLowerCase("de");
      const matchesQuery = !needle || text.includes(needle);
      const matchesAge = age === "all" || familyAgeBands(family).includes(age);
      const matchesStatus = status === "all" || familyStatuses(family).includes(status);
      return matchesQuery && matchesAge && matchesStatus;
    }).sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "de");
      if (sort === "missions") return b.missionCount - a.missionCount || a.title.localeCompare(b.title, "de");
      if (sort === "active") return b.activeVariants - a.activeVariants || a.title.localeCompare(b.title, "de");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [families, query, age, status, sort]);

  return (
    <div className="space-y-3">
      <section aria-label="Szenario suchen und filtern" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <SlidersHorizontal className="h-4 w-4 text-violet-600" /> Finden und sortieren
          <span className="ml-auto text-xs font-medium text-slate-400">{visible.length} von {families.length}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(170px,1fr)]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Stichwort, Titel oder Beschreibung …" aria-label="Szenarien nach Stichwort suchen" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" />
          </label>
          <select value={age} onChange={(event) => setAge(event.target.value)} aria-label="Nach Altersgruppe filtern" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100">
            <option value="all">Alle Altersgruppen</option>
            {Object.entries(AGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Nach Status filtern" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100">
            <option value="all">Alle Status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Szenarien sortieren" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100">
            <option value="newest">Neueste zuerst</option>
            <option value="title">Titel A–Z</option>
            <option value="missions">Meiste Missionen</option>
            <option value="active">Meiste aktive Varianten</option>
          </select>
        </div>
        {(query || age !== "all" || status !== "all" || sort !== "newest") && (
          <button type="button" onClick={() => { setQuery(""); setAge("all"); setStatus("all"); setSort("newest"); }} className="mt-3 text-xs font-semibold text-violet-700 hover:text-violet-900">Filter und Sortierung zurücksetzen</button>
        )}
      </section>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{visible.length} Szenario-Themen</p>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Darstellungsmodus">
            <button type="button" onClick={() => setViewMode("cards")} aria-pressed={viewMode === "cards"} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${viewMode === "cards" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
              <LayoutGrid className="h-4 w-4" /> Karten
            </button>
            <button type="button" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${viewMode === "list" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
              <List className="h-4 w-4" /> Kompakt
            </button>
          </div>
        </div>
        {viewMode === "list" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {visible.map((family) => {
              const statuses = familyStatuses(family);
              const statusText = statuses.map((value) => value === "live" ? "Aktiv" : (STATUS_LABELS[value] || "Entwurf")).join(" · ");
              return (
                <article key={family.key} className="flex items-center gap-3 px-3 py-3 transition hover:bg-slate-50 sm:gap-4 sm:px-4">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-400 sm:h-16 sm:w-24">
                    {family.coverImageUrl && <img src={family.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-950 sm:text-[15px]">{family.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                      <span>{familyAgeBands(family).map((band) => AGE_LABELS[band] || band).join(" · ") || "Altersgruppe offen"}</span>
                      <span className="text-slate-300">•</span>
                      <span>{family.variants.length} Varianten</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {statuses.map((value) => <span key={value} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${value === "live" || value === "approved" ? "bg-emerald-50 text-emerald-700" : value === "rejected" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{value === "live" ? "Aktiv" : (STATUS_LABELS[value] || "Entwurf")}</span>)}
                    </div>
                  </div>
                  <a href={`/scenarios/${family.variants[0].id}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50">
                    Bearbeiten <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
        <div className="space-y-3">
        {visible.map((family) => (
          <article key={family.key} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_18px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">{family.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{family.activeVariants} aktive Varianten</span>
                  {familyAgeBands(family).map((band) => <span key={band} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">{AGE_LABELS[band] || band}</span>)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="min-w-0">
                <ScenarioCoverEditor scenarioId={family.variants[0].id} title={family.title} coverImageUrl={family.coverImageUrl} />
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <a href={`/scenarios/${family.variants[0].id}`} className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/25 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">
                  <Sparkles className="h-4 w-4" /> Bearbeiten <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <MiniKpi icon={<School className="h-4 w-4" />} tint="violet" label="Schulen" value={String(family.schoolsInUse)} />
                  <MiniKpi icon={<Users className="h-4 w-4" />} tint="blue" label="Aktive Klassen" value={String(family.activeClasses)} />
                  <MiniKpi icon={<GraduationCap className="h-4 w-4" />} tint="cyan" label="Lernende erreicht" value={String(family.learnersReached)} />
                  <MiniKpi icon={<Flag className="h-4 w-4" />} tint="amber" label="Missionen" value={String(family.missionCount)} />
                  <MiniKpi icon={<CheckCircle2 className="h-4 w-4" />} tint="emerald" label="Abschlüsse" value={String(family.completedMissions)} />
                  <MiniKpi icon={<Layers3 className="h-4 w-4" />} tint="violet" label="Varianten / Inhalte" value={`${family.variants.length} / ${family.contentCount}`} />
                </div>
                {family.description && <section className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Szenario-Beschreibung</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{family.description}</p></section>}
              </div>
            </div>
          </article>
        ))}
        </div>
        )}
        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">Keine passenden Szenarien gefunden</p>
            <p className="mt-1 text-xs text-slate-500">Passe Suchbegriff oder Filter an.</p>
            <button type="button" onClick={() => { setQuery(""); setAge("all"); setStatus("all"); setSort("newest"); }} className="mt-3 text-sm font-semibold text-violet-700">Alle Szenarien anzeigen</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniKpi({ icon, tint, label, value }: { icon: React.ReactNode; tint: "violet" | "blue" | "cyan" | "amber" | "emerald"; label: string; value: string }) {
  const tones = { violet: "bg-violet-100 text-violet-700", blue: "bg-blue-100 text-blue-700", cyan: "bg-cyan-100 text-cyan-700", amber: "bg-amber-100 text-amber-700", emerald: "bg-emerald-100 text-emerald-700" };
  return <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.025)] transition hover:border-slate-300"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-medium leading-4 text-slate-500">{label}</span><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tones[tint]}`}>{icon}</span></div><div className="mt-1 text-xl font-bold tracking-tight text-slate-950">{value}</div></div>;
}
