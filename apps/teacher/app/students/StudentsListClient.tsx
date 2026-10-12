"use client";

import { useMemo, useState } from "react";

type StudentRow = {
  userId: string;
  classId: string;
  className: string;
  gradeLevel: number | null;
  schoolYear: string;
  profile: { display_name?: string | null; username?: string | null; avatar_seed?: string | null } | null;
};

function studentAvatarUrl(seed: string | null | undefined, size = 96) {
  const styles = ["voxel-art", "adventurer", "adventurer-neutral", "avataaars", "bottts", "fun-emoji", "lorelei", "micah", "miniavs", "personas", "pixel-art-neutral", "thumbs"];
  const value = seed || "dr1ft";
  const separator = value.indexOf("::");
  const candidate = separator > 0 ? value.slice(0, separator) : "";
  const style = styles.includes(candidate) ? candidate : "voxel-art";
  const avatarSeed = separator > 0 && styles.includes(candidate) ? value.slice(separator + 2) || "dr1ft" : value;
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}&size=${size}&animationVariant=medium&borderRadius=18`;
}

export function StudentsListClient({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const classes = useMemo(() => Array.from(new Map(students.map((s) => [s.classId, s.className])).entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "de")), [students]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("de");
    return students.filter((student) => {
      const matchesClass = classFilter === "all" || student.classId === classFilter;
      const searchable = [student.profile?.display_name, student.profile?.username, student.className, student.gradeLevel == null ? "" : String(student.gradeLevel), student.schoolYear].join(" ").toLocaleLowerCase("de");
      return matchesClass && (!q || searchable.includes(q));
    });
  }, [students, query, classFilter]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-950">Meine Schüler:innen</h2>
        <p className="mt-1 text-sm text-slate-500">Schüler:innen können mehreren Klassen über verschiedene Schuljahre zugeordnet sein.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="relative block">
            <span className="sr-only">Schüler:innen suchen</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><circle cx="10.8" cy="10.8" r="6.5" stroke="currentColor" strokeWidth="1.7"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Nutzername oder Klasse suchen …" className="w-full rounded-xl border border-border bg-canvas py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="block">
            <span className="sr-only">Nach Klasse filtern</span>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">Alle Klassen ({students.length})</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {students.filter((student) => student.classId === item.id).length}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">{filtered.length} von {students.length} Zuordnungen</p>
      </div>
      {filtered.length ? <div className="divide-y divide-border">
        {filtered.map((student) => {
          const name = student.profile?.display_name || student.profile?.username || "Ohne Namen";
          return <div key={student.classId + "-" + student.userId} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-canvas/70 sm:gap-4 sm:px-6">
            <img src={studentAvatarUrl(student.profile?.avatar_seed || student.userId, 96)} alt={`Avatar von ${name}`} className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover" loading="lazy" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{name}</p>
              <p className="truncate text-sm text-slate-500">@{student.profile?.username || "—"}</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-700">{student.className}</p>
              <p className="text-xs text-slate-400">Jahrgang {student.gradeLevel ?? "—"} · {student.schoolYear}</p>
            </div>
            <a href={`/classes/${student.classId}`} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-canvas">Klasse</a>
          </div>;
        })}
      </div> : <div className="px-6 py-14 text-center"><p className="text-sm font-medium text-slate-700">Keine Schüler:innen gefunden</p><p className="mt-1 text-xs text-slate-400">Passe Suchbegriff oder Klassenauswahl an.</p><button type="button" onClick={() => { setQuery(""); setClassFilter("all"); }} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-canvas">Filter zurücksetzen</button></div>}
    </section>
  );
}
