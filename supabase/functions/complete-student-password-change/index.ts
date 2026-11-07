import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Methode nicht erlaubt" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 128) return json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase Server-Konfiguration fehlt" }, 500);
  const admin = createClient(url, serviceKey);
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);
  if (user.app_metadata?.require_password_change !== true) return json({ error: "Für dieses Konto ist keine Passwortänderung erforderlich." }, 409);

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    app_metadata: { ...user.app_metadata, require_password_change: false },
  });
  if (error) return json({ error: error.message }, 400);
  const { error: credentialCleanupError } = await admin.from("student_onboarding_credentials").delete().eq("student_user_id", user.id);
  if (credentialCleanupError) return json({ error: "Passwort wurde geändert, aber die Einmal-Zugangsdaten konnten nicht aus dem Druckspeicher entfernt werden. Bitte den Support informieren." }, 500);
  return json({ success: true });
});
