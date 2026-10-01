"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, ChevronRight, Plus, Search, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type School = {
  id: string;
  name: string;
  region: string | null;
  email_domain: string | null;
  school_type: string | null;
  student_count: number | null;
  status: string;
  plan: string;
  funding_type: string;
  created_at: string;
  updated_at: string;
  memberCount: number;
  adminCount: number;
  teacherCount: number;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  school: "School",
  growth: "Growth",
  enterprise: "Enterprise",
};

const FUNDING_LABELS: Record<string, string> = {
  sponsored: "Sponsored",
  grant: "Förderung",
};

const TYPE_LABELS: Record<string, string> = {
  grundschule: "Grundschule",
  hauptschule: "Hauptschule",
  realschule: "Realschule",
  gesamtschule: "Gesamtschule",
  gymnasium: "Gymnasium",
  berufskolleg: "Berufskolleg",
  sonstige: "Sonstige",
};

const REGION_OPTIONS = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

function client() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

function regionLabel(value: string | null) {
  const aliases: Record<string, string> = {
    BW: "Baden-Württemberg",
    BE: "Berlin",
    BB: "Brandenburg",
    HB: "Bremen",
    HH: "Hamburg",
    HE: "Hessen",
    MV: "Mecklenburg-Vorpommern",
    NI: "Niedersachsen",
    NRW: "Nordrhein-Westfalen",
    RP: "Rheinland-Pfalz",
    SL: "Saarland",
    SN: "Sachsen",
    ST: "Sachsen-Anhalt",
    SH: "Schleswig-Holstein",
    TH: "Thüringen",
  };
  return value ? aliases[value] ?? value : "—";
}

