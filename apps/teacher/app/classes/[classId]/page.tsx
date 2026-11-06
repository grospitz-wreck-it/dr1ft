import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ClassModuleLibrary } from "./ClassModuleLibrary";
import { StudentRoster } from "./StudentRoster";
import { ClassDashboardInsights } from "./ClassDashboardInsights";
import { CollapsiblePanel } from "./CollapsiblePanel";
import ClassImageWorkspace from "./ClassImageWorkspace";

async function timed<T>(timings: { name: string; ms: number }[], name: string, task: PromiseLike<T>): Promise<T> {
  const start = Date.now();
  const result = await task;
  const error = (result as any)?.error;
  const ms = Date.now() - start;
  timings.push({ name, ms });
  console.info("[class-overview-timing]", { name, ms, code: error?.code ?? null, message: error?.message ?? null });
  return result;
}

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: { classId: string };
  searchParams?: { debug?: string };
}) {
  const pageStartedAt = Date.now();
  const timings: { name: string; ms: number }[] = [];
  const supabase = supabaseServerClient();
  const { classId } = params;

  const {
    data: instance,
  } = await timed(timings, "class-instance", supabase
    .from("class_instances")
    .select(
      "id,name,access_code,is_active,status,grade_level,school_year,school_id,class_visual_id",
    )
    .eq("id", classId)
    .maybeSingle());

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

  const [
    { data: roster },
    { data: scenarios },
    { data: assignments },
    { data: school },
    { data: userResult },
  ] = await Promise.all([
    timed(timings, "roster", supabase
      .from("class_instance_memberships")
      .select("user_id,role,left_at,user_profiles(display_name,username,avatar_seed)")
      .eq("class_instance_id", classId)
      .is("left_at", null)),

    timed(timings, "scenarios", supabase
      .from("scenarios")
      .select("id,title,description,cover_image_url,age_rating")
      .order("title")),

    timed(timings, "scenario-assignments", supabase
      .from("class_instance_scenario_assignments")
      .select("scenario_id,pacing_mode,scheduled_start_at,scheduled_end_at,show_reports_at_end,archived_at,is_active,scenarios(title)")
      .eq("class_instance_id", classId)
      .is("archived_at", null)),

    instance.school_id
      ? timed(timings, "school", supabase
          .from("schools")
          .select(
            "id,name,region,school_image_path,school_image_position_x,school_image_position_y,school_image_zoom",
          )
          .eq("id", instance.school_id)
          .maybeSingle())
      : Promise.resolve({ data: null }),

    timed(timings, "auth-user", supabase.auth.getUser()),
  ]);

  const user = userResult.user;


  const [moduleLibraryResult, schoolMembershipResult, teacherMembershipResult] = await Promise.all([
    user
      ? timed(timings, "teacher-module-library", supabase.rpc("get_teacher_module_library_for_class_v1", {
          p_class_id: classId,
        }))
      : Promise.resolve({ data: { assigned: [], available: [] }, error: null }),
    user && instance.school_id
      ? timed(timings, "school-membership", supabase.from("school_memberships").select("role").eq("school_id", instance.school_id)
          .eq("user_id", user.id).eq("active", true).maybeSingle())
      : Promise.resolve({ data: null, error: null }),
    user
      ? timed(timings, "teacher-subscription", supabase.from("teacher_class_subscriptions").select("id")
          .eq("class_instance_id", classId).eq("teacher_user_id", user.id).eq("is_active", true).maybeSingle())
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (moduleLibraryResult.error) {
    console.warn("[class-overview] teacher module library unavailable", {
      classId, code: moduleLibraryResult.error.code, message: moduleLibraryResult.error.message,
    });
  }
  const moduleLibrary = (moduleLibraryResult.data ?? { assigned: [], available: [] }) as {
    assigned: any[];
    available: any[];
  };

  const activeSchoolRole = schoolMembershipResult.data?.role ?? null;
  const isSchoolAdmin = activeSchoolRole === "school_admin" || activeSchoolRole === "school_lead";
  const { data: canViewIndividualReports } = user
    ? await supabase.rpc("can_view_class_individual_reports", { p_class_id: classId })
    : { data: false };

  const [{ data: canManageClassWorkspace }, { data: canManageClassImage }, { data: canManageStudents }] = user
    ? await Promise.all([
        supabase.rpc("is_teacher_of_class_instance", { target_instance_id: classId }),
        supabase.rpc("can_manage_class_image", { object_name: `${classId}/class-image` }),
        supabase.rpc("can_manage_student_accounts", { p_class_id: classId }),
      ])
    : [{ data: false }, { data: false }, { data: false }];

  const hasActiveTeachingSubscription = Boolean(teacherMembershipResult.data);
  const mayUseTeacherModules =
    Boolean(canManageClassWorkspace) &&
    (activeSchoolRole !== "teacher" || hasActiveTeachingSubscription);

  const availableTeacherModules = mayUseTeacherModules ? moduleLibrary.available : [];
  const teacherModules = mayUseTeacherModules ? moduleLibrary.assigned : [];
  const canEditClassImage = Boolean(canManageClassImage);

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

  const schoolImageUrl = school?.school_image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/school-images/${school.school_image_path}`
    : null;

  const heroImageUrl = instance.class_visual_id ? null : schoolImageUrl;
  const heroPositionX = school?.school_image_position_x ?? 50;
  const heroPositionY = school?.school_image_position_y ?? 50;
  const heroZoom = school?.school_image_zoom ?? 1;


  const totalPageDataMs = Date.now() - pageStartedAt;
  timings.push({ name: "page-data-total", ms: totalPageDataMs });
  console.info("[class-overview-timing]", { name: "page-data-total", ms: totalPageDataMs, students: students.length, scenarios: scenarios?.length ?? 0, assignments: assignments?.length ?? 0 });

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 lg:px-8">
        <a
          href="/classes"
          className="inline-flex items-center text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Meine Klassen
        </a>

        {searchParams?.debug === "timing" && (
          <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>Diagnose: Ladezeiten der Klassenübersicht</strong>
              <span className="font-mono font-semibold">{totalPageDataMs} ms Datenaufbau</span>
            </div>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {timings.map((item) => (
                <li key={item.name} className="flex justify-between gap-3 border-b border-amber-200 py-1">
                  <span>{item.name}</span><span className="font-mono tabular-nums">{item.ms} ms</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-600">Nur für berechtigte Lehrkräfte und Schuladmins sichtbar. Messung der serverseitigen Datenabfragen; Browser- und Netzwerkzeit ist nicht enthalten.</p>
          </section>
        )}

        <ClassImageWorkspace
          classId={classId}
          className={instance.name}
          gradeLevel={instance.grade_level}
          schoolYear={instance.school_year}
          heroImageUrl={heroImageUrl}
          heroPositionX={heroPositionX}
          heroPositionY={heroPositionY}
          heroZoom={heroZoom}
          classVisualId={instance.class_visual_id ?? null}
          canEditClassImage={canEditClassImage}
        />

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <Metric label="Schüler:innen" value={students.length} icon="users" tone="blue" />
          <Metric label="Aktives Szenario" value={activeAssignment?.scenarios?.title ?? "Keines"} icon="target" tone="violet" />
        </section>

        <CollapsiblePanel title="1. Module & Szenarien" description="Lernmodule auswählen, eigene Inhalte erstellen und den Unterricht planen.">
        <ClassModuleLibrary
          classId={classId}
          schoolId={instance.school_id ?? null}
          teacherModules={teacherModules}
          availableTeacherModules={availableTeacherModules}
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

        <CollapsiblePanel title="2. Schüler:innen" description={students.length + " aktive Schüler:innen in dieser Klasse."}>
        <div className="mt-0">
          <StudentRoster
            classId={classId}
            initialStudents={students}
            reportingUnlocked={reportingUnlocked}
            canViewIndividualReports={canViewIndividualReports}
            canManageStudents={Boolean(canManageStudents)}
          />
        </div>
        </CollapsiblePanel>

        <CollapsiblePanel title="3. Insights & Lernreporting" description="Kompetenzentwicklung, Missionsfortschritt und Lernhürden – erst auf ausdrücklichen Abruf.">
          <ClassDashboardInsights
            classId={classId}
            students={students}
            activeAssignmentTitle={activeAssignment?.scenarios?.title ?? null}
          />
        </CollapsiblePanel>

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
