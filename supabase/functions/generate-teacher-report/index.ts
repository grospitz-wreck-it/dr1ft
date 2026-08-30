import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization"); if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);
  const body = await req.json().catch(() => null);
  const classId = typeof body?.classId === "string" ? body.classId.trim() : "";
  const studentUserId = typeof body?.studentUserId === "string" ? body.studentUserId.trim() : "";
  if (!classId || !studentUserId) return json({ error: "classId und studentUserId sind erforderlich" }, 400);
  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return json({ error: "Supabase Server-Konfiguration fehlt" }, 500);
  const admin = createClient(url, serviceKey); const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller) return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);
  const { data: membership } = await admin.from("class_instance_memberships").select("role").eq("class_instance_id", classId).eq("user_id", caller.id).is("left_at", null).maybeSingle();
  if (!membership || !["teacher", "school_admin"].includes(membership.role)) return json({ error: "Keine Berechtigung für diese Klasseninstanz" }, 403);
  const { data: studentMembership } = await admin.from("class_instance_memberships").select("role").eq("class_instance_id", classId).eq("user_id", studentUserId).eq("role", "student").is("left_at", null).maybeSingle();
  if (!studentMembership) return json({ error: "Schüler:in gehört nicht zu dieser Klasseninstanz" }, 404);

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const [competency, missions, bottlenecks] = await Promise.all([
    callerClient.rpc("get_class_student_competency_progress", { p_class_id: classId }),
    callerClient.rpc("get_class_student_mission_progress", { p_class_id: classId }),
    callerClient.rpc("get_class_mission_bottlenecks", { p_class_id: classId }),
  ]);
  if (competency.error) return json({ error: competency.error.message }, 500);
  if (missions.error) return json({ error: missions.error.message }, 500);
  if (bottlenecks.error) return json({ error: bottlenecks.error.message }, 500);

  const snapshot = {
    generated_at: new Date().toISOString(),
    competencyProgress: (competency.data ?? []).filter((r: any) => r.user_id === studentUserId),
    missionProgress: (missions.data ?? []).filter((r: any) => r.user_id === studentUserId),
    classBottlenecks: bottlenecks.data ?? [],
  };
  const { data: classRow } = await admin.from("class_instances").select("school_id").eq("id", classId).maybeSingle();
  const { data: report, error: reportError } = await admin.from("teacher_reports").insert({ school_id: classRow?.school_id ?? null, class_instance_id: classId, student_user_id: studentUserId, created_by: caller.id, snapshot }).select("id, created_at, status").single();
  if (reportError) return json({ error: reportError.message }, 500);
  return json({ report, snapshot });
});
