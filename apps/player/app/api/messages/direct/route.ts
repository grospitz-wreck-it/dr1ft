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
    // Students cannot enumerate class_instance_memberships through RLS.
    // Use the existing security-definer RPC, which returns only active peers
    // in the caller's own active class.
    const { data: peers, error: peersError } = await supabase.rpc("get_student_class_peers", {
      p_class_instance_id: classInstanceId,
    });
    if (peersError) return NextResponse.json({ error: "Klassenmitglieder konnten nicht geladen werden." }, { status: 500 });

    const peerProfiles = (peers ?? []).map((peer: { peer_user_id: string; display_name: string; username: string }) => ({
      id: peer.peer_user_id,
      display_name: peer.display_name,
      username: peer.username,
    }));
    const memberIds = peerProfiles.map((profile) => profile.id);
    // Avatar seeds are presentation data only. Fetch them only for IDs already
    // authorized by the class-scoped peer RPC; never enumerate all profiles.
    const { data: avatarProfiles, error: avatarError } = memberIds.length
      ? await supabase.from("user_profiles").select("id, avatar_seed").in("id", memberIds)
      : { data: [], error: null };
    if (avatarError) return NextResponse.json({ error: "Profilbilder konnten nicht geladen werden." }, { status: 500 });
    const avatarSeedById = new Map((avatarProfiles ?? []).map((profile) => [profile.id, profile.avatar_seed]));
    const profiles = peerProfiles.map((profile) => ({
      ...profile,
      avatar_seed: avatarSeedById.get(profile.id) ?? profile.id,
    }));

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

  const { data: peers, error: peersError } = await supabase.rpc("get_student_class_peers", {
    p_class_instance_id: classInstanceId,
  });
  if (peersError) return NextResponse.json({ error: "Kontakte konnten nicht geprüft werden." }, { status: 500 });
  const peer = (peers ?? []).find((candidate: { peer_user_id: string }) => candidate.peer_user_id === peerId);
  if (!peer) return NextResponse.json({ error: "Dieser Kontakt gehört nicht zu deiner Klasse." }, { status: 404 });
  const { data: peerProfile, error: peerProfileError } = await supabase
    .from("user_profiles")
    .select("avatar_seed")
    .eq("id", peerId)
    .maybeSingle();
  if (peerProfileError) return NextResponse.json({ error: "Kontaktprofil konnte nicht geladen werden." }, { status: 500 });

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

  return NextResponse.json({ messages, peer: { id: peer.peer_user_id, display_name: peer.display_name || peer.username || "DR1FT Schüler", avatar_seed: peerProfile?.avatar_seed ?? peer.peer_user_id } });
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

  // The peer RPC validates the caller's active student membership and
  // confirms that the recipient is an active student in the same class.
  const { data: peers, error: peersError } = await supabase.rpc("get_student_class_peers", {
    p_class_instance_id: classInstanceId,
  });
  if (peersError) return NextResponse.json({ error: "Deine Klassenkontakte konnten nicht geprüft werden." }, { status: 403 });
  const isClassPeer = (peers ?? []).some((peer: { peer_user_id: string }) => peer.peer_user_id === recipientId);
  if (!isClassPeer) return NextResponse.json({ error: "Du kannst nur aktive Schüler:innen aus deiner Klasse anschreiben." }, { status: 403 });

  const { data: message, error } = await supabase
    .from("student_direct_messages")
    .insert({ class_instance_id: classInstanceId, sender_id: user.id, recipient_id: recipientId, body })
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .single();
  if (error) return NextResponse.json({ error: "Nachricht konnte nicht gesendet werden." }, { status: 500 });
  return NextResponse.json({ message }, { status: 201 });
}
