import { NextResponse, type NextRequest } from "next/server";
import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";

export const runtime = "nodejs";

type Context = { params: { schoolId: string } };
const PROVIDER = "iserv";

function encryptionKey() {
  const raw = process.env.DR1FT_SSO_ENCRYPTION_KEY;
  if (!raw || !/^[a-fA-F0-9]{64}$/.test(raw)) {
    throw new Error("DR1FT_SSO_ENCRYPTION_KEY muss als 64-stelliger Hex-Schlüssel in Vercel hinterlegt sein.");
  }
  return Uint8Array.from(raw.match(/.{2}/g)!, (byte) => parseInt(byte, 16));
}

async function encryptSecret(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", encryptionKey(), "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(secret));
  return {
    secret_ciphertext: Buffer.from(encrypted).toString("base64"),
    secret_iv: Buffer.from(iv).toString("base64"),
  };
}

async function authorizedSchool(schoolId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  const [{ data: membership }, { data: staff }] = await Promise.all([
    supabase.from("school_memberships").select("role").eq("school_id", schoolId).eq("user_id", user.id).eq("active", true).in("role", ["school_admin", "school_lead"]).maybeSingle(),
    supabase.from("platform_staff").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!membership && staff?.role !== "platform_admin") {
    return { response: NextResponse.json({ error: "Keine Berechtigung für diese Schule." }, { status: 403 }) };
  }
  return { supabase, user };
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizedSchool(params.schoolId);
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase
    .from("school_sso_connections")
    .select("provider, issuer_url, client_id, enabled, updated_at, secret_ciphertext")
    .eq("school_id", params.schoolId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    configured: Boolean(data),
    provider: PROVIDER,
    issuerUrl: data?.issuer_url ?? "",
    clientId: data?.client_id ?? "",
    enabled: data?.enabled ?? false,
    secretConfigured: Boolean(data?.secret_ciphertext),
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await authorizedSchool(params.schoolId);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const issuerUrl = String(body.issuerUrl ?? "").trim();
    const clientId = String(body.clientId ?? "").trim();
    const secret = String(body.clientSecret ?? "");
    const enabled = body.enabled === true;

    let parsed: URL;
    try { parsed = new URL(issuerUrl); } catch { return NextResponse.json({ error: "Bitte eine gültige IServ-Adresse angeben." }, { status: 400 }); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return NextResponse.json({ error: "Die IServ-Adresse muss eine HTTPS-Adresse ohne Zugangsdaten, Query oder Fragment sein." }, { status: 400 });
    }
    if (!clientId) return NextResponse.json({ error: "Die Client-ID fehlt." }, { status: 400 });
    if (clientId.length > 500 || secret.length > 4000) return NextResponse.json({ error: "Die Zugangsdaten sind zu lang." }, { status: 400 });

    const { data: existing, error: readError } = await auth.supabase
      .from("school_sso_connections").select("secret_ciphertext, secret_iv")
      .eq("school_id", params.schoolId).eq("provider", PROVIDER).maybeSingle();
    if (readError) throw readError;
    if (!secret && !existing?.secret_ciphertext) {
      return NextResponse.json({ error: "Bitte das Client-Secret eintragen." }, { status: 400 });
    }

    const encrypted = secret ? await encryptSecret(secret) : null;
    const { error } = await auth.supabase.from("school_sso_connections").upsert({
      school_id: params.schoolId,
      provider: PROVIDER,
      issuer_url: parsed.toString(),
      client_id: clientId,
      ...(encrypted ?? {}),
      ...(existing && !encrypted ? { secret_ciphertext: existing.secret_ciphertext, secret_iv: existing.secret_iv } : {}),
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    }, { onConflict: "school_id,provider" });
    if (error) throw error;

    return NextResponse.json({ success: true, secretConfigured: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SSO-Einstellungen konnten nicht gespeichert werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await authorizedSchool(params.schoolId);
  if ("response" in auth) return auth.response;
  const { error } = await auth.supabase.from("school_sso_connections")
    .delete().eq("school_id", params.schoolId).eq("provider", PROVIDER);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
