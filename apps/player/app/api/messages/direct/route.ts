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
    const { data: memberships, error: membershipError } = await supabase
      .from("class_instance_memberships")
      .select("user_id")
      .eq("class_instance_id", classInstanceId)
      .eq("role", "student")
      .is("left_at", null);
    if (membershipError) return NextResponse.json({ error: "Klassenmitglieder konnten nicht geladen werden." }, { status: 500 });

    const memberIds = Array.from(new Set((memberships ?? []).map((membership) => membership.user_id))).filter((id) => id !== user.id);
    const { data: profiles, error } = memberIds.length
      ? await supabase
          .from("user_profiles")
          .select("id, display_name, username, avatar_seed")
          .in("id", memberIds)
          .order("display_name", { ascending: true })
          .limit(200)
      : { data: [], error: null };
    if (error) return NextResponse.json({ error: "Kontakte konnten nicht geladen werden." }, { status: 500 });

    const { data: unreadMessages, error: unreadError } = await supabase
      .from("student_direct_messages")
      .select("sender_id")
      .eq("class_instance_id", classInstanceId)
      .eq("recipient_id", user.id)
      .is("read_at", null);
    if (unreadError) return NextResponse.json({ error: "Ungelesene Nachrichten konnten nicht geladen werden." }, { status: 500 });

    const { data: recentMessages, error: recentMessagesError } = await supabase
      .from("student_direct_messages")
      .select("sender_id, recipient_id, body, created_at")
      .eq("class_instance_id", classInstanceId)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (recentMessagesError) return NextResponse.json({ error: "Nachrichtenvorschau konnte nicht geladen werden." }, { status: 500 });

    const contactIds = new Set(memberIds);
    const latestByContact = new Map<string, { body: string; created_at: string; fromMe: boolean }>();
    for (const message of recentMessages ?? []) {
      const contactId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
      if (!contactIds.has(contactId) || latestByContact.has(contactId)) continue;
      latestByContact.set(contactId, {
        body: message.body,
        created_at: message.created_at,
        fromMe: message.sender_id === user.id,
      });
    }

    const unreadSenderIds = new Set((unreadMessages ?? []).map((message) => message.sender_id));
    return NextResponse.json({
      contacts: (profiles ?? []).map((p) => {
        const latest = latestByContact.get(p.id);
        return {
          id: p.id,
          display_name: p.display_name || p.username || "DR1FT Schüler",
          handle: p.username ? `@${p.username}` : "@dr1ft",
          isDue: unreadSenderIds.has(p.id),
          lastMessage: latest?.body ?? null,
          lastMessageAt: latest?.created_at ?? null,
          lastMessageFromMe: latest?.fromMe ?? false,
        };
      }),
      hasUnread: unreadSenderIds.size > 0,
    });
  }

  const { data: peerMembership, error: peerMembershipError } = await supabase
    .from("class_instance_memberships")
    .select("user_id")
    .eq("user_id", peerId)
    .eq("class_instance_id", classInstanceId)
    .eq("role", "student")
    .is("left_at", null)
    .maybeSingle();
  if (peerMembershipError || !peerMembership) return NextResponse.json({ error: "Dieser Kontakt gehört nicht zu deiner Klasse." }, { status: 404 });

  const { data: peer, error: peerError } = await supabase.from("user_profiles").select("id, display_name, username").eq("id", peerId).maybeSingle();
  if (peerError || !peer) return NextResponse.json({ error: "Kontaktprofil konnte nicht geladen werden." }, { status: 404 });

  const { data: newestFirstMessages, error } = await supabase
    .from("student_direct_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .eq("class_instance_id", classInstanceId)
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "Nachrichten konnten nicht geladen werden." }, { status: 500 });

  // Fetch the newest 500 messages, but return them in chronological order for the UI.
  const messages = (newestFirstMessages ?? []).reverse();
  const unreadIds = messages.filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id);
  if (unreadIds.length) {
    const { error: readError } = await supabase.rpc("mark_student_direct_messages_read", { p_message_ids: unreadIds });
    if (readError) return NextResponse.json({ error: "Nachrichten geladen, Gelesen-Status konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ messages, peer: { id: peer.id, display_name: peer.display_name || peer.username || "DR1FT Schüler" } });
}

export async function POST(request: Request) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });

  const { data: classInstanceId, error: classError } = await supabase.rpc("get_current_class_instance_id");
  if (classError || !classInstanceId) return NextResponse.json({ error: "Keine aktive Klasse gefunden." }, { status: 403 });

  let payload: { recipientId?: string; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Nachricht." }, { status: 400 });
  }

  const recipientId = payload.recipientId?.trim();
  const body = payload.body?.trim();
  if (!recipientId || !body || body.length > 4000) return NextResponse.json({ error: "Bitte eine Nachricht mit maximal 4000 Zeichen eingeben." }, { status: 400 });
  if (recipientId === user.id) return NextResponse.json({ error: "Du kannst dir selbst keine Nachricht senden." }, { status: 400 });

  const { data: senderMembership, error: senderError } = await supabase
    .from("class_instance_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("class_instance_id", classInstanceId)
    .eq("role", "student")
    .is("left_at", null)
    .maybeSingle();
  if (senderError || !senderMembership) return NextResponse.json({ error: "Nur aktive Schüler:innen können Direktnachrichten senden." }, { status: 403 });

  const { data: recipientMembership, error: recipientError } = await supabase
    .from("class_instance_memberships")
    .select("user_id")
    .eq("user_id", recipientId)
    .eq("class_instance_id", classInstanceId)
    .eq("role", "student")
    .is("left_at", null)
    .maybeSingle();
  if (recipientError || !recipientMembership) return NextResponse.json({ error: "Du kannst nur aktive Schüler:innen aus deiner Klasse anschreiben." }, { status: 403 });

  const { data: message, error } = await supabase
    .from("student_direct_messages")
    .insert({ class_instance_id: classInstanceId, sender_id: user.id, recipient_id: recipientId, body })
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .single();
  if (error) return NextResponse.json({ error: "Nachricht konnte nicht gesendet werden." }, { status: 500 });
  return NextResponse.json({ message }, { status: 201 });
}
