import { NextResponse } from "next/server";
import { supabaseServerClient } from "../../../../lib/supabaseServerClient";

export async function POST(request: Request) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });

  const { data: classInstanceId, error: classError } = await supabase.rpc("get_current_class_instance_id");
  if (classError || !classInstanceId) return NextResponse.json({ error: "Keine aktive Klasse gefunden." }, { status: 403 });

  let payload: { messageId?: string; peerId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Meldung." }, { status: 400 });
  }

  if (!payload.messageId || !payload.peerId) {
    return NextResponse.json({ error: "Die Meldung ist unvollständig." }, { status: 400 });
  }

  const { data: message, error: messageError } = await supabase
    .from("student_direct_messages")
    .select("id, sender_id, recipient_id")
    .eq("id", payload.messageId)
    .eq("class_instance_id", classInstanceId)
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${payload.peerId}),and(sender_id.eq.${payload.peerId},recipient_id.eq.${user.id})`)
    .maybeSingle();

  if (messageError || !message) {
    return NextResponse.json({ error: "Diese Nachricht konnte nicht gefunden werden." }, { status: 404 });
  }

  const { error: insertError } = await supabase
    .from("student_message_reports")
    .insert({
      class_instance_id: classInstanceId,
      reporter_id: user.id,
      reported_message_id: message.id,
      other_user_id: payload.peerId,
    });

  if (insertError) {
    // Keep the student-facing response calm, but retain the actual database
    // error in the server log so schema/RLS issues are traceable.
    console.error("DR1FT message report insert failed", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });
    // A repeated tap on an already stored report should not look like a failure.
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    return NextResponse.json({ error: "Die Meldung konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
