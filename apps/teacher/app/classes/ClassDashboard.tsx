"use client";

import { useMemo, useState } from "react";
import { Archive, ArrowRight, Plus, Search, Users, X } from "lucide-react";
import { createClass, archiveClass, changeClassState } from "./actions";

type ClassItem = {
  id: string;
  name: string;
  access_code: string;
  is_active: boolean;
  grade_level: number | null;
  school_year: string;
  school_id: string | null;
  school_name?: string | null;
  student_count: number;
};

export function ClassDashboard({ classes }: { classes: ClassItem[] }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const active = classes.filter((c) => c.is_active);
  const archived = classes.filter((c) => !c.is_active);
  const visible = showArchived ? classes : active;

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("de-DE");
    if (!q) return visible;
    return visible.filter((c) =>
      `${c.name} ${c.school_name ?? ""} ${c.school_year} ${c.grade_level ?? ""}`
        .toLocaleLowerCase("de-DE")
        .includes(q)
    );
  }, [visible, query]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">DR1FT Teacher</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Meine Klassen</h1>
          <p className="mt-2 text-sm text-slate-500">
            {active.length === 1 ? "Eine aktive Klasse" : `${active.length} aktive Klassen`}
            {archived.length ? ` · ${archived.length} archiviert` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Neue Klasse
        </button>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Klasse suchen …"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </div>
        {archived.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? "Nur aktive Klassen" : "Archivierte anzeigen"}
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{c.school_name ?? "Meine Schule"}</p>
                  <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950">{c.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {c.grade_level ? `Jahrgang ${c.grade_level}` : "Jahrgang —"} · Schuljahr {c.school_year}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {c.is_active ? "Aktiv" : "Archiviert"}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Schüler:innen</p>
                  <p className="text-sm font-semibold text-slate-800">{c.student_count}</p>
                </div>
              </div>

              <a
                href={`/classes/${c.id}`}
                className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 transition group-hover:bg-accent/5 group-hover:text-accent"
              >
                Klasse öffnen
                <ArrowRight className="h-4 w-4" />
              </a>

              {showArchived && !c.is_active && (
                <button
                  type="button"
                  onClick={() => changeClassState(c.id, true)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Klasse reaktivieren
                </button>
              )}
            </article>
          ))}
        </section>
      ) : (
        <section className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 font-semibold text-slate-800">{query ? "Keine passende Klasse" : "Noch keine aktive Klasse"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {query ? "Passe deine Suche an." : "Lege deine erste Klasse an, um mit DR1FT zu starten."}
          </p>
          {!query && (
            <button type="button" onClick={() => setShowCreate(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Klasse anlegen
            </button>
          )}
        </section>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Unterricht</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Neue Klasse anlegen</h2>
                <p className="mt-2 text-sm text-slate-500">Nach dem Anlegen gelangst du direkt in die Klassenansicht.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={createClass} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Klassenname
                <input name="name" required placeholder="z. B. 6E" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Jahrgang
                  <input name="gradeLevel" type="number" min="1" max="13" placeholder="z. B. 6" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Schuljahr
                  <input name="schoolYear" defaultValue="2026/27" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600">
                  Abbrechen
                </button>
                <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
                  Klasse anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
