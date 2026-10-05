"use client";

import { useMemo, useState } from "react";
import { Archive, ArrowRight, Plus, Search, Users, X } from "lucide-react";
import { createClass, changeClassState } from "./actions";

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
  const studentCount = active.reduce((sum, c) => sum + c.student_count, 0);

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
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 lg:px-8">
        <section className="rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">DR1FT Teacher</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Meine Klassen</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-white/90 sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Neue Klasse
            </button>
          </div>

          <div className="mt-7 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
              <p className="text-xs text-white/45">Aktive Klassen</p>
              <p className="mt-1 text-xl font-semibold">{active.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
              <p className="text-xs text-white/45">Schüler:innen</p>
              <p className="mt-1 text-xl font-semibold">{studentCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
              <p className="text-xs text-white/45">Archiviert</p>
              <p className="mt-1 text-xl font-semibold">{archived.length}</p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Klasse suchen …"
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </div>
            {archived.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchived((value) => !value)}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-canvas"
              >
                <Archive className="h-3.5 w-3.5" />
                {showArchived ? "Nur aktive Klassen" : "Archivierte anzeigen"}
              </button>
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
              {filtered.map((c, index) => (
                <article
                  key={c.id}
                  className={`group flex flex-col gap-4 px-5 py-4 transition hover:bg-canvas/70 sm:flex-row sm:items-center sm:justify-between ${index ? "border-t border-border" : ""}`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-slate-950">{c.name}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {c.is_active ? "Aktiv" : "Archiviert"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {c.school_name ?? "Meine Schule"} · {c.grade_level ? `Jahrgang ${c.grade_level}` : "Jahrgang —"} · Schuljahr {c.school_year}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-slate-400">Schüler:innen</p>
                      <p className="text-sm font-semibold text-slate-800">{c.student_count}</p>
                    </div>
                    <a
                      href={`/classes/${c.id}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Klasse öffnen
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    {showArchived && !c.is_active && (
                      <button
                        type="button"
                        onClick={() => changeClassState(c.id, true)}
                        className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-canvas"
                      >
                        Reaktivieren
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <section className="mt-4 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <h2 className="mt-3 font-semibold text-slate-800">{query ? "Keine passende Klasse" : "Noch keine aktive Klasse"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {query ? "Passe deine Suche an." : "Lege deine erste Klasse an, um mit DR1FT zu starten."}
              </p>
              {!query && (
                <button type="button" onClick={() => setShowCreate(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
                  <Plus className="h-4 w-4" /> Klasse anlegen
                </button>
              )}
            </section>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
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
                <input name="name" required placeholder="z. B. 6E" className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Jahrgang
                  <input name="gradeLevel" type="number" min="1" max="13" placeholder="z. B. 6" className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Schuljahr
                  <input name="schoolYear" defaultValue="2026/27" className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-slate-600">
                  Abbrechen
                </button>
                <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
                  Klasse anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
