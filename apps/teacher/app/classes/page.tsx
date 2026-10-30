import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { ClassDashboard } from "./ClassDashboard";

export default async function TeacherClassesPage() {
  const supabase = supabaseServerClient();

  const { data: memberships } = await supabase
    .from("class_instance_memberships")
    .select("class_instance_id, role, class_instances(id,name,access_code,is_active,status,grade_level,school_year,school_id,class_image_path,class_image_position_x,class_image_position_y,class_image_zoom)")
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
  const enrichedClasses = await Promise.all(classes.map(async (item: any) => {
    let class_image_url: string | null = null;
    if (item.class_image_path) {
      const { data } = await supabase.storage.from("class-images").createSignedUrl(item.class_image_path, 60 * 60);
      class_image_url = data?.signedUrl ?? null;
    }
    return {
      ...item,
      class_image_url,
      school_name: schoolNames.get(item.school_id) ?? null,
    };
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
