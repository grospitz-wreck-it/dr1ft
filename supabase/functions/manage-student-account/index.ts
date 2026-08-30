import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  const classId = typeof body?.classId === "string" ? body.classId.trim() : "";
  const studentUserId = typeof body?.studentUserId === "string" ? body.studentUserId.trim() : "";

  if (!action || !classId || !studentUserId) {
    return json({ error: "action, classId und studentUserId sind erforderlich" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase Server-Konfiguration fehlt" }, 500);

  const admin = createClient(url, serviceKey);
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller) return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);

  const { data: callerMembership, error: callerMembershipError } = await admin
    .from("class_instance_memberships")
    .select("role")
    .eq("class_instance_id", classId)
    .eq("user_id", caller.id)
    .is("left_at", null)
    .maybeSingle();

  if (callerMembershipError) return json({ error: callerMembershipError.message }, 500);
  if (!callerMembership || !["teacher", "school_admin"].includes(callerMembership.role)) {
    return json({ error: "Keine Berechtigung für diese Klasseninstanz" }, 403);
  }

  const { data: studentMembership, error: studentMembershipError } = await admin
    .from("class_instance_memberships")
    .select("id, role, left_at")
    .eq("class_instance_id", classId)
    .eq("user_id", studentUserId)
    .eq("role", "student")
    .is("left_at", null)
    .maybeSingle();

  if (studentMembershipError) return json({ error: studentMembershipError.message }, 500);
  if (!studentMembership) return json({ error: "Schüler:in gehört nicht zu dieser Klasse" }, 404);

  if (action === "remove") {
    const { error } = await admin
      .from("class_instance_memberships")
      .update({ left_at: new Date().toISOString() })
      .eq("id", studentMembership.id);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  if (action === "update") {
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const username = cleanUsername(typeof body?.username === "string" ? body.username : "");

    if (!displayName || !username) return json({ error: "Anzeigename und Nutzername sind erforderlich" }, 400);
    if (username.length < 2 || username.length > 32) return json({ error: "Der Nutzername muss 2–32 Zeichen lang sein" }, 400);
    if (displayName.length > 80) return json({ error: "Der Anzeigename darf höchstens 80 Zeichen lang sein" }, 400);

    const { data: profile, error: profileLookupError } = await admin
      .from("user_profiles")
      .select("id, username")
      .eq("id", studentUserId)
      .maybeSingle();
    if (profileLookupError) return json({ error: profileLookupError.message }, 500);
    if (!profile) return json({ error: "Schülerprofil nicht gefunden" }, 404);

    const { data: duplicate } = await admin
      .from("user_profiles")
      .select("id")
      .ilike("username", username)
      .neq("id", studentUserId)
      .maybeSingle();
    if (duplicate) return json({ error: "Dieser Nutzername ist bereits vergeben." }, 409);

    const { data: classRow, error: classError } = await admin
      .from("class_instances")
      .select("access_code")
      .eq("id", classId)
      .maybeSingle();
    if (classError || !classRow) return json({ error: "Klasseninstanz nicht gefunden" }, 404);

    const email = `${username}.${String(classRow.access_code).toLowerCase().replace(/[^a-z0-9]/g, "")}@dr1ft.local`;
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(studentUserId, {
      email,
      user_metadata: { display_name: displayName, username, class_instance_id: classId },
    });
    if (authUpdateError) return json({ error: authUpdateError.message }, 500);

    const { error: profileError } = await admin
      .from("user_profiles")
      .update({ display_name: displayName, username })
      .eq("id", studentUserId);
    if (profileError) return json({ error: profileError.message }, 500);

    return json({ success: true, student: { id: studentUserId, displayName, username } });
  }

  return json({ error: "Unbekannte Aktion" }, 400);
});
