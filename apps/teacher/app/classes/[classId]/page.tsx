import { Suspense } from "react";\nimport { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ClassModuleLibrary } from "./ClassModuleLibrary";
import { StudentRoster } from "./StudentRoster";
import { ClassDashboardInsights } from "./ClassDashboardInsights";
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

  const {
    data: instance,
  } = await supabase
    .from("class_instances")
    .select(
      "id,name,access_code,is_active,status,grade_level,school_year,school_id,class_image_path,class_image_position_x,class_image_position_y,class_image_zoom",
    )
    .eq("id", classId)
    .maybeSingle();

  console.info("[class-page-timing] instance", Date.now() - instanceStartedAt, "ms");

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
    { data: userResult },
    { data: session },
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
    timed("auth-user", supabase.auth.getUser()),
    timed("auth-session", supabase.auth.getSession()),
  ] as const);
  console.info("[class-page-timing] parallel-queries", Date.now() - parallelQueriesStartedAt, "ms");
  const user = userResult.user;
  const accessToken = session.session?.access_token;

  const membershipStartedAt = Date.now();
  const [teacherMembership, schoolMembership] = await Promise.all([
    user
      ? supabase.from("class_instance_memberships").select("id")
          .eq("class_instance_id", classId).eq("user_id", user.id)
          .eq("role", "teacher").is("left_at", null).maybeSingle()
      : Promise.resolve({ data: null }),
    user && instance.school_id
      ? supabase.from("school_memberships").select("role")
          .eq("school_id", instance.school_id).eq("user_id", user.id)
          .eq("active", true).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  console.info("[class-page-timing] memberships", Date.now() - membershipStartedAt, "ms");

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

  const classImageUrl = await classImagePromise;\n  const schoolImageUrl = school?.school_image_path
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

        <Suspense fallback={<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="col-span-full rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Lernfortschritt und Klassen-Insights werden geladen …</div></div>}>
          <ClassDashboardInsights
            classId={classId}
            students={students}
            activeAssignmentTitle={activeAssignment?.scenarios?.title ?? null}
          />
        </Suspense>

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
          moduleStatus={activeModuleStatus as "Abgeschlossen" | "In Bearbeitung" | "Noch nicht begonnen"}
          moduleReport={activeModuleReport}
        />

        <div className="mt-6">
          <StudentRoster
            classId={classId}
            initialStudents={students}
            reportingUnlocked={reportingUnlocked}
          />
        </div>



      </div>
    </main>
  );
}


function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: "users" | "target" | "chart" | "check";
  tone: "blue" | "violet" | "cyan" | "purple";
}) {
  const tones = {
    blue: "bg-sky-100 text-sky-600",
    violet: "bg-violet-100 text-violet-600",
    cyan: "bg-cyan-100 text-cyan-600",
    purple: "bg-fuchsia-100 text-fuchsia-600",
  };
  const glyphs = { users: "♟", target: "◎", chart: "▥", check: "✓" };
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-semibold " + tones[tone]}>{glyphs[icon]}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-950">{value}</p>
      </div>
    </div>
  );
}
