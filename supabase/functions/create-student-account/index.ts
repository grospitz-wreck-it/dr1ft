// ============================================================
// Edge Function: create-student-account
// Teacher-created student accounts are always attached to the
// concrete class instance. Global content remains reusable.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function cleanPart(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(random, (value) => alphabet[value & 31]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);

  const body = await req.json().catch(() => null);
  const classId = body?.classId?.trim();
  const displayName = body?.displayName?.trim();
  const username = body?.username?.trim();
  if (!classId || !displayName || !username) return json({ error: "Klasse, Anzeigename und Nutzername sind erforderlich" }, 400);
  if (username.length < 2 || username.length > 32) return json({ error: "Der Nutzername muss 2–32 Zeichen lang sein" }, 400);
  if (displayName.length > 80) return json({ error: "Der Anzeigename darf höchstens 80 Zeichen lang sein" }, 400);

  const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: isTeacher, error: authCheckError } = await callerClient.rpc("can_manage_student_accounts", { p_class_id: classId });
  if (authCheckError || !isTeacher) return json({ error: "Keine Berechtigung für diese Klasseninstanz" }, 403);

  const { data: classRow, error: classError } = await callerClient
    .from("class_instances")
    .select("id, access_code, is_active")
    .eq("id", classId)
    .maybeSingle();
  if (classError || !classRow) return json({ error: "Klasseninstanz nicht gefunden" }, 404);
  if (!classRow.is_active) return json({ error: "Diese Klasseninstanz ist nicht aktiv" }, 400);

  const cleanUsername = cleanPart(username);
  const cleanCode = cleanPart(classRow.access_code);
  if (!cleanUsername) return json({ error: "Nutzername enthält keine gültigen Zeichen" }, 400);
  const email = `${cleanUsername}.${cleanCode}@dr1ft.local`;
  const password = generateTempPassword();

  const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name: displayName, username, class_instance_id: classId },
    app_metadata: { require_password_change: true },
  });
  if (createError || !created.user) {
    const message = createError?.message ?? "Schüler-Account konnte nicht angelegt werden";
    if (message.toLowerCase().includes("already") || message.toLowerCase().includes("duplicate")) return json({ error: "Dieser Nutzername ist bereits vergeben." }, 409);
    return json({ error: message }, 500);
  }

  const studentId = created.user.id;
  const { error: profileError } = await adminClient.from("user_profiles").upsert({ id: studentId, display_name: displayName, username }, { onConflict: "id" });
  if (profileError) {
    await adminClient.auth.admin.deleteUser(studentId);
    return json({ error: profileError.message }, 500);
  }

  const { error: membershipError } = await adminClient.from("class_instance_memberships").insert({ class_instance_id: classId, user_id: studentId, role: "student" });
  if (membershipError) {
    await adminClient.auth.admin.deleteUser(studentId);
    return json({ error: membershipError.message }, 500);
  }

  const { data: callerData } = await callerClient.auth.getUser();
  const { error: credentialError } = await adminClient.rpc("store_student_onboarding_credential", {
    p_class_id: classId, p_student_user_id: studentId, p_username: username, p_password: password, p_created_by: callerData.user?.id,
  });
  if (credentialError) {
    await adminClient.from("class_instance_memberships").delete().eq("class_instance_id", classId).eq("user_id", studentId);
    await adminClient.auth.admin.deleteUser(studentId);
    return json({ error: "Zugangsdaten konnten nicht sicher für den Druck hinterlegt werden" }, 500);
  }

  return json({ student: { id: studentId, displayName, username }, tempPassword: password });
});
