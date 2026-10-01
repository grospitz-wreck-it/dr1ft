import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { ClassDashboard } from "./ClassDashboard";

export default async function TeacherClassesPage() {
  const supabase = supabaseServerClient();

  const { data: memberships } = await supabase
    .from("class_instance_memberships")
    .select("class_instance_id, role, class_instances(id,name,access_code,is_active,grade_level,school_year,school_id)")
    .in("role", ["teacher", "school_admin"])
    .is("left_at", null);

  const { data: studentMemberships } = await supabase
    .from("class_instance_memberships")
    .select("class_instance_id")
    .eq("role", "student")
    .is("left_at", null);

  const countByClass = new Map<string, number>();
  (studentMemberships ?? []).forEach((membership: any) => {
    countByClass.set(
      membership.class_instance_id,
      (countByClass.get(membership.class_instance_id) ?? 0) + 1
    );
  });

  const classes = (memberships ?? [])
    .map((membership: any) => membership.class_instances)
    .filter(Boolean)
    .map((item: any) => ({
      ...item,
      student_count: countByClass.get(item.id) ?? 0,
    }));

  const schoolIds = Array.from(new Set(classes.map((item: any) => item.school_id).filter(Boolean)));
  const { data: schools } = schoolIds.length
    ? await supabase.from("schools").select("id,name").in("id", schoolIds)
    : { data: [] };

  const schoolNames = new Map((schools ?? []).map((school) => [school.id, school.name]));
  const enrichedClasses = classes
    .map((item: any) => ({
      ...item,
      school_name: schoolNames.get(item.school_id) ?? null,
    }))
    .sort((a: any, b: any) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return String(b.school_year).localeCompare(String(a.school_year));
    });

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 md:px-8">
      <ClassDashboard classes={enrichedClasses} />
    </main>
  );
}
