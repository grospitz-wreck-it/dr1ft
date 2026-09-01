"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, ChevronRight, Plus, Search, ShieldCheck, Users, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type School = {
  id: string;
  name: string;
  region: string | null;
  email_domain: string | null;
  created_at: string;
  memberCount: number;
  adminCount: number;
  teacherCount: number;
};

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function SchoolAdminWorkspace({ initialSchools }: { initialSchools: School[] }) {
  const [schools, setSchools] = useState(initialSchools);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function call(path: string, body: unknown) {
    const { data: { session } } = await client().auth.getSession();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Aktion fehlgeschlagen");
    return data;
  }

  async function createSchool(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const data = await call("provision-school", { name, region, emailDomain: domain });
      setSchools((current) => [
        ...current,
        { ...data.school, memberCount: 0, adminCount: 0, teacherCount: 0 },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setRegion("");
      setDomain("");
      setShowCreate(false);
      setMessage("Schule angelegt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fehler beim Anlegen der Schule");
    } finally {
      setPending(false);
    }
  }

  const filteredSchools = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("de-DE");
    if (!normalized) return schools;
    return schools.filter((school) =>
      [school.name, school.region ?? "", school.email_domain ?? ""]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalized),
    );
  }, [query, schools]);

  const totalMembers = schools.reduce((sum, school) => sum + school.memberCount, 0);
  const totalAdmins = schools.reduce((sum, school) => sum + school.adminCount, 0);

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <Building2 className="h-4 w-4" /> Administration
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Schulen</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Schulen zentral organisieren, Ansprechpartner verwalten und später Nutzung und Abrechnung an einem Ort steuern.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Neue Schule
          </button>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-panel p-4">
            <p className="text-xs font-medium text-slate-400">Schulen</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{schools.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel p-4">
            <p className="text-xs font-medium text-slate-400">Aktive Personen</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalMembers}</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel p-4">
            <p className="text-xs font-medium text-slate-400">Admins &amp; Leitungen</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalAdmins}</p>
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Schule, Region oder Domain suchen …"
              className="w-full rounded-xl border border-border bg-panel py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-accent"
            />
          </div>
          <p className="text-xs text-slate-400">
            {filteredSchools.length} von {schools.length} Schulen
          </p>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        {filteredSchools.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-border bg-panel p-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-300" />
            <h2 className="mt-4 text-sm font-semibold text-slate-900">Keine Schule gefunden</h2>
            <p className="mt-1 text-sm text-slate-500">Passe die Suche an oder lege eine neue Schule an.</p>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSchools.map((school) => (
              <Link
                key={school.id}
                href={`/schools/${school.id}`}
                className="group rounded-3xl border border-border bg-panel p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas text-slate-500">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                </div>
                <div className="mt-5">
                  <h2 className="font-semibold text-slate-900">{school.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{school.region || "Region nicht hinterlegt"}</p>
                  <p className="mt-2 truncate text-xs text-slate-400">
                    {school.email_domain ? `@${school.email_domain}` : "Keine Schul-Domain hinterlegt"}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
                  <div>
                    <p className="text-[11px] text-slate-400">Personen</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{school.memberCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Admins</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{school.adminCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Lehrkräfte</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{school.teacherCount}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Schul-Domain geschützt
                  <Users className="ml-auto h-3.5 w-3.5" /> Verwalten
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-panel p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Neue Organisation</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Schule anlegen</h2>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-slate-400 hover:bg-canvas hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={createSchool} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Schulname<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" placeholder="z. B. Gymnasium Beispielstadt" /></label>
              <label className="block text-sm font-medium text-slate-700">Region / Bundesland<input value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" placeholder="z. B. Nordrhein-Westfalen" /></label>
              <label className="block text-sm font-medium text-slate-700">Schul-Domain<input value={domain} onChange={(e) => setDomain(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" placeholder="schule.de" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-canvas">Abbrechen</button>
                <button disabled={pending} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Wird angelegt …" : "Schule anlegen"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
