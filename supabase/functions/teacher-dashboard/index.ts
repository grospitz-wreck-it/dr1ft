// ============================================================
// Edge Function: teacher-dashboard
//
// Ruft ausschließlich SECURITY DEFINER RPC-Funktionen auf (siehe
// 0018_teacher_dashboard_functions.sql und die Learning-Results-RPC-Migration)
// statt Views direkt abzufragen —
// die Berechtigungsprüfung (is_teacher_of_class/is_teacher_of_grade)
// sitzt jetzt INNERHALB jeder Funktion, nicht nur hier in der Edge
// Function. Doppelte Absicherung: fällt die Prüfung hier durch einen
// Bug aus, blockiert die DB-Funktion trotzdem.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401,
    });
  }

  const { classId, gradeQuery } = await req.json();
  if (!classId && !gradeQuery) {
    return new Response(JSON.stringify({ error: "classId oder gradeQuery fehlt" }), {
      status: 400,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  function fail(message: string, status = 403) {
    return new Response(JSON.stringify({ error: message }), { status });
  }

  // ---------- Jahrgangs-Modus ----------
  if (gradeQuery) {
    const { schoolId, gradeLevel } = gradeQuery;

    const [competency, mission, classes] = await Promise.all([
      supabase.rpc("get_grade_competency_overview", { p_school_id: schoolId, p_grade_level: gradeLevel }),
      supabase.rpc("get_grade_mission_overview", { p_school_id: schoolId, p_grade_level: gradeLevel }),
      supabase.rpc("get_grade_class_overview", { p_school_id: schoolId, p_grade_level: gradeLevel }),
    ]);

    if (competency.error) return fail(competency.error.message);

    return new Response(
      JSON.stringify({
        competencyOverview: competency.data ?? [],
        missionOverview: mission.data ?? [],
        classOverview: classes.data?.[0] ?? null,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ---------- Klassen-Modus ----------
  // Named student-level data is reserved for school admins, school leadership
  // and platform admins. Teachers receive the aggregate metrics only.
  const { data: classScope } = await supabase
    .from("class_instances")
    .select("school_id")
    .eq("id", classId)
    .maybeSingle();

  const { data: { user: dashboardUser } } = await supabase.auth.getUser();
  const [{ data: schoolAdmin }, { data: platformAdmin }] = await Promise.all([
    classScope?.school_id
      ? supabase.from("school_memberships")
          .select("role")
          .eq("school_id", classScope.school_id)
           .eq("user_id", dashboardUser?.id ?? "")
          .eq("active", true)
          .in("role", ["school_admin", "school_lead"])
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("platform_staff")
      .select("user_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .eq("role", "platform_admin")
      .maybeSingle(),
  ]);
  const canViewIndividualReports = Boolean(schoolAdmin || platformAdmin);

  const [competency, mission, activity, studentCompetency, studentEvidence, studentMissions, learningEvidence, bottlenecks, scenarioLearningCards] = await Promise.all([
    supabase.rpc("get_class_competency_overview", { p_class_id: classId }),
    supabase.rpc("get_class_mission_overview", { p_class_id: classId }),
    supabase.rpc("get_class_activity_overview", { p_class_id: classId }),
    canViewIndividualReports ? supabase.rpc("get_class_student_competency_progress", { p_class_id: classId }) : Promise.resolve({ data: [], error: null }),
    canViewIndividualReports ? supabase.rpc("get_class_student_competency_evidence", { p_class_id: classId }) : Promise.resolve({ data: [], error: null }),
    canViewIndividualReports ? supabase.rpc("get_class_student_mission_progress", { p_class_id: classId }) : Promise.resolve({ data: [], error: null }),
    canViewIndividualReports ? supabase.rpc("get_class_student_learning_evidence_v1", { p_class_id: classId }) : Promise.resolve({ data: [], error: null }),
    supabase.rpc("get_class_mission_bottlenecks", { p_class_id: classId }),
    supabase.rpc("get_class_scenario_learning_card_insights_v1", { p_class_id: classId }),
  ]);

  if (competency.error) return fail(competency.error.message);
  if (studentEvidence.error) return fail(studentEvidence.error.message);
  if (learningEvidence.error) return fail(learningEvidence.error.message);
  if (scenarioLearningCards.error) return fail(scenarioLearningCards.error.message);

  return new Response(
    JSON.stringify({
      competencyOverview: competency.data ?? [],
      missionOverview: mission.data ?? [],
      activityOverview: activity.data?.[0] ?? null,
      studentCompetencyProgress: (studentCompetency.data ?? []).map((row) => ({
        ...row,
        evidence: (studentEvidence.data ?? []).find(
          (item) => item.user_id === row.user_id && item.competency_id === row.competency_id
        )?.evidence ?? [],
      })),
      studentMissionProgress: studentMissions.data ?? [],
      studentLearningEvidence: learningEvidence.data ?? [],
      scenarioLearningCardInsights: scenarioLearningCards.data ?? [],
      missionBottlenecks: bottlenecks.data ?? [],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
