import { NextResponse } from "next/server";
import { supabaseServerClient } from "../../../../lib/supabaseServerClient";

export async function GET(request: Request) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  const { data: classInstanceId, error: classError } = await supabase.rpc("get_current_class_instance_id");
  if (classError || !classInstanceId) return NextResponse.json({ error: "Keine aktive Klasse gefunden." }, { status: 403 });

  const url = new URL(request.url);
  const peerId = url.searchParams.get("peerId");
  if (!peerId) {
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("id, display_name, username, avatar_seed")
      .eq("class_instance_id", classInstanceId)
      .neq("id", user.id)
      .order("display_name", { ascending: true })
      .limit(200);
    if (error) return NextResponse.json({ error: "Kontakte konnten nicht geladen werden." }, { status: 500 });
    return NextResponse.json({ contacts: (profiles ?? []).map((p) => ({ id: p.id, display_name: p.display_name || p.username || "DR1FT Schüler", handle: p.username ? `@${p.username}` : "@dr1ft", isDue: false })) });
  }

  const { data: peer, error: peerError } = await supabase.from("user_profiles").select("id, display_name, username").eq("id", peerId).eq("class_instance_id", classInstanceId).maybeSingle();
  if (peerError || !peer) return NextResponse.json({ error: "Dieser Kontakt gehört nicht zu deiner Klasse." }, { status: 404 });

  const { data: messages, error } = await supabase
    .from("student_direct_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .eq("class_instance_id", classInstanceId)
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return NextResponse.json({ error: "Nachrichten konnten nicht geladen werden." }, { status: 500 });

  const unreadIds = (messages ?? []).filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id);
  if (unreadIds.length) {
    const { error: readError } = await supabase.from("student_direct_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).eq("recipient_id", user.id);
    if (readError) return NextResponse.json({ error: "Nachrichten geladen, Gelesen-Status konnte nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ messages: messages ?? [], peer: { id: peer.id, display_name: peer.display_name || peer.username || "DR1FT Schüler" } });
}

export async function POST(request: Request) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  const { data: classInstanceId, error: classError } = await supabase.rpc("get_current_class_instance_id");
  if (classError || !classInstanceId) return NextResponse.json({ error: "Keine aktive Klasse gefunden." }, { status: 403 });

  let payload: { recipientId?: string; body?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Ungültige Nachricht." }, { status: 400 }); }
  const recipientId = payload.recipientId?.trim();
  const body = payload.body?.trim();
  if (!recipientId || !body || body.length > 4000) return NextResponse.json({ error: "Bitte eine Nachricht mit maximal 4000 Zeichen eingeben." }, { status: 400 });
  if (recipientId === user.id) return NextResponse.json({ error: "Du kannst dir selbst keine Nachricht senden." }, { status: 400 });

  const { data: recipient, error: recipientError } = await supabase.from("user_profiles").select("id").eq("id", recipientId).eq("class_instance_id", classInstanceId).maybeSingle();
  if (recipientError || !recipient) return NextResponse.json({ error: "Du kannst nur Schüler:innen aus deiner Klasse anschreiben." }, { status: 403 });

  const { data: message, error } = await supabase.from("student_direct_messages").insert({ class_instance_id: classInstanceId, sender_id: user.id, recipient_id: recipientId, body }).select("id, sender_id, recipient_id, body, created_at, read_at").single();
  if (error) return NextResponse.json({ error: "Nachricht konnte nicht gesendet werden." }, { status: 500 });
  return NextResponse.json({ message }, { status: 201 });
}
