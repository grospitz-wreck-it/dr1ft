import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ClassModuleLibrary } from "./ClassModuleLibrary";
import { StudentRoster } from "./StudentRoster";
import { ClassLearningInsights } from "./ClassLearningInsights";
import ClassImageWorkspace from "./ClassImageWorkspace";

export default async function ClassDetailPage({
  params,
}: {
  params: { classId: string };
}) {
  const supabase = supabaseServerClient();
  const { classId } = params;

  const {
    data: instance,
  } = await supabase
    .from("class_instances")
    .select(
      "id,name,access_code,is_active,status,grade_level,school_year,school_id,class_image_path,class_image_position_x,class_image_position_y,class_image_zoom",
    )
    .eq("id", classId)
    .maybeSingle();

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
    supabase
      .from("class_instance_memberships")
      .select(
        "user_id,role,left_at,user_profiles(display_name,username,avatar_seed)",
      )
      .eq("class_instance_id", classId)
      .is("left_at", null),

    supabase
      .from("scenarios")
      .select("id,title,description,cover_image_url,age_rating")
      .order("title"),

    supabase
      .from("class_instance_scenario_assignments")
      .select("scenario_id,pacing_mode,scheduled_start_at,scheduled_end_at,show_reports_at_end,archived_at,scenarios(title)")
      .eq("class_instance_id", classId)
      .is("archived_at", null),

    instance.school_id
      ? supabase
          .from("schools")
          .select(
            "id,name,region,school_image_path,school_image_position_x,school_image_position_y,school_image_zoom",
          )
          .eq("id", instance.school_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    supabase.auth.getUser(),
  ]);

  const user = userResult.user;

  const teacherMembership = user
    ? await supabase
        .from("class_instance_memberships")
        .select("id")
        .eq("class_instance_id", classId)
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .is("left_at", null)
        .maybeSingle()
    : { data: null };

  const canEditClassImage = Boolean(teacherMembership.data);

  let classImageUrl: string | null = null;

  if (canEditClassImage && instance.class_image_path) {
    const { data } = await supabase.storage
      .from("class-images")
      .createSignedUrl(instance.class_image_path, 60 * 60);

    classImageUrl = data?.signedUrl ?? null;
  }

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

  const { data: session } = await supabase.auth.getSession();

  let dashboard: any = {};

  if (session.session?.access_token) {
    const dashboardRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ classId }),
        cache: "no-store",
      },
    );

    dashboard = await dashboardRes.json().catch(() => ({}));
  }

  const competencyRows = dashboard.studentCompetencyProgress ?? [];
  const missionRows = dashboard.studentMissionProgress ?? [];
  const learningEvidenceRows = dashboard.studentLearningEvidence ?? [];
  const learningEvidenceTotals = learningEvidenceRows.reduce((totals: { responses: number; assessed: number; successful: number; notYet: number }, row: any) => ({ responses: totals.responses + Number(row.challenge_responses_submitted ?? 0), assessed: totals.assessed + Number(row.assessed_requirements ?? 0), successful: totals.successful + Number(row.successful_requirements ?? 0), notYet: totals.notYet + Number(row.not_yet_requirements ?? 0) }), { responses: 0, assessed: 0, successful: 0, notYet: 0 });

  const studentRows = new Map<string, { name: string; competencies: Record<string, number>; completed: number; total: number }>();
  for (const row of competencyRows) {
    if (!row.user_id) continue;
    if (!studentRows.has(row.user_id)) {
      studentRows.set(row.user_id, {
        name: row.display_name ?? row.username ?? "Schüler:in",
        competencies: {},
        completed: 0,
        total: 0,
      });
    }
    if (row.competency_title && row.level != null) {
      studentRows.get(row.user_id)!.competencies[row.competency_title] = Number(row.level);
    }
  }
  for (const row of missionRows) {
    if (!row.user_id) continue;
    if (!studentRows.has(row.user_id)) {
      studentRows.set(row.user_id, {
        name: row.display_name ?? row.username ?? "Schüler:in",
        competencies: {},
        completed: 0,
        total: 0,
      });
    }
    const student = studentRows.get(row.user_id)!;
    student.completed += Number(row.missions_completed ?? 0);
    student.total += Number(row.missions_total ?? 0);
  }
  const allCompetencyTitles: string[] = Array.from(
    new Set<string>(
      competencyRows
        .map((row: any) => row.competency_title)
        .filter((title: unknown): title is string => typeof title === "string" && title.trim().length > 0),
    ),
  );
  const missionBottlenecks = (dashboard.missionBottlenecks ?? []).slice(0, 5);
  const competencyOverview = (dashboard.competencyOverview ?? []).filter(
    (row: any) => row.competency_id != null && Number(row.student_count ?? 0) > 0,
  );

  const levels = competencyRows
    .map((row: any) => Number(row.level ?? 0))
    .filter((level: number) => level > 0);

  const average = levels.length
    ? levels.reduce((a: number, b: number) => a + b, 0) / levels.length
    : null;

  const completed = missionRows.reduce(
    (sum: number, row: any) => sum + Number(row.missions_completed ?? 0),
    0,
  );

  const total = missionRows.reduce(
    (sum: number, row: any) => sum + Number(row.missions_total ?? 0),
    0,
  );

  // The existing, class-scoped dashboard RPC reports mission progress for
  // the currently assigned module. Do not infer historical progress for
  // modules that are not assigned.
  const studentsWithMissionData = missionRows.filter(
    (row: any) => Number(row.missions_total ?? 0) > 0,
  );
  const studentsWithCompletedModule = studentsWithMissionData.filter(
    (row: any) => Number(row.missions_completed ?? 0) >= Number(row.missions_total ?? 0),
  ).length;
  const activeModuleStatus =
    !activeAssignment || total === 0
      ? "Noch nicht begonnen"
      : completed >= total
        ? "Abgeschlossen"
        : completed > 0
          ? "In Bearbeitung"
          : "Noch nicht begonnen";
  const activeModuleReport = total > 0
    ? `${completed} von ${total} Mission-Abschlüssen über alle Schüler:innen · ${studentsWithCompletedModule} von ${studentsWithMissionData.length} Schüler:innen haben alle Missionen abgeschlossen`
    : "Noch keine auswertbaren Missionsfortschritte vorhanden.";

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

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Schüler:innen" value={students.length} icon="users" tone="blue" />
            <Metric
              label="Aktives Modul"
              value={activeAssignment?.scenarios?.title ?? "Keines"}
              icon="target"
              tone="violet"
            />
            <Metric
              label="Ø Kompetenz"
              value={average === null ? "—" : `${average.toFixed(1)} / 5`}
              icon="chart"
              tone="cyan"
            />
            <Metric
              label="Missionen"
              value={total ? `${completed}/${total}` : "—"}
              icon="check"
              tone="purple"
            />
        </section>

        <ClassModuleLibrary
          classId={classId}
          scenarios={(scenarios ?? []).map((scenario: any) => ({
            id: scenario.id,
            title: scenario.title,
            description: scenario.description ?? null,
            cover_image_url: scenario.cover_image_url ?? null,
            age_rating: scenario.age_rating ?? "Alle Altersgruppen",
          }))}
          assignments={activeAssignments.map((item: any) => ({
            scenario_id: item.scenario_id,
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

        <ClassLearningInsights
          students={students}
          studentRows={Object.fromEntries(studentRows.entries())}
          competencyTitles={allCompetencyTitles}
          evidence={learningEvidenceTotals}
          competencies={competencyOverview.map((row: any) => ({
            competency_id: String(row.competency_id),
            competency_title: String(row.competency_title ?? "Kompetenz"),
            avg_level: Number(row.avg_level ?? 0),
            student_count: Number(row.student_count ?? 0),
          }))}
          bottlenecks={missionBottlenecks.map((row: any) => ({
            mission_id: String(row.mission_id),
            mission_title: String(row.mission_title ?? "Mission"),
            completion_rate: Number(row.completion_rate ?? 0),
            completed_count: Number(row.completed_count ?? 0),
            student_count: Number(row.student_count ?? 0),
          }))}
          average={average}
          completed={completed}
          total={total}
          classId={classId}
        />


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
