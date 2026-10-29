import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ScenarioToggle } from "./ScenarioToggle";
import { StudentRoster } from "./StudentRoster";
import { updateClassDetails } from "../actions";
import ClassImageWorkspace from "./ClassImageWorkspace";
import { ClassStatusSelect } from "./ClassStatusSelect";

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
      .select("id,title,age_rating")
      .order("title"),

    supabase
      .from("class_instance_scenario_assignments")
      .select("scenario_id,pacing_mode,scheduled_start_at,scheduled_end_at,show_reports_at_end,scenarios(title)")
      .eq("class_instance_id", classId),

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

  const activeAssignment = (assignments ?? [])[0] as any;
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

  const status =
    instance.status ??
    (instance.is_active ? "active" : "paused");

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

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <Metric label="Schüler:innen" value={students.length} />
            <Metric
              label="Aktives Modul"
              value={activeAssignment?.scenarios?.title ?? "Keines"}
            />
            <Metric
              label="Ø Kompetenz"
              value={average === null ? "—" : `${average.toFixed(1)} / 5`}
            />
            <Metric
              label="Missionen"
              value={total ? `${completed}/${total}` : "—"}
            />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                  Klassenprofil
                </p>

                <h2 className="mt-1.5 text-lg font-semibold text-slate-950">
                  Klasse bearbeiten
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Name, Jahrgang und Schuljahr können jederzeit angepasst werden.
                </p>
              </div>

              <div className="shrink-0">
                <p className="mb-1.5 text-xs font-medium text-slate-400">
                  Status
                </p>
                <ClassStatusSelect
                  classId={classId}
                  status={
                    status === "paused" || status === "ended"
                      ? status
                      : "active"
                  }
                />
              </div>
            </div>
          </div>

          <form
            action={updateClassDetails.bind(null, classId)}
            className="grid gap-4 p-6 sm:grid-cols-3"
          >
            <label className="text-sm font-medium text-slate-700">
              Klassenname
              <input
                name="name"
                defaultValue={instance.name}
                required
                className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Jahrgang
              <input
                name="gradeLevel"
                type="number"
                min={1}
                max={13}
                defaultValue={instance.grade_level ?? ""}
                placeholder="Jahrgang"
                className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Schuljahr
              <input
                name="schoolYear"
                defaultValue={instance.school_year}
                required
                className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm"
              />
            </label>

            <button className="sm:col-span-3 justify-self-start rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2">
              Änderungen speichern
            </button>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Lerninhalt
            </p>

            <h2 className="mt-1.5 text-lg font-semibold text-slate-950">
              Modul für diese Klasse
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Immer genau ein Modul aktiv. Vorhandene Lernfortschritte bleiben
              beim Wechsel erhalten.
            </p>
          </div>

          <ul className="divide-y divide-border">
            {(scenarios ?? []).map((scenario: any) => (
              <ScenarioToggle
                key={scenario.id}
                classId={classId}
                scenarioId={scenario.id}
                title={scenario.title}
                ageRating={scenario.age_rating}
                initiallyAssigned={
                  activeAssignment?.scenario_id === scenario.id
                }
                initialPacingMode={
                  activeAssignment?.pacing_mode ?? "compact"
                }
                moduleStatus={activeAssignment?.scenario_id === scenario.id ? activeModuleStatus : "Nicht zugewiesen"}
                moduleReport={activeAssignment?.scenario_id === scenario.id ? activeModuleReport : undefined}
                scheduledStartAt={activeAssignment?.scenario_id === scenario.id ? activeAssignment.scheduled_start_at : null}
                scheduledEndAt={activeAssignment?.scenario_id === scenario.id ? activeAssignment.scheduled_end_at : null}
                showReportsAtEnd={activeAssignment?.scenario_id === scenario.id ? activeAssignment.show_reports_at_end : false}
              />
            ))}
          </ul>
        </section>

        <div className="mt-6">
          <StudentRoster
            classId={classId}
            initialStudents={students}
            reportingUnlocked={reportingUnlocked}
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              DR1FT Insights
            </p>
            <h2 className="mt-1.5 text-lg font-semibold text-slate-950">
              Lernreporting der Klasse
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Kompetenzentwicklung, Missionsfortschritt und mögliche Lernhürden dieser Klasseninstanz. Nur für berechtigte Lehrkräfte sichtbar.
            </p>
          </div>

          <div className="grid gap-px bg-border lg:grid-cols-2">
            <Panel title="Challenge- und Lernnachweise">
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                <div className="bg-white p-4"><p className="text-xs text-slate-400">Antworten abgegeben</p><p className="mt-2 text-xl font-semibold">{learningEvidenceTotals.responses}</p></div>
                <div className="bg-white p-4"><p className="text-xs text-slate-400">Geprüfte Anforderungen</p><p className="mt-2 text-xl font-semibold">{learningEvidenceTotals.assessed > 0 ? learningEvidenceTotals.assessed : "—"}</p></div>
                <div className="bg-white p-4"><p className="text-xs text-slate-400">Erfolgreich erfüllt</p><p className="mt-2 text-xl font-semibold">{learningEvidenceTotals.assessed > 0 ? learningEvidenceTotals.successful : "—"}</p></div>
                <div className="bg-white p-4"><p className="text-xs text-slate-400">Noch nicht erfüllt</p><p className="mt-2 text-xl font-semibold">{learningEvidenceTotals.assessed > 0 ? learningEvidenceTotals.notYet : "—"}</p></div>
              </div>
              <p className="bg-white px-5 py-3 text-xs leading-relaxed text-slate-500">Abgegebene Antworten zählen als Bearbeitung, nicht automatisch als fachlicher Erfolg. Geprüfte Anforderungen beruhen auf validierten Bewertungen. {learningEvidenceTotals.assessed === 0 ? "Für diese Klasse liegen aktuell keine validierten Bewertungsereignisse vor; deshalb werden Erfolgs- und Misserfolgswerte als nicht verfügbar angezeigt." : ""}</p>
            </Panel>
            <Panel title="Kompetenzentwicklung · Klassendurchschnitt">
              {competencyOverview.length ? (
                competencyOverview.map((row: any) => (
                  <div key={row.competency_id} className="bg-white px-5 py-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">{row.competency_title}</span>
                      <span className="shrink-0 text-slate-500">Ø {Number(row.avg_level ?? 0).toFixed(1)} / 5</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(0, Math.min(100, Number(row.avg_level ?? 0) / 5 * 100))}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{row.student_count ?? 0} Schüler:innen mit Daten</p>
                  </div>
                ))
              ) : (
                <div className="bg-white p-5 text-sm text-slate-400">Noch keine Kompetenzdaten vorhanden.</div>
              )}
            </Panel>

            <Panel title="Wo gibt es Schwierigkeiten?">
              <p className="bg-white px-5 pt-4 text-xs leading-5 text-slate-500">
                Missionen mit niedriger Abschlussquote sind mögliche Ansatzpunkte für Wiederholung oder gemeinsame Reflexion.
              </p>
              {missionBottlenecks.length ? (
                missionBottlenecks.map((row: any) => {
                  const rate = Math.max(0, Math.min(100, Number(row.completion_rate ?? 0) * 100));
                  const tone = rate < 40 ? "bg-rose-500" : rate < 70 ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <div key={row.mission_id} className="bg-white px-5 py-4">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-800">{row.mission_title}</span>
                        <span className="shrink-0 font-semibold text-slate-600">{Math.round(rate)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${tone}`} style={{ width: `${rate}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{row.completed_count ?? "—"} von {row.student_count ?? "—"} Schüler:innen abgeschlossen</p>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white px-5 py-4 text-sm text-slate-400">Noch keine auswertbaren Missionsabschlüsse.</div>
              )}
            </Panel>
          </div>

          <div className="border-t border-border">
            <div className="px-6 py-5">
              <h3 className="text-sm font-semibold text-slate-900">Fortschritt pro Schüler:in</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Zeigt gespeicherte Kompetenz-Level und den Missionsfortschritt. Einzelne Klicks oder Likes werden nicht als Kompetenzgewinn gewertet.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Schüler:in</th>
                    {allCompetencyTitles.map((title) => <th key={title} className="px-3 py-3">{title}</th>)}
                    <th className="px-4 py-3">Missionen</th>
                    <th className="px-5 py-3">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((student: any) => {
                    const row = studentRows.get(student.user_id);
                    return (
                      <tr key={student.user_id} className="bg-white hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-medium text-slate-800">{student.display_name || student.username || "Schüler:in"}</td>
                        {allCompetencyTitles.map((title) => <td key={title} className="px-3 py-3 text-slate-500">{row?.competencies[title] ?? "—"}{row?.competencies[title] != null ? " / 5" : ""}</td>)}
                        <td className="px-4 py-3 text-slate-600">{row && row.total > 0 ? `${row.completed}/${row.total}` : "—"}</td>
                        <td className="px-5 py-3"><a href={`/classes/${classId}/reports/${student.user_id}`} className="inline-flex items-center rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50">Report öffnen ↗</a></td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr><td colSpan={allCompetencyTitles.length + 3} className="px-5 py-8 text-center text-slate-400">Noch keine Schüler:innen in dieser Klasseninstanz.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-slate-50/70 px-5 py-3 text-xs leading-5 text-slate-500">
              Die Werte basieren ausschließlich auf Daten, die für diese Klasseninstanz zurückgegeben werden. „—“ bedeutet, dass aktuell kein Messwert vorliegt.
            </div>
          </div>
        </section>


      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-border bg-white px-5 py-4">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
