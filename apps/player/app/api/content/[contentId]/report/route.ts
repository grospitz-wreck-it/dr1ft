import { NextResponse } from "next/server";
import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";

export async function POST(request: Request, { params }: { params: { contentId: string } }) {
  const supabase = supabaseServerClient();
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "other");
  const details = String(body.details ?? "").trim().slice(0, 500) || null;
  if (!["uncomfortable", "insulting", "threatening", "inappropriate", "other"].includes(reason)) return NextResponse.json({ error: "Ungültiger Meldegrund." }, { status: 400 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { data: content } = await supabase.from("content_items").select("id,class_instance_id").eq("id", params.contentId).maybeSingle();
  if (!content?.class_instance_id) return NextResponse.json({ error: "Beitrag nicht gefunden." }, { status: 404 });
  const { data: membership } = await supabase.from("class_instance_memberships").select("id").eq("class_instance_id", content.class_instance_id).eq("user_id", user.id).is("left_at", null).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Kein Zugriff auf diese Instanz." }, { status: 403 });
  const { error } = await supabase.from("content_reports").insert({ class_instance_id: content.class_instance_id, content_item_id: content.id, reporter_user_id: user.id, reason, details });
  if (error?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
