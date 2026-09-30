import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return json({ error: "Nicht authentifiziert" }, 401);
  }

  const body = await req.json().catch(() => null);

  const classId =
    typeof body?.classId === "string"
      ? body.classId.trim()
      : "";

  const studentId =
    typeof body?.studentId === "string"
      ? body.studentId.trim()
      : "";

  if (!classId || !studentId) {
    return json(
      {
        error: "Klasse und Schüler sind erforderlich",
      },
      400
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY"
  );

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error: "Supabase Server-Konfiguration fehlt",
      },
      500
    );
  }

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey
  );

  const token = authHeader
    .replace(/^Bearer\s+/i, "")
    .trim();

  const userClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const {
    data: { user: caller },
    error: callerError,
  } = await adminClient.auth.getUser(token);

  if (callerError || !caller) {
    return json(
      {
        error: "Ungültige oder abgelaufene Sitzung",
      },
      401
    );
  }

  // ----------------------------------------------------------
  // Teacher authorization
  // ----------------------------------------------------------

  const { data: membership, error: membershipError } =
    await adminClient
      .from("class_instance_memberships")
      .select("user_id, role, left_at")
      .eq("class_instance_id", classId)
      .eq("user_id", caller.id)
      .is("left_at", null)
      .maybeSingle();

  if (membershipError) {
    return json(
      {
        error: "Berechtigung konnte nicht geprüft werden",
      },
      500
    );
  }

  if (
    !membership ||
    !["teacher", "school_admin", "school_lead"].includes(
      membership.role
    )
  ) {
    return json(
      {
        error:
          "Keine Berechtigung für diese Klasseninstanz",
      },
      403
    );
  }

  // ----------------------------------------------------------
  // Verify student belongs to this class instance
  // ----------------------------------------------------------

  const { data: studentMembership, error: studentError } =
    await adminClient
      .from("class_instance_memberships")
      .select("user_id, role, left_at")
      .eq("class_instance_id", classId)
      .eq("user_id", studentId)
      .is("left_at", null)
      .maybeSingle();

  if (studentError) {
    return json(
      {
        error:
          "Schülerzugehörigkeit konnte nicht geprüft werden",
      },
      500
    );
  }

  if (!studentMembership || studentMembership.role !== "student") {
    return json(
      {
        error:
          "Der Schüler gehört nicht zu dieser Klasseninstanz",
      },
      404
    );
  }

  // ----------------------------------------------------------
  // Student profile
  // ----------------------------------------------------------

  const { data: profile, error: profileError } =
    await adminClient
      .from("user_profiles")
      .select("id, display_name, username")
      .eq("id", studentId)
      .maybeSingle();

  if (profileError) {
    return json(
      {
        error: profileError.message,
      },
      500
    );
  }

  // ----------------------------------------------------------
  // Class instance
  // ----------------------------------------------------------

  const { data: classInstance, error: classError } =
    await adminClient
      .from("class_instances")
      .select("id, name, school_year")
      .eq("id", classId)
      .maybeSingle();

  if (classError || !classInstance) {
    return json(
      {
        error: "Klasseninstanz nicht gefunden",
      },
      404
    );
  }

  // ----------------------------------------------------------
  // IMPORTANT:
  // Query the existing RPCs separately.
  // We do not modify their SQL definitions here.
  // ----------------------------------------------------------

  const competencyResult =
    await userClient.rpc(
      "get_class_student_competency_progress",
      {
        p_class_id: classId,
      }
    );

  if (competencyResult.error) {
    return json(
      {
        error:
          "Kompetenzdaten konnten nicht geladen werden",
        details: competencyResult.error.message,
      },
      500
    );
  }

  const missionResult =
    await userClient.rpc(
      "get_class_student_mission_progress",
      {
        p_class_id: classId,
      }
    );

  if (missionResult.error) {
    return json(
      {
        error:
          "Missionsdaten konnten nicht geladen werden",
        details: missionResult.error.message,
      },
      500
    );
  }

  const bottleneckResult =
    await userClient.rpc(
      "get_class_mission_bottlenecks",
      {
        p_class_id: classId,
      }
    );

  if (bottleneckResult.error) {
    return json(
      {
        error:
          "Missionsauswertung konnte nicht geladen werden",
        details: bottleneckResult.error.message,
      },
      500
    );
  }

  // ----------------------------------------------------------
  // Filter class-wide RPC results down to this student.
  // ----------------------------------------------------------

  const competencies = (
    competencyResult.data ?? []
  ).filter(
    (row: {
      user_id?: string;
    }) => row.user_id === studentId
  );

  const missionProgress = (
    missionResult.data ?? []
  ).find(
    (row: {
      user_id?: string;
    }) => row.user_id === studentId
  ) ?? null;

  // ----------------------------------------------------------
  // Build pedagogical report snapshot
  // ----------------------------------------------------------

  const report = {
    generatedAt: new Date().toISOString(),

    student: {
      id: studentId,
      displayName:
        profile?.display_name ??
        profile?.username ??
        "Schüler/in",
      username: profile?.username ?? null,
    },

    class: {
      id: classInstance.id,
      name: classInstance.name,
      schoolYear: classInstance.school_year,
    },

    missionProgress: missionProgress
      ? {
          completed: Number(
            missionProgress.missions_completed ?? 0
          ),
          total: Number(
            missionProgress.missions_total ?? 0
          ),
        }
      : {
          completed: 0,
          total: 0,
        },

    competencies: competencies.map(
      (row: {
        competency_id?: string | null;
        competency_title?: string | null;
        level?: number | null;
      }) => ({
        id: row.competency_id ?? null,
        title:
          row.competency_title ??
          "Unbenannte Kompetenz",
        level: Number(row.level ?? 0),
      })
    ),

    classMissionBottlenecks: (
      bottleneckResult.data ?? []
    ).map(
      (row: {
        mission_id?: string | null;
        mission_title?: string | null;
        completed_count?: number | string | null;
        student_count?: number | string | null;
        completion_rate?: number | string | null;
      }) => ({
        missionId: row.mission_id ?? null,
        title:
          row.mission_title ??
          "Unbenannte Mission",
        completedCount: Number(
          row.completed_count ?? 0
        ),
        studentCount: Number(
          row.student_count ?? 0
        ),
        completionRate: Number(
          row.completion_rate ?? 0
        ),
      })
    ),

    pedagogicalSummary: {
      competenciesTracked: competencies.length,
      missionsCompleted: Number(
        missionProgress?.missions_completed ?? 0
      ),
      missionsTotal: Number(
        missionProgress?.missions_total ?? 0
      ),
    },
  };

  // ----------------------------------------------------------
  // Persist report if table exists.
  // If persistence fails, return the actual error instead of
  // silently pretending the report was stored.
  // ----------------------------------------------------------

  const { data: storedReport, error: reportError } =
  await adminClient
    .from("teacher_reports")
    .insert({
      class_instance_id: classId,
      student_user_id: studentId,
      created_by: caller.id,
      title: "Lernreport",
      status: "generated",
      snapshot: report,
    })
    .select("id, created_at")
    .single();

  if (reportError) {
    return json(
      {
        error:
          "Report konnte nicht gespeichert werden",
        details: reportError.message,
      },
      500
    );
  }

  return json({
    success: true,
    reportId: storedReport.id,
    createdAt: storedReport.created_at,
    report,
  });
});
