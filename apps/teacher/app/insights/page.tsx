import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function TeacherInsightsPage() {
  const supabase = supabaseServerClient();

  const { data: memberships } = await supabase
    .from("class_instance_memberships")
    .select(
      "class_instance_id, class_instances(id,name,grade_level,school_year)"
    )
    .eq("role", "teacher")
    .is("left_at", null);

  const classes = Array.from(
    new Map(
      (memberships ?? [])
        .filter((row: any) => row.class_instances)
        .map((row: any) => [
          row.class_instances.id,
          row.class_instances,
        ])
    ).values()
  );

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 lg:px-8">
        <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            DR1FT Teacher
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Insights
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Lernfortschritte und Klassenanalysen deiner Klassen.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Klassenanalyse
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Öffne eine Klasse, um Kompetenzentwicklung und Missionen
              auszuwerten.
            </p>
          </div>

          <div className="divide-y divide-border">
            {classes.length ? (
              classes.map((item: any) => (
                <a
                  key={item.id}
                  href={`/classes/${item.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-canvas/70"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Jahrgang {item.grade_level ?? "—"} · {item.school_year}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-slate-500">
                    Analyse öffnen →
                  </span>
                </a>
              ))
            ) : (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                Noch keine Klassen vorhanden.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
