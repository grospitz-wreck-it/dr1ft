// ============================================================
// Edge Function: reset-student-password
//
// Schüler-Accounts haben keine echte E-Mail. Deshalb setzt die
// Lehrkraft hier ein neues temporäres Passwort.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) {
    pw += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return pw;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);

  const body = await req.json().catch(() => null);
  const studentUserId = body?.studentUserId?.trim();
  const classId = body?.classId?.trim();

  if (!studentUserId || !classId) {
    return json({ error: "studentUserId oder classId fehlt" }, 400);
  }

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: isTeacher, error: authCheckError } = await callerClient.rpc(
    "is_teacher_of_class_instance",
    { target_instance_id: classId }
  );

  if (authCheckError || !isTeacher) {
    return json({ error: "Keine Berechtigung für diese Klasseninstanz" }, 403);
  }

  const { data: membership, error: membershipError } = await callerClient
    .from("class_instance_memberships")
    .select("role")
    .eq("class_instance_id", classId)
    .eq("user_id", studentUserId)
    .eq("role", "student")
    .is("left_at", null)
    .maybeSingle();

  if (membershipError) {
    return json({ error: membershipError.message }, 500);
  }

  if (!membership) {
    return json(
      { error: "Person ist keine Schülerin/kein Schüler dieser Klasseninstanz" },
      403
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const tempPassword = generateTempPassword();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    studentUserId,
    { password: tempPassword }
  );

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({ tempPassword });
});
