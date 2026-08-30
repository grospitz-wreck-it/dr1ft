// ============================================================
// Edge Function: create-student-account
// Teacher-created student accounts are always attached to the
// concrete class instance and receive a complete social profile.
// ============================================================

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

function cleanPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";

  for (let i = 0; i < 10; i++) {
    pw += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return pw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return json({ error: "Nicht authentifiziert" }, 401);
  }

  // ----------------------------------------------------------
  // Parse request
  // ----------------------------------------------------------

  const body = await req.json().catch(() => null);

  const classId =
    typeof body?.classId === "string"
      ? body.classId.trim()
      : "";

  const displayName =
    typeof body?.displayName === "string"
      ? body.displayName.trim()
      : "";

  const username =
    typeof body?.username === "string"
      ? body.username.trim()
      : "";

  const requestedPassword =
    typeof body?.password === "string"
      ? body.password.trim()
      : "";

  if (!classId || !displayName || !username) {
    return json(
      {
        error:
          "Klasse, Anzeigename und Nutzername sind erforderlich",
      },
      400
    );
  }

  if (username.length < 2 || username.length > 32) {
    return json(
      {
        error:
          "Der Nutzername muss 2–32 Zeichen lang sein",
      },
      400
    );
  }

  if (displayName.length > 80) {
    return json(
      {
        error:
          "Der Anzeigename darf höchstens 80 Zeichen lang sein",
      },
      400
    );
  }

  // ----------------------------------------------------------
  // Create service-role client
  // ----------------------------------------------------------

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY"
  );

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error:
          "Supabase Server-Konfiguration fehlt",
      },
      500
    );
  }

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey
  );

  // ----------------------------------------------------------
  // Authenticate caller from JWT
  // ----------------------------------------------------------

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

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
  // Verify that caller is an active teacher of THIS instance.
  // This check deliberately uses the service-role client so it
  // does not depend on the class-instance RLS policies.
  // ----------------------------------------------------------

  const {
    data: membership,
    error: membershipCheckError,
  } = await adminClient
    .from("class_instance_memberships")
    .select("user_id, role, left_at")
    .eq("class_instance_id", classId)
    .eq("user_id", caller.id)
    .is("left_at", null)
    .maybeSingle();

  if (membershipCheckError) {
    return json(
      {
        error:
          "Berechtigung konnte nicht geprüft werden",
      },
      500
    );
  }

  if (
    !membership ||
    !["teacher", "school_admin"].includes(membership.role)
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
  // Load class instance
  // ----------------------------------------------------------

  const {
    data: classRow,
    error: classError,
  } = await adminClient
    .from("class_instances")
    .select("id, access_code, is_active")
    .eq("id", classId)
    .maybeSingle();

  if (classError || !classRow) {
    return json(
      {
        error: "Klasseninstanz nicht gefunden",
      },
      404
    );
  }

  if (!classRow.is_active) {
    return json(
      {
        error: "Diese Klasseninstanz ist nicht aktiv",
      },
      400
    );
  }

  // ----------------------------------------------------------
  // Normalize username
  // ----------------------------------------------------------

  const cleanUsername = cleanPart(username);
  const cleanCode = cleanPart(classRow.access_code);

  if (!cleanUsername) {
    return json(
      {
        error:
          "Nutzername enthält keine gültigen Zeichen",
      },
      400
    );
  }

  // Student accounts use an internal email address.
  // Students themselves only need username/password.
  const email =
    `${cleanUsername}.${cleanCode}@dr1ft.local`;

  const password =
    requestedPassword && requestedPassword.length >= 6
      ? requestedPassword
      : generateTempPassword();

  // ----------------------------------------------------------
  // Create Auth user
  // ----------------------------------------------------------

  const {
    data: created,
    error: createError,
  } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      username: cleanUsername,
      class_instance_id: classId,
    },
  });

  if (createError || !created.user) {
    const message =
      createError?.message ??
      "Schüler-Account konnte nicht angelegt werden";

    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("already") ||
      lowerMessage.includes("duplicate") ||
      lowerMessage.includes("unique")
    ) {
      return json(
        {
          error:
            "Dieser Nutzername ist bereits vergeben.",
        },
        409
      );
    }

    return json(
      {
        error: message,
      },
      500
    );
  }

  const studentId = created.user.id;

  // ----------------------------------------------------------
  // Create / update social profile
  // ----------------------------------------------------------

  const {
    error: profileError,
  } = await adminClient
    .from("user_profiles")
    .upsert(
      {
        id: studentId,
        display_name: displayName,
        username: cleanUsername,
        avatar_seed: studentId,
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    await adminClient.auth.admin.deleteUser(studentId);

    return json(
      {
        error: profileError.message,
      },
      500
    );
  }

  // ----------------------------------------------------------
  // Attach student to concrete class instance
  // ----------------------------------------------------------

  const {
    error: studentMembershipError,
  } = await adminClient
    .from("class_instance_memberships")
    .insert({
      class_instance_id: classId,
      user_id: studentId,
      role: "student",
    });

  if (studentMembershipError) {
    await adminClient.auth.admin.deleteUser(studentId);

    return json(
      {
        error: studentMembershipError.message,
      },
      500
    );
  }

  // ----------------------------------------------------------
  // Success
  // ----------------------------------------------------------

  return json({
    student: {
      id: studentId,
      displayName,
      username: cleanUsername,
    },
    tempPassword: password,
  });
});
