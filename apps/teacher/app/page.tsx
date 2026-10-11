import { redirect } from "next/navigation";
import { supabaseServerClient } from "../lib/supabaseServerClient";

export default async function TeacherHomePage() {
  const supabase = supabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("class_instance_memberships")
    .select(
      "class_instance_id, role, class_instances(id,name,is_active,grade_level,school_year,school_id)"
    )
    .eq("role", "teacher")
    .is("left_at", null);

  const classes = (memberships ?? [])
    .map((row: any) => row.class_instances)
    .filter(Boolean);

  const classIds = classes.map((item: any) => item.id);
  const { data: schoolMemberships } = await supabase
    .from("school_memberships")
    .select("school_id, active")
    .eq("user_id", user.id)
    .eq("active", true);
  const schoolIds = Array.from(new Set([
    ...classes.map((item: any) => item.school_id),
    ...(schoolMemberships ?? []).map((membership: any) => membership.school_id),
  ].filter(Boolean)));
  const { data: schoolRows } = schoolIds.length
    ? await supabase.from("schools").select("id, name, region").in("id", schoolIds)
    : { data: [] as any[] };
  const schoolsById = new Map((schoolRows ?? []).map((school: any) => [school.id, school]));
  const linkedSchools = Array.from(schoolsById.values());

  let studentCount = 0;

  if (classIds.length) {
    const { count } = await supabase
      .from("class_instance_memberships")
      .select("user_id", { count: "exact", head: true })
      .in("class_instance_id", classIds)
      .eq("role", "student")
      .is("left_at", null);

    studentCount = count ?? 0;
  }

  const activeClasses = classes.filter((item: any) => item.is_active);

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 lg:px-8">
        <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-violet-600">DR1FT / TEACHER</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Dein Unterricht</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Klassen, Schulzugehörigkeit und Lernaktivität an einem Ort.</p>
          </div>
          <a href="/classes" className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">Meine Klassen <span className="ml-2">→</span></a>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
            DEINE ÜBERSICHT
          </p>

          <div className="mt-2 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Übersicht
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Deine Klassen, Schüler:innen und Lernfortschritte auf einen Blick.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {linkedSchools.length ? linkedSchools.map((school: any) => (
                  <span key={school.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{school.name}{school.region ? ` · ${school.region}` : ""}
                  </span>
                )) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">Noch keine Schule zugeordnet</span>
                )}
              </div>
            </div>

            <span className="hidden sm:block rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">{activeClasses.length} aktive Klassen</span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Metric label="Aktive Klassen" value={activeClasses.length} />
            <Metric label="Schüler:innen" value={studentCount} />
            <Metric label="Klassen insgesamt" value={classes.length} />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Unterricht
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-slate-950">
              Deine Klassen
            </h2>

            <div className="mt-5 divide-y divide-border">
              {activeClasses.length ? (
                activeClasses.slice(0, 5).map((item: any) => (
                  <a
                    key={item.id}
                    href={`/classes/${item.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Jahrgang {item.grade_level ?? "—"} · {item.school_year}
                      </p>
                    </div>
                    <span className="text-sm text-slate-400">→</span>
                  </a>
                ))
              ) : (
                <p className="py-5 text-sm text-slate-400">
                  Noch keine aktive Klasse.
                </p>
              )}
            </div>

            <a
              href="/classes"
              className="mt-4 inline-flex text-sm font-medium text-slate-700 hover:text-slate-950"
            >
              Alle Klassen anzeigen →
            </a>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Analyse
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-slate-950">
              DR1FT Insights
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Lernfortschritte, Kompetenzen und mögliche Schwierigkeiten deiner
              Klassen zentral auswerten.
            </p>

            <a
              href="/insights"
              className="mt-5 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              Insights öffnen
            </a>
          </article>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
