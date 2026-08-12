// ============================================================
// Edge Function: reset-student-password
//
// Schüler-Accounts haben keine echte E-Mail (siehe join_class_as_student),
// daher funktioniert der übliche "Link per Mail"-Passwort-Reset nicht.
// Stattdessen: Lehrkraft löst hier ein neues Temp-Passwort aus, das
// einmalig angezeigt wird — Schüler:in sollte es beim nächsten Login
// über /account selbst ändern (siehe apps/player/app/account).
//
// Nutzt den Service-Role-Key (auth.admin.*), da ein normaler Client
// niemals das Passwort eines fremden Nutzers ändern darf. Deshalb läuft
// das ausschließlich hier serverseitig, nie im Browser-Code.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

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
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), { status: 401 });
  }

  const { studentUserId, classId } = await req.json();
  if (!studentUserId || !classId) {
    return new Response(JSON.stringify({ error: "studentUserId oder classId fehlt" }), {
      status: 400,
    });
  }

  // Anon-Client mit der Session der aufrufenden Lehrkraft — nur für die
  // Berechtigungsprüfung, NICHT für die eigentliche Passwortänderung.
  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: isTeacher, error: authCheckError } = await callerClient.rpc(
    "is_teacher_of_class",
    { target_class_id: classId }
  );

  if (authCheckError || !isTeacher) {
    return new Response(JSON.stringify({ error: "Keine Berechtigung für diese Klasse" }), {
      status: 403,
    });
  }

  // Zusätzlich prüfen: ist die Ziel-Person überhaupt Schüler:in DIESER Klasse
  // (verhindert, dass eine Lehrkraft das Passwort einer beliebigen Person
  // außerhalb ihrer eigenen Klasse zurücksetzt).
  const { data: membership } = await callerClient
    .from("class_memberships")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", studentUserId)
    .eq("role", "student")
    .maybeSingle();

  if (!membership) {
    return new Response(
      JSON.stringify({ error: "Person ist keine Schülerin/kein Schüler dieser Klasse" }),
      { status: 403 }
    );
  }

  // Erst jetzt: Service-Role-Client für die eigentliche Passwort-Änderung.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const tempPassword = generateTempPassword();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(studentUserId, {
    password: tempPassword,
  });

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ tempPassword }), {
    headers: { "Content-Type": "application/json" },
  });
});
