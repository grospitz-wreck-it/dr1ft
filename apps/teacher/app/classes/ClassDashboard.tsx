"use client";

import { useMemo, useState } from "react";

type ClassItem = { id: string; name: string; access_code: string; is_active: boolean; grade_level: number | null; school_year: string; student_count: number };

export function ClassDashboard({ classes }: { classes: ClassItem[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? classes.filter((c) => `${c.name} ${c.school_year} ${c.grade_level ?? ""}`.toLowerCase().includes(q)) : classes;
  }, [classes, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs uppercase tracking-[0.18em] text-indigo-600 font-semibold">Teacher Workspace</p><h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">Meine Klassen</h1><p className="text-sm text-slate-500 mt-2">Alle betreuten Klassen auf einen Blick. Öffne eine Klasse direkt für Lernfortschritt, Schüler:innen und Module.</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{classes.length} {classes.length === 1 ? "Klasse" : "Klassen"}</span><a href="#new-class" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">+ Neue Klasse</a></div>
      </div>
      <div className="relative"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Klasse, Schuljahr oder Jahrgang suchen …" className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => <a key={c.id} href={`/classes/${c.id}`} className="group rounded-2xl bg-white border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900 group-hover:text-accent transition">{c.name}</h2><p className="text-sm text-slate-500 mt-1">Jahrgang {c.grade_level ?? "—"} · {c.school_year}</p></div><span className={`text-xs px-2.5 py-1 rounded-full ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.is_active ? "Aktiv" : "Inaktiv"}</span></div><div className="grid grid-cols-2 gap-3 mt-6"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Schüler:innen</p><p className="text-xl font-semibold text-slate-900 mt-1">{c.student_count}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Zugangscode</p><p className="text-sm font-mono font-semibold text-slate-900 mt-2 tracking-wider">{c.access_code}</p></div></div><div className="mt-4 text-sm font-medium text-accent">Klasse öffnen →</div></a>)}
        {filtered.length === 0 && <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-slate-400">Keine passende Klasse gefunden.</div>}
      </div>
    </div>
  );
}
