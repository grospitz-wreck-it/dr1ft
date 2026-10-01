import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { SchoolAdminPortal } from "./SchoolAdminPortal";

export default async function SchoolAdminPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/school-admin");

  const { data: membership } = await supabase
    .from("school_memberships")
    .select("school_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", ["school_admin", "school_lead"])
    .maybeSingle();

  if (!membership) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="max-w-md rounded-3xl border border-border bg-panel p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">DR1FT Schulbereich</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">Kein Schulzugang</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Für dieses Konto ist keine aktive Schuladmin- oder Schulleitungsrolle hinterlegt.</p>
        </div>
      </main>
    );
  }

  const [{ data: school }, { data: members }, { data: classes }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, region, email_domain, school_type, student_count, status, plan, funding_type")
      .eq("id", membership.school_id)
      .maybeSingle(),
    supabase.rpc("get_school_member_directory", { p_school_id: membership.school_id }),
    supabase
      .from("class_instances")
      .select("id, name, grade_level, school_year, access_code, is_active, created_at")
      .eq("school_id", membership.school_id)
      .order("school_year", { ascending: false })
      .order("name"),
  ]);

  if (!school) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="rounded-3xl border border-border bg-panel p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Schule nicht gefunden</h1>
          <p className="mt-2 text-sm text-slate-500">Die hinterlegte Schulzuordnung konnte nicht geladen werden.</p>
        </div>
      </main>
    );
  }

  const classIds = (classes ?? []).map((item) => item.id);
  const { data: instanceMembers } = classIds.length
    ? await supabase
        .from("class_instance_memberships")
        .select("class_instance_id, user_id, role, user_profiles(display_name)")
        .in("class_instance_id", classIds)
        .is("left_at", null)
    : { data: [] };

  const teacherNames = new Map<string, string[]>();
  const studentCounts = new Map<string, number>();
  for (const row of instanceMembers ?? []) {
    if (row.role === "teacher" || row.role === "school_admin" || row.role === "school_lead") {
      const names = teacherNames.get(row.class_instance_id) ?? [];
      const profile = row.user_profiles as { display_name?: string | null } | null;
      if (profile?.display_name) names.push(profile.display_name);
      teacherNames.set(row.class_instance_id, names);
    }
    if (row.role === "student") {
      studentCounts.set(row.class_instance_id, (studentCounts.get(row.class_instance_id) ?? 0) + 1);
    }
  }

  const schoolClasses = (classes ?? []).map((item) => ({
    ...item,
    teacherNames: teacherNames.get(item.id) ?? [],
    studentCount: studentCounts.get(item.id) ?? 0,
  }));

  return (
    <SchoolAdminPortal
      school={school}
      members={members ?? []}
      classes={schoolClasses}
      role={membership.role}
    />
  );
}
