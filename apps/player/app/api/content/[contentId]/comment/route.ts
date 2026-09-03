import { NextResponse } from "next/server";
import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";

export async function POST(request: Request, { params }: { params: { contentId: string } }) {
  const supabase = supabaseServerClient();
  const body = await request.json().catch(() => ({}));
  const text = String(body.body ?? "").trim().slice(0, 500);
  if (!text) return NextResponse.json({ error: "Kommentar darf nicht leer sein." }, { status: 400 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { data: content } = await supabase
    .from("content_items")
    .select("id,class_instance_id,status,type")
    .eq("id", params.contentId)
    .maybeSingle();

  if (!content?.class_instance_id || content.status !== "live" || content.type !== "post") {
    return NextResponse.json({ error: "Beitrag nicht verfügbar." }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("class_instance_memberships")
    .select("id")
    .eq("class_instance_id", content.class_instance_id)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Kein Zugriff auf diese Instanz." }, { status: 403 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, username, avatar_seed")
    .eq("id", user.id)
    .maybeSingle();

  const studentAuthor = {
    studentUserId: user.id,
    displayName: profile?.display_name ?? "Du",
    username: profile?.username ?? "du",
    avatarSeed: profile?.avatar_seed ?? user.id,
  };

  const { data: comment, error } = await supabase
    .from("content_items")
    .insert({
      type: "comment",
      scenario_id: null,
      creator_id: null,
      parent_id: content.id,
      class_instance_id: content.class_instance_id,
      body: text,
      status: "live",
      manipulation_techniques: [],
      target_competencies: [],
      difficulty: 1,
      age_rating: "12_plus",
      extra: { createdBy: "student", ...studentAuthor },
    })
    .select("id,body,created_at,extra")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("user_interactions").insert({
    user_id: user.id,
    content_item_id: content.id,
    interaction_type: "comment",
    class_instance_id: content.class_instance_id,
    metadata: { commentId: comment.id },
  });

  return NextResponse.json({ comment });
}
