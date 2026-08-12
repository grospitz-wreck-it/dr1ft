// ============================================================
// Edge Function: teacher-dashboard
//
// Ruft ausschließlich SECURITY DEFINER RPC-Funktionen auf (siehe
// 0018_teacher_dashboard_functions.sql) statt Views direkt abzufragen —
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
  const [competency, mission, activity, studentCompetency, studentMissions, bottlenecks] = await Promise.all([
    supabase.rpc("get_class_competency_overview", { p_class_id: classId }),
    supabase.rpc("get_class_mission_overview", { p_class_id: classId }),
    supabase.rpc("get_class_activity_overview", { p_class_id: classId }),
    supabase.rpc("get_class_student_competency_progress", { p_class_id: classId }),
    supabase.rpc("get_class_student_mission_progress", { p_class_id: classId }),
    supabase.rpc("get_class_mission_bottlenecks", { p_class_id: classId }),
  ]);

  if (competency.error) return fail(competency.error.message);

  return new Response(
    JSON.stringify({
      competencyOverview: competency.data ?? [],
      missionOverview: mission.data ?? [],
      activityOverview: activity.data?.[0] ?? null,
      studentCompetencyProgress: studentCompetency.data ?? [],
      studentMissionProgress: studentMissions.data ?? [],
      missionBottlenecks: bottlenecks.data ?? [],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
