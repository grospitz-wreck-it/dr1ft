// ============================================================
// Edge Function: reset-student-password
// Password resets are limited to class teachers and school/platform admins.
// ============================================================

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

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(random, (value) => alphabet[value & 31]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Methode nicht erlaubt" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);

  const body = await req.json().catch(() => null);
  const studentUserId = typeof body?.studentUserId === "string" ? body.studentUserId.trim() : "";
  const classId = typeof body?.classId === "string" ? body.classId.trim() : "";
  if (!studentUserId || !classId) return json({ error: "studentUserId oder classId fehlt" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Supabase Server-Konfiguration fehlt" }, 500);

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: canManageStudents, error: permissionError } = await callerClient.rpc(
    "can_manage_student_accounts",
    { p_class_id: classId },
  );
  if (permissionError) return json({ error: "Berechtigung konnte nicht geprüft werden" }, 500);
  if (!canManageStudents) return json({ error: "Keine Berechtigung für diese Klasseninstanz" }, 403);

  const adminClient = createClient(url, serviceKey);
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token);
  if (callerError || !caller) return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);

  const { data: membership, error: membershipError } = await adminClient
    .from("class_instance_memberships")
    .select("id")
    .eq("class_instance_id", classId)
    .eq("user_id", studentUserId)
    .eq("role", "student")
    .is("left_at", null)
    .maybeSingle();

  if (membershipError) return json({ error: "Schülerzuordnung konnte nicht geprüft werden" }, 500);
  if (!membership) return json({ error: "Person gehört nicht aktiv zu dieser Klasseninstanz" }, 403);

  const tempPassword = generateTempPassword();
  const { error: updateError } = await adminClient.auth.admin.updateUserById(studentUserId, {
    password: tempPassword,
  });
  if (updateError) return json({ error: updateError.message }, 500);

  return json({ tempPassword });
});
