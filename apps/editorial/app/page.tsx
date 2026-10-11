import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { EditorialDashboard } from "./EditorialDashboard";

export default async function HomePage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: schoolsData, error: schoolsError },
    { data: classesData, error: classesError },
    { data: membersData, error: membersError },
    { data: interactionData, error: interactionsError, count: interactionCount },
    { data: modulesData },
  ] = await Promise.all([
    supabase.from("schools").select("id, name, region"),
    supabase.from("class_instances").select("id, name, school_id, is_active"),
    supabase.from("class_instance_memberships").select("class_instance_id, role, left_at").is("left_at", null),
    supabase.from("user_interactions").select("interaction_type, class_instance_id", { count: "exact" }).order("created_at", { ascending: false }).limit(10000),
    supabase.from("scenarios").select("id, title, target_duration_minutes").order("title").limit(12),
  ]);

  if (schoolsError || classesError || membersError || interactionsError) {
    const error = schoolsError ?? classesError ?? membersError ?? interactionsError;
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-5"><h1 className="text-lg font-semibold text-red-900">Dashboard konnte nicht geladen werden</h1><p className="mt-2 text-sm text-red-800">{error?.message}</p></section>;
  }

  const schools = (schoolsData ?? []).map((school) => ({ id: school.id, name: school.name, region: school.region }));
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const classes = (classesData ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    schoolId: item.school_id,
    schoolName: schoolById.get(item.school_id)?.name ?? "Schule unbekannt",
    region: schoolById.get(item.school_id)?.region ?? null,
  }));
  const classById = new Map(classes.map((item) => [item.id, item]));
  const activeClassIds = new Set((classesData ?? []).filter((item) => item.is_active).map((item) => item.id));
  const studentCount = (membersData ?? []).filter((item) => item.role === "student" && activeClassIds.has(item.class_instance_id)).length;
  const interactionEvents = (interactionData ?? []).map((event) => {
    const cls = event.class_instance_id ? classById.get(event.class_instance_id) : null;
    return {
      type: event.interaction_type ?? "unknown",
      classId: event.class_instance_id,
      schoolId: cls?.schoolId ?? null,
      region: cls?.region ?? null,
    };
  });
  const modules = (modulesData ?? []).map((item) => ({
    title: item.title,
    minutes: typeof item.target_duration_minutes === "number" ? item.target_duration_minutes : null,
  }));

  return (
    <EditorialDashboard
      schoolCount={schools.length}
      classCount={classesData?.length ?? 0}
      studentCount={studentCount}
      interactionEvents={interactionEvents}
      interactionTotal={interactionCount ?? interactionEvents.length}
      schools={schools}
      classes={classes}
      modules={modules}
    />
  );
}
