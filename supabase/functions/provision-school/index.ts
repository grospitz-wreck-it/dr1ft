import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization"); if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const region = typeof body?.region === "string" ? body.region.trim() : "";
  const emailDomain = typeof body?.emailDomain === "string" ? body.emailDomain.trim().toLowerCase().replace(/^@/, "") : "";
  if (!name) return json({ error: "Schulname ist erforderlich" }, 400);
  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !serviceKey) return json({ error: "Supabase Server-Konfiguration fehlt" }, 500);
  const admin = createClient(url, serviceKey); const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token); if (callerError || !caller) return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);
  const { data: staff } = await admin.from("platform_staff").select("role").eq("user_id", caller.id).eq("role", "platform_admin").maybeSingle(); if (!staff) return json({ error: "Nur Platform-Admins dürfen Schulen anlegen" }, 403);
  const { data: school, error } = await admin.from("schools").insert({ name, region: region || null, email_domain: emailDomain || null }).select("id, name, region, email_domain").single();
  if (error || !school) return json({ error: error?.message ?? "Schule konnte nicht angelegt werden" }, 500);
  return json({ school });
});
