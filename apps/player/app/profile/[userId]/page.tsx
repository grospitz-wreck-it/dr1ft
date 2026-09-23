import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { avatarUrl } from "../../../lib/avatar";

export default async function PublicProfilePage({ params }: { params: { userId: string } }) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="min-h-screen bg-ink text-paper flex items-center justify-center">Bitte einloggen.</main>;

  const { data: instanceId } = await supabase.rpc("get_current_class_instance_id");
  if (!instanceId) return notFound();

  const { data: visibleMembership } = await supabase
    .from("class_instance_memberships")
    .select("user_id")
    .eq("class_instance_id", instanceId)
    .eq("user_id", params.userId)
    .is("left_at", null)
    .maybeSingle();
  if (!visibleMembership) return notFound();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, username, avatar_seed")
    .eq("id", params.userId)
    .maybeSingle();
  if (!profile) return notFound();

  return <main className="min-h-screen bg-ink text-paper px-4 py-8">
    <div className="max-w-md mx-auto">
      <Link href="/feed" className="text-xs text-ash">← Feed</Link>
      <section className="mt-6 bg-ink-light border border-ink-border rounded-card p-6 text-center">
        <img src={avatarUrl(profile.avatar_seed ?? params.userId, 220)} alt="" className="w-28 h-28 rounded-full bg-paper mx-auto" />
        <h1 className="font-display text-2xl mt-4">{profile.display_name ?? "DR1FT User"}</h1>
        <p className="text-sm text-ash mt-1">@{profile.username ?? "user"}</p>
        <p className="text-xs text-ash mt-5">Mitschüler:in deiner aktuellen Klasseninstanz</p>
      </section>
    </div>
  </main>;
}
