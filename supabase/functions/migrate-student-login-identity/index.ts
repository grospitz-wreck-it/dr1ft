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
  if (req.method !== "POST") return json({ error: "Methode nicht erlaubt" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Nicht authentifiziert" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase Server-Konfiguration fehlt" }, 500);

  const token = authorization.replace(/^Bearer\\s+/i, "").trim();
  const admin = createClient(url, serviceKey);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return json({ error: "Schülerprofil konnte nicht geprüft werden" }, 500);
  if (!profile?.username) return json({ error: "Für dieses Konto ist kein Nutzername hinterlegt" }, 409);

  const { data: studentMembership, error: membershipError } = await admin
    .from("class_instance_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "student")
    .limit(1)
    .maybeSingle();

  if (membershipError) return json({ error: "Schülerkonto konnte nicht geprüft werden" }, 500);
  if (!studentMembership) return json({ error: "Dieses Konto ist kein Schülerkonto" }, 403);

  const clean = cleanUsername(profile.username);
  if (clean.length < 2 || clean.length > 32) {
    return json({ error: "Der hinterlegte Nutzername ist für den neuen Login nicht geeignet" }, 409);
  }

  const currentEmail = (user.email ?? "").toLowerCase();
  const targetEmail = clean + "@dr1ft.local";
  if (currentEmail === targetEmail) return json({ success: true, alreadyUpdated: true });

  const localPart = currentEmail.split("@")[0] ?? "";
  if (!currentEmail.endsWith("@dr1ft.local") || !localPart.startsWith(clean + ".")) {
    return json({ error: "Dieses Konto verwendet kein migrierbares altes Schüler-Login" }, 409);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email: targetEmail,
    email_confirm: true,
  });

  if (updateError) {
    const message = updateError.message.toLowerCase();
    if (message.includes("already") || message.includes("duplicate") || message.includes("exists")) {
      return json({ error: "Der neue Login-Name ist bereits vergeben. Bitte wende dich an deine Lehrkraft." }, 409);
    }
    console.error("[migrate-student-login-identity] auth email update failed", {
      userId: user.id,
      message: updateError.message,
    });
    return json({ error: "Der Login konnte noch nicht umgestellt werden" }, 500);
  }

  return json({ success: true, alreadyUpdated: false });
});
