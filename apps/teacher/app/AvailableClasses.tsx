"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, BookOpen, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { subscribeToClass } from "./subscriptionActions";

type Item = { id: string; name: string; gradeLevel: number | null; schoolYear: string; schoolName: string; studentCount: number };

export function AvailableClasses({ classes }: { classes: Item[] }) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("de");
    return classes.filter((item) => !q || `${item.name} ${item.schoolName} ${item.gradeLevel ?? ""}`.toLocaleLowerCase("de").includes(q));
  }, [classes, query]);

  function subscribe(id: string) {
    setError("");
    setPendingId(id);
    startTransition(async () => {
      try {
        await subscribeToClass(id);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Die Klasse konnte nicht abonniert werden.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="drift-panel mt-5 overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-cyan-700">Schulinterne Klassen</p>
          <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-950">Weitere Klassen übernehmen</h2>
          <p className="mt-1 text-sm text-slate-500">Abonniere eine aktive Klasse deiner Schule und stelle ihr deine Lernmodule bereit.</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Klasse suchen …" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
        </div>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {filtered.length ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-violet-50/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-cyan-100 text-violet-700"><Users className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.schoolName} · Jahrgang {item.gradeLevel ?? "—"} · {item.schoolYear} · {item.studentCount} Schüler:innen</p>
              </div>
              <button type="button" disabled={pending} onClick={() => subscribe(item.id)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50">
                {pendingId === item.id ? "Wird hinzugefügt …" : "Klasse abonnieren"} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-5 py-8 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-violet-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">{classes.length ? "Keine passende Klasse gefunden" : "Alle aktiven Klassen deiner Schule sind bereits abonniert"}</p>
        </div>
      )}
    </section>
  );
}