export function SchoolAdminWorkspace({ initialSchools }: { initialSchools: School[] }) {
  const [schools, setSchools] = useState(initialSchools);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [fundingFilter, setFundingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [regionFilter, setRegionFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [domain, setDomain] = useState("");
  const [schoolType, setSchoolType] = useState("gymnasium");
  const [students, setStudents] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeSchools = schools.filter((school) => school.status === "active");
  const totalStudents = schools.reduce((sum, school) => sum + (school.student_count ?? 0), 0);
  const totalMembers = schools.reduce((sum, school) => sum + school.memberCount, 0);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
    return schools.filter((school) => {
      const haystack = [
        school.name,
        regionLabel(school.region),
        school.email_domain ?? "",
        TYPE_LABELS[school.school_type ?? ""] ?? school.school_type ?? "",
      ].join(" ").toLocaleLowerCase("de-DE");

      return (
        haystack.includes(normalizedQuery) &&
        (statusFilter === "all" || school.status === statusFilter) &&
        (planFilter === "all" || school.plan === planFilter) &&
        (fundingFilter === "all" || school.funding_type === fundingFilter) &&
        (regionFilter === "all" || regionLabel(school.region) === regionFilter)
      );
    });
  }, [schools, query, statusFilter, planFilter, fundingFilter, regionFilter]);

  async function createSchool(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const supabase = client();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-school`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          region,
          emailDomain: domain,
          schoolType,
          street,
          houseNumber,
          postalCode,
          city,
          phone,
          website,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Schule konnte nicht angelegt werden");

      const studentCount = students ? Number(students) : null;
      const { error } = await supabase.from("schools").update({
        school_type: schoolType,
        student_count: studentCount,
      }).eq("id", data.school.id);

      if (error) throw error;

      setSchools((current) => [
        ...current,
        {
          ...data.school,
          school_type: schoolType,
          student_count: studentCount,
          status: "active",
          plan: "free",
          funding_type: "none",
          updated_at: data.school.created_at,
          memberCount: 0,
          adminCount: 0,
          teacherCount: 0,
        },
      ].sort((a, b) => a.name.localeCompare(b.name)));

      setShowCreate(false);
      setName("");
      setRegion("");
      setDomain("");
      setStudents("");
      setStreet("");
      setHouseNumber("");
      setPostalCode("");
      setCity("");
      setPhone("");
      setWebsite("");
      setMessage("Schule angelegt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fehler beim Anlegen");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-panel p-5">
          <p className="text-xs font-medium text-slate-400">Schulen</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{schools.length}</p>
          <p className="mt-1 text-xs text-slate-500">{activeSchools.length} aktiv</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5">
          <p className="text-xs font-medium text-slate-400">Schüler:innen</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{totalStudents.toLocaleString("de-DE")}</p>
          <p className="mt-1 text-xs text-slate-500">laut Schulstammdaten</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5">
          <p className="text-xs font-medium text-slate-400">Aktive Personen</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{totalMembers}</p>
          <p className="mt-1 text-xs text-slate-500">Lehrkräfte, Leitung und Admins</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5">
          <p className="text-xs font-medium text-slate-400">Förderungen</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{schools.filter((school) => school.funding_type !== "none").length}</p>
          <p className="mt-1 text-xs text-slate-500">Sponsored oder Förderung</p>
        </div>
      </section>

      <section className="mt-7 rounded-3xl border border-border bg-panel shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Schulbestand</h2>
            <p className="mt-1 text-sm text-slate-500">{filtered.length} von {schools.length} Schulen sichtbar</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Neue Schule
          </button>
        </div>

        <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[minmax(260px,1fr)_160px_190px_190px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Schule, Ort, Region oder Domain …"
              className="w-full rounded-xl border border-border bg-canvas py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm">
            <option value="active">Aktive Schulen</option>
            <option value="inactive">Inaktive</option>
            <option value="suspended">Gesperrte</option>
            <option value="all">Alle Status</option>
          </select>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm">
            <option value="all">Alle Bundesländer</option>
            {REGION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm">
            <option value="all">Alle Pläne</option>
            {Object.entries(PLAN_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={fundingFilter} onChange={(e) => setFundingFilter(e.target.value)} className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm">
            <option value="all">Alle Förderungen</option>
            <option value="sponsored">Sponsored</option>
            <option value="grant">Förderung</option>
            <option value="none">Keine</option>
          </select>
        </div>

        {message && <div className="mx-4 mt-4 rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-slate-700">{message}</div>}

        {filtered.length === 0 ? (
          <div className="p-14 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-800">Keine Schulen gefunden</p>
            <p className="mt-1 text-sm text-slate-500">Passe Suche oder Filter an.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((school) => (
              <Link
                key={school.id}
                href={`/schools/${school.id}`}
                className="group grid gap-4 px-5 py-5 transition hover:bg-canvas/50 lg:grid-cols-[minmax(250px,1.8fr)_1.15fr_.8fr_.8fr_32px] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-canvas text-slate-500">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{school.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${school.status === "active" ? "bg-emerald-50 text-emerald-700" : school.status === "suspended" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                        {school.status === "active" ? "Aktiv" : school.status === "suspended" ? "Gesperrt" : "Inaktiv"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {TYPE_LABELS[school.school_type ?? ""] ?? school.school_type ?? "Schulform nicht hinterlegt"} · {regionLabel(school.region)}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">{school.email_domain ? `@${school.email_domain}` : "Keine Schul-Domain"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Nutzung</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {school.memberCount} Personen · {school.teacherCount} Lehrkräfte
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Schüler:innen</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{school.student_count?.toLocaleString("de-DE") ?? "—"}</p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Plan</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{PLAN_LABELS[school.plan] ?? school.plan}</p>
                  {school.funding_type !== "none" && <p className="mt-0.5 text-xs text-accent">{FUNDING_LABELS[school.funding_type]}</p>}
                </div>

                <ChevronRight className="hidden h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 lg:block" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-panel p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Neue Organisation</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Schule anlegen</h2>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-slate-400 hover:bg-canvas hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={createSchool} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Schulname
                <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Schulform
                <select value={schoolType} onChange={(e) => setSchoolType(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm">
                  {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Bundesland
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm">
                  <option value="">Nicht festgelegt</option>
                  {REGION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Schülerzahl
                <input type="number" min="0" value={students} onChange={(e) => setStudents(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Schul-Domain
                <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="schule.de" className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Straße
                <input value={street} onChange={(e) => setStreet(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Hausnummer
                <input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                PLZ
                <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Ort
                <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Telefon
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Website
                <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
              </label>

              <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm">
                  Abbrechen
                </button>
                <button disabled={pending} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                  {pending ? "Wird angelegt …" : "Schule anlegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
