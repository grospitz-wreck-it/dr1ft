import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nicht authentifiziert" }, 401);
  const body = await req.json().catch(() => null);
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body?.role === "string" ? body.role : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (!schoolId || !email || !displayName || !["teacher", "school_admin", "school_lead"].includes(role)) return json({ error: "Schule, Name, E-Mail und Rolle sind erforderlich" }, 400);

  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase Server-Konfiguration fehlt" }, 500);
  const admin = createClient(url, serviceKey);
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller) return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);

  const { data: platformAdmin } = await admin.from("platform_staff").select("role").eq("user_id", caller.id).eq("role", "platform_admin").maybeSingle();
  const { data: schoolAdmin } = await admin.from("school_memberships").select("role").eq("school_id", schoolId).eq("user_id", caller.id).eq("active", true).in("role", ["school_admin", "school_lead"]).maybeSingle();
  if (!platformAdmin && !schoolAdmin) return json({ error: "Keine Berechtigung, Nutzer für diese Schule anzulegen" }, 403);

  const { data: school, error: schoolError } = await admin.from("schools").select("id, name, email_domain").eq("id", schoolId).maybeSingle();
  if (schoolError || !school) return json({ error: "Schule nicht gefunden" }, 404);
  if (school.email_domain) {
    const domain = email.split("@")[1] ?? "";
    if (domain !== String(school.email_domain).toLowerCase()) return json({ error: `Die E-Mail-Adresse muss zur Schul-Domain @${school.email_domain} gehören.` }, 400);
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName, school_id: schoolId, school_role: role },
  });
  if (inviteError || !invited.user) return json({ error: inviteError?.message ?? "Einladung konnte nicht erstellt werden" }, 500);

  const { error: profileError } = await admin.from("user_profiles").upsert({ id: invited.user.id, display_name: displayName }, { onConflict: "id" });
  if (profileError) return json({ error: profileError.message }, 500);
  const { error: membershipError } = await admin.from("school_memberships").upsert({ school_id: schoolId, user_id: invited.user.id, role, active: true }, { onConflict: "school_id,user_id" });
  if (membershipError) return json({ error: membershipError.message }, 500);

  return json({ success: true, user: { id: invited.user.id, email, displayName, role }, school: { id: school.id, name: school.name } });
});
