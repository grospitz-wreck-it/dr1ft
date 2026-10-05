import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ScenarioToggle } from "./ScenarioToggle";
import { CopyAccessCodeButton } from "./CopyAccessCodeButton";
import { StudentRoster } from "./StudentRoster";
import { updateClassDetails } from "../actions";
import ClassImageEditor from "./ClassImageEditor";
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
      .select("scenario_id,pacing_mode,scenarios(title)")
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

        <section className="group relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: `${heroPositionX}% ${heroPositionY}%`,
                transform: `scale(${heroZoom})`,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(99,102,241,.35),transparent_38%),radial-gradient(circle_at_15%_85%,rgba(168,85,247,.22),transparent_34%)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/20" />

          <div className="relative min-h-[300px] p-6 sm:p-8">
            <div className="flex min-h-[250px] flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                    DR1FT Teacher
                  </p>

                  {classImageUrl && (
                    <p className="mt-2 text-xs text-white/55">
                      Klassenbild
                    </p>
                  )}

                  {!classImageUrl && schoolImageUrl && (
                    <p className="mt-2 text-xs text-white/55">
                      Schulbild
                    </p>
                  )}
                </div>

                <ClassStatusSelect
                  classId={classId}
                  status={
                    status === "paused" || status === "ended"
                      ? status
                      : "active"
                  }
                />
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  {instance.name}
                </h1>

                <p className="mt-2 text-sm text-white/55">
                  {instance.grade_level
                    ? `Jahrgang ${instance.grade_level}`
                    : "Jahrgang —"}{" "}
                  · Schuljahr {instance.school_year}
                </p>
              </div>
            </div>
          </div>
        </section>

        {canEditClassImage && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
            <div className="border-b border-border px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Klassenbild
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Klassenbild bearbeiten
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Bild, Ausschnitt und Zoom für den Klassen-Header festlegen.
              </p>
            </div>

            <div className="p-6">
              <ClassImageEditor
                classId={classId}
                imagePath={instance.class_image_path}
                imageUrl={classImageUrl}
                positionX={instance.class_image_position_x ?? 50}
                positionY={instance.class_image_position_y ?? 50}
                zoom={instance.class_image_zoom ?? 1}
              />
            </div>
          </section>
        )}

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

            <button className="sm:col-span-3 justify-self-start rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
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
              />
            ))}
          </ul>
        </section>

        <div className="mt-6">
          <StudentRoster
            classId={classId}
            initialStudents={students}
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              DR1FT Insights
            </p>

            <h2 className="mt-1.5 text-lg font-semibold text-slate-950">
              Klassenanalyse
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kompetenzen und Missionen – nur für die Lehrkraft dieser Klasse.
            </p>
          </div>

          <div className="grid gap-px bg-border lg:grid-cols-2">
            <Panel title="Kompetenzentwicklung">
              {dashboard.competencyOverview?.length ? (
                dashboard.competencyOverview.map((row: any) => (
                  <div
                    key={row.competency_id}
                    className="flex justify-between bg-white px-5 py-3 text-sm"
                  >
                    <span>{row.competency_title}</span>
                    <span className="text-slate-500">
                      Ø {row.avg_level} / 5
                    </span>
                  </div>
                ))
              ) : (
                <div className="bg-white p-5 text-sm text-slate-400">
                  Noch keine Daten.
                </div>
              )}
            </Panel>

            <Panel title="Wo gibt es Schwierigkeiten">
              {dashboard.missionBottlenecks?.slice(0, 5).length ? (
                dashboard.missionBottlenecks
                  .slice(0, 5)
                  .map((row: any) => (
                    <div
                      key={row.mission_id}
                      className="flex justify-between bg-white px-5 py-3 text-sm"
                    >
                      <span>{row.mission_title}</span>
                      <span>
                        {Math.round(
                          Number(row.completion_rate ?? 0) * 100,
                        )}{" "}
                        %
                      </span>
                    </div>
                  ))
              ) : (
                <div className="bg-white p-5 text-sm text-slate-400">
                  Noch keine Daten.
                </div>
              )}
            </Panel>
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Schüler-Zugangscode
            </p>

            <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.18em]">
              {instance.access_code}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Mit diesem Code können Schüler:innen der Klasse beitreten.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyAccessCodeButton code={instance.access_code} />

            <a
              href={`/grades/lookup?classId=${classId}`}
              className="rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-canvas"
            >
              Jahrgang öffnen
            </a>
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
