import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function TeacherStudentsPage() {
  const supabase = supabaseServerClient();

  const { data: memberships } = await supabase
    .from("class_instance_memberships")
    .select(
      "class_instance_id, user_id, joined_at, class_instances(id,name,grade_level,school_year)"
    )
    .eq("role", "student")
    .is("left_at", null);

  const rows = memberships ?? [];
  const userIds = Array.from(new Set(rows.map((row: any) => row.user_id)));

  const { data: profiles } = userIds.length
    ? await supabase
        .from("user_profiles")
        .select("id,display_name,username,avatar_seed")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((profile: any) => [profile.id, profile])
  );

  const students = rows
    .map((row: any) => ({
      userId: row.user_id,
      classId: row.class_instance_id,
      className: row.class_instances?.name ?? "—",
      gradeLevel: row.class_instances?.grade_level ?? null,
      schoolYear: row.class_instances?.school_year ?? "—",
      profile: profileMap.get(row.user_id),
    }))
    .sort((a: any, b: any) =>
      String(
        a.profile?.display_name ??
          a.profile?.username ??
          a.userId
      ).localeCompare(
        String(
          b.profile?.display_name ??
            b.profile?.username ??
            b.userId
        ),
        "de"
      )
    );

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 lg:px-8">
        <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            DR1FT Teacher
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Schüler:innen
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Alle Schüler:innen deiner aktiven Klassen.
          </p>

          <div className="mt-7">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
              <div>
                <p className="text-xs text-white/45">Zuordnungen</p>
                <p className="mt-1 text-xl font-semibold">{students.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Meine Schüler:innen
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Schüler:innen können mehreren Klassen über verschiedene Schuljahre
              zugeordnet sein.
            </p>
          </div>

          {students.length ? (
            <div className="divide-y divide-border">
              {students.map((student: any) => {
                const name =
                  student.profile?.display_name ||
                  student.profile?.username ||
                  "Ohne Namen";

                return (
                  <div
                    key={`${student.classId}-${student.userId}`}
                    className="flex items-center gap-4 px-6 py-4 transition hover:bg-canvas/70"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                      {name.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {name}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        @{student.profile?.username ?? "—"}
                      </p>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-medium text-slate-700">
                        {student.className}
                      </p>
                      <p className="text-xs text-slate-400">
                        Jahrgang {student.gradeLevel ?? "—"} ·{" "}
                        {student.schoolYear}
                      </p>
                    </div>

                    <a
                      href={`/classes/${student.classId}`}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-canvas"
                    >
                      Klasse
                    </a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-slate-400">
              Noch keine Schüler:innen vorhanden.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
