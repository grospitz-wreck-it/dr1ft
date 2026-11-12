import { NextResponse } from "next/server";
import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";

export async function POST(
  request: Request,
  { params }: { params: { contentId: string } }
) {
  const supabase = supabaseServerClient();
  const body = await request.json().catch(() => ({}));
  const text = String(body.body ?? "").trim().slice(0, 500);

  if (!text) {
    return NextResponse.json({ error: "Kommentar darf nicht leer sein." }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // Comment creation and its learning interaction are written atomically by
  // one authenticated RPC. This avoids a comment being persisted while the
  // now-protected user_interactions INSERT is rejected by RLS/GRANTs.
  const { data: comment, error } = await supabase.rpc("create_student_comment_atomically", {
    p_content_item_id: params.contentId,
    p_body: text,
  });

  if (error) {
    console.error("[comment] RPC failed:", error);
    return NextResponse.json({ error: "Kommentar konnte nicht gespeichert werden." }, { status: 400 });
  }

  return NextResponse.json({ comment });
}
