import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { StudentsListClient } from "./StudentsListClient";

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
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-6 lg:px-8">
        <section className="rounded-2xl border border-violet-100 bg-gradient-to-r from-white via-violet-50/70 to-sky-50/70 px-6 py-5 shadow-sm sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">DR1FT / LEHRKRAFT</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Schüler:innen</h1>
              <p className="mt-1 text-sm text-slate-500">Alle Schüler:innen deiner aktiven Klassen im Überblick.</p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-xl border border-white bg-white/80 px-4 py-2.5 shadow-sm sm:self-center">
              <div><p className="text-[11px] text-slate-500">Zuordnungen</p><p className="text-xl font-semibold leading-tight text-slate-900">{students.length}</p></div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 4.5a3.2 3.2 0 0 1 0 6.2M17 14.5a4 4 0 0 1 4 4V20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>
          </div>
        </section>
        <StudentsListClient students={students.map((student: any) => ({
          userId: student.userId,
          classId: student.classId,
          className: student.className,
          gradeLevel: student.gradeLevel,
          schoolYear: student.schoolYear,
          profile: student.profile ? {
            display_name: student.profile.display_name ?? null,
            username: student.profile.username ?? null,
            avatar_seed: student.profile.avatar_seed ?? null,
          } : null,
        }))} />
      </div>
    </main>
  );
}
