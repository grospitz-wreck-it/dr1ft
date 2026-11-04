import { Suspense } from "react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ClassModuleLibrary } from "./ClassModuleLibrary";
import { StudentRoster } from "./StudentRoster";
import { ClassDashboardInsights } from "./ClassDashboardInsights";
import { CollapsiblePanel } from "./CollapsiblePanel";
import ClassImageWorkspace from "./ClassImageWorkspace";

export default async function ClassDetailPage({
  params,
}: {
  params: { classId: string };
}) {
  const supabase = supabaseServerClient();
  const { classId } = params;
  const pageStartedAt = Date.now();
  const instanceStartedAt = Date.now();

  // Auth and class metadata do not depend on each other; resolve them together
  // to remove one serial network round-trip from the initial render.
  const [instanceResult, initialAuthResult] = await Promise.all([
    supabase.from("class_instances")
      .select("id,name,access_code,is_active,status,grade_level,school_year,school_id,class_image_path,class_image_position_x,class_image_position_y,class_image_zoom")
      .eq("id", classId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const instance = instanceResult.data;
  const user = initialAuthResult.data.user;

  console.info("[class-page-timing] instance-and-auth", Date.now() - instanceStartedAt, "ms");

  if (!instance) {
    return (
      <main className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <a
            href="/classes"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Meine Klassen
          </a>

          <div className="mt-6 rounded-2xl border border-border bg-white p-8">
            <h1 className="text-lg font-semibold text-slate-950">
              Klasseninstanz nicht gefunden
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Die Klasse existiert nicht oder du hast keinen Zugriff darauf.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const parallelQueriesStartedAt = Date.now();
  const timed = async <T,>(label: string, query: PromiseLike<T>): Promise<T> => {
    const startedAt = Date.now();
    try {
      const result = await query;
      console.info("[class-page-query]", label, Date.now() - startedAt, "ms");
      return result;
    } catch (error) {
      console.error("[class-page-query]", label, "failed", Date.now() - startedAt, "ms", error);
      throw error;
    }
  };
  const [
    { data: roster },
    { data: scenarios },
    { data: assignments },
    { data: teacherModuleAssignments },
    { data: availableTeacherModules },
    { data: school },
    teacherMembershipResult,
    schoolMembershipResult,
  ] = await Promise.all([
    timed("roster", supabase
      .from("class_instance_memberships")
      .select("user_id,role,left_at,user_profiles(display_name,username,avatar_seed)")
      .eq("class_instance_id", classId)
      .is("left_at", null)),
    timed("scenarios", supabase
      .from("scenarios")
      .select("id,title,description,cover_image_url,age_rating")
      .order("title")),
    timed("scenario-assignments", supabase
      .from("class_instance_scenario_assignments")
      .select("scenario_id,pacing_mode,scheduled_start_at,scheduled_end_at,show_reports_at_end,archived_at,is_active,scenarios(title)")
      .eq("class_instance_id", classId)
      .is("archived_at", null)),
    timed("teacher-module-assignments", supabase
      .from("teacher_module_class_assignments")
      .select("id,module_id,school_id,assigned_by,is_active,scheduled_start_at,scheduled_end_at,archived_at,teacher_modules(id,title,description,intro_title,intro_text,visibility_scope,status,created_by,title_card_enabled)")
      .eq("class_instance_id", classId)
      .is("archived_at", null)),
    timed("available-teacher-modules", supabase
      .from("teacher_modules")
      .select("id,title,description,visibility_scope,created_by")
      .eq("school_id", instance.school_id)
      .eq("status", "published")
      .order("updated_at", { ascending: false })),
    timed("school", instance.school_id
      ? supabase.from("schools")
          .select("id,name,region,school_image_path,school_image_position_x,school_image_position_y,school_image_zoom")
          .eq("id", instance.school_id)
          .maybeSingle()
      : Promise.resolve({ data: null })),
    timed("class-teacher-membership", user
      ? supabase.from("class_instance_memberships").select("id")
          .eq("class_instance_id", classId).eq("user_id", user.id)
          .eq("role", "teacher").is("left_at", null).maybeSingle()
      : Promise.resolve({ data: null })),
    timed("school-membership", user && instance.school_id
      ? supabase.from("school_memberships").select("role")
          .eq("school_id", instance.school_id).eq("user_id", user.id)
          .eq("active", true).maybeSingle()
      : Promise.resolve({ data: null })),
  ] as const);
  console.info("[class-page-timing] parallel-queries", Date.now() - parallelQueriesStartedAt, "ms");
  const teacherMembership = teacherMembershipResult.data;
  const schoolMembership = schoolMembershipResult.data;

  const canEditClassImage = Boolean(
    teacherMembership.data ||
    ["school_admin", "school_lead"].includes(schoolMembership.data?.role),
  );

  const classImagePromise = canEditClassImage && instance.class_image_path
    ? supabase.storage.from("class-images")
        .createSignedUrl(instance.class_image_path, 60 * 60)
        .then(({ data }) => data?.signedUrl ?? null)
    : Promise.resolve(null);

const moduleAssetsStartedAt = Date.now();

// Keep the class page lightweight: module metadata is enough for the initial
// view. Full posts and signed image URLs are loaded only when a teacher edits
// a module (see getTeacherModulePosts in teacherModuleActions.ts).
const availableTeacherModulesData = (availableTeacherModules ?? []).map((module: any) => ({
  id: module.id,
  module_id: module.id,
  title: module.title,
  description: module.description ?? "",
  visibility_scope: module.visibility_scope,
  posts: [],
}));

const teacherModulesData = (teacherModuleAssignments ?? [])
  .filter((row: any) => row.teacher_modules?.status === "published")
  .map((row: any) => ({
    id: row.id,
    module_id: row.module_id,
    school_id: row.school_id,
    assigned_by: row.assigned_by,
    is_active: row.is_active,
    scheduled_start_at: row.scheduled_start_at,
    scheduled_end_at: row.scheduled_end_at,
    title: row.teacher_modules.title,
    description: row.teacher_modules.description,
    introTitle: row.teacher_modules.intro_title,
    introText: row.teacher_modules.intro_text,
    visibility_scope: row.teacher_modules.visibility_scope,
    canManage: Boolean(user?.id && row.teacher_modules.created_by === user.id),
    title_card_enabled: row.teacher_modules.title_card_enabled !== false,
    cover_image_url: null,
    posts: [],
  }));

console.info("[class-page-timing] module-metadata", Date.now() - moduleAssetsStartedAt, "ms");

  const students = (roster ?? [])
    .filter((row: any) => row.role === "student")
    .map((row: any) => ({
      user_id: row.user_id,
      display_name: row.user_profiles?.display_name ?? null,
      username: row.user_profiles?.username ?? null,
      avatar_seed: row.user_profiles?.avatar_seed ?? null,
    }));

  const activeAssignments = (assignments ?? []) as any[];
  const activeAssignment = activeAssignments[0] ?? null;
  const reportingUnlocked = !activeAssignment?.show_reports_at_end || Boolean(activeAssignment?.scheduled_end_at && new Date(activeAssignment.scheduled_end_at).getTime() <= Date.now());

  const classImageUrl = await classImagePromise;
  const schoolImageUrl = school?.school_image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/school-images/${school.school_image_path}`
    : null;

  const heroImageUrl = classImageUrl ?? schoolImageUrl;

  const heroPositionX =
    classImageUrl
      ? instance.class_image_position_x ?? 50
      : school?.school_image_position_x ?? 50;

  const heroPositionY =
    classImageUrl
      ? instance.class_image_position_y ?? 50
      : school?.school_image_position_y ?? 50;

  const heroZoom =
    classImageUrl
      ? instance.class_image_zoom ?? 1
      : school?.school_image_zoom ?? 1;

  console.info("[class-page-timing] total-server-render", Date.now() - pageStartedAt, "ms");

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 lg:px-8">
        <a
          href="/classes"
          className="inline-flex items-center text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Meine Klassen
        </a>

        <ClassImageWorkspace
          classId={classId}
          className={instance.name}
          gradeLevel={instance.grade_level}
          schoolYear={instance.school_year}
          heroImageUrl={heroImageUrl}
          heroPositionX={heroPositionX}
          heroPositionY={heroPositionY}
          heroZoom={heroZoom}
          classImagePath={instance.class_image_path}
          classImageUrl={classImageUrl}
          classImagePositionX={instance.class_image_position_x ?? 50}
          classImagePositionY={instance.class_image_position_y ?? 50}
          classImageZoom={instance.class_image_zoom ?? 1}
          canEditClassImage={canEditClassImage}
        />

        <CollapsiblePanel
          title="1. Module & Szenarien"
          description="Lernmodule auswählen, eigene Inhalte erstellen und den Unterricht planen."
        >
          <ClassModuleLibrary
            classId={classId}
            schoolId={instance.school_id}
            teacherModules={teacherModulesData}
            availableTeacherModules={availableTeacherModulesData}
            scenarios={(scenarios ?? []).map((scenario: any) => ({
              id: scenario.id,
              title: scenario.title,
              description: scenario.description ?? null,
              cover_image_url: scenario.cover_image_url ?? null,
              age_rating: scenario.age_rating ?? "Alle Altersgruppen",
            }))}
            assignments={activeAssignments.map((item: any) => ({
              scenario_id: item.scenario_id,
              is_active: item.is_active !== false,
              scheduled_start_at: item.scheduled_start_at,
              scheduled_end_at: item.scheduled_end_at,
              show_reports_at_end: Boolean(item.show_reports_at_end),
              title: item.scenarios?.title ?? null,
            }))}
            moduleStatus="Noch nicht begonnen"
            moduleReport=""
          />
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Schüler:innen"
          description={students.length + " aktive Schüler:innen in dieser Klasse."}
        >
          <div className="p-4 sm:p-5">
            <StudentRoster
              classId={classId}
              initialStudents={students}
              reportingUnlocked={reportingUnlocked}
            />
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Insights & Lernreporting"
          description="Kompetenzentwicklung, Missionsfortschritt und Lernhürden."
        >
          <Suspense fallback={<div className="px-5 py-6 text-sm text-slate-500">Lernfortschritt und Klassen-Insights werden geladen …</div>}>
            <ClassDashboardInsights
              classId={classId}
              students={students}
              activeAssignmentTitle={activeAssignment?.scenarios?.title ?? null}
            />
          </Suspense>
        </CollapsiblePanel>



      </div>
    </main>
  );
}

