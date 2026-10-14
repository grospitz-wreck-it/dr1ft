// apps/player/app/messages/page.tsx
// Bisher fehlender Einstiegspunkt: NPC-Dialoge existierten als Engine,
// waren aber im Feed nirgends erreichbar. Diese Seite listet alle
// ansprechbaren NPCs + aktive Gruppenchats der freigeschalteten Szenarien.

import MessagesWorkspace from "./MessagesWorkspace";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function MessagesInboxPage() {
  const supabase = supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-ash text-sm">Bitte einloggen.</p>
      </main>
    );
  }

  const { data: classInstanceId } = await supabase.rpc("get_current_class_instance_id");

  if (!classInstanceId) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-ash text-sm">Keine aktive Klasseninstanz.</p>
      </main>
    );
  }

  const { data: receivedShares } = await supabase
    .from("user_interactions")
    .select("id, user_id, content_item_id, created_at, metadata")
    .eq("class_instance_id", classInstanceId)
    .eq("interaction_type", "share")
    .filter("metadata->>recipient_user_id", "eq", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const sharedContentIds = Array.from(new Set((receivedShares ?? []).map((share) => share.content_item_id)));
  const sharedSenderIds = Array.from(new Set((receivedShares ?? []).map((share) => share.user_id)));
  const [{ data: sharedPosts }, { data: sharedSenders }] = await Promise.all([
    sharedContentIds.length
      ? supabase.from("content_items").select("id, body, title, media_url, media_type").in("id", sharedContentIds)
      : Promise.resolve({ data: [] as { id: string; body: string | null; title: string | null; media_url: string | null; media_type: string | null }[] }),
    sharedSenderIds.length
      ? supabase.from("user_profiles").select("id, display_name, username, avatar_seed").in("id", sharedSenderIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null; username: string | null; avatar_seed: string | null }[] }),
  ]);
  const sharedPostById = new Map((sharedPosts ?? []).map((post) => [post.id, post]));
  const sharedSenderById = new Map((sharedSenders ?? []).map((sender) => [sender.id, sender]));

  const { data: assignments } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classInstanceId);
  const scenarioIds = Array.from(new Set((assignments ?? []).map((a) => a.scenario_id)));

  const { data: npcCreators } = await supabase
    .from("creators")
    .select("id, display_name, handle")
    .eq("kind", "npc")
    .in("scenario_id", scenarioIds.length ? scenarioIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: groupChats } = await supabase
    .from("group_chats")
    .select("id, title")
    .eq("status", "live")
    .in("scenario_id", scenarioIds.length ? scenarioIds : ["00000000-0000-0000-0000-000000000000"]);

  // Anstehende/fällige Konsequenzen für ein "neu"-Signal
  const { data: pending } = await supabase
    .from("user_npc_conversations")
    .select("creator_id, pending_resume_at")
    .eq("user_id", user.id)
    .eq("class_instance_id", classInstanceId);
  const pendingByCreator = new Map(
    (pending ?? []).map((p) => [p.creator_id, p.pending_resume_at])
  );

  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3 flex items-center justify-between">
        <a href="/feed" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash">
          <ChevronLeft className="w-4 h-4" /> Feed
        </a>
        <p className="font-display text-paper text-sm">Nachrichten</p>
        <span className="w-11" />
      </header>

      <div className="max-w-md mx-auto px-3 py-4 space-y-6">
        {receivedShares && receivedShares.length > 0 && (
          <section>
            <p className="font-mono text-[11px] text-ash uppercase tracking-wide mb-2">Mit dir geteilt</p>
            <div className="space-y-2">
              {receivedShares.map((share) => {
                const sender = sharedSenderById.get(share.user_id);
                const post = sharedPostById.get(share.content_item_id);
                if (!post) return null;
                const senderName = sender?.display_name || sender?.username || "Ein Klassenkamerad";
                return <article key={share.id} className="rounded-2xl border border-ink/10 bg-paper p-4 text-ink shadow-sm">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink/5 text-xs font-semibold">{sender?.avatar_seed ? <img src={`https://api.dicebear.com/10.x/voxel-art/svg?seed=${encodeURIComponent(sender.avatar_seed)}&size=72`} alt="" className="h-full w-full object-cover"/> : senderName.slice(0,1).toUpperCase()}</span>
                    <span><strong>{senderName}</strong> hat einen Beitrag mit dir geteilt.<span className="block text-xs text-ink/45">{new Date(share.created_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</span></span>
                  </div>
                  <p className="mt-3 text-sm leading-6">{post.body || post.title || "Geteilter Beitrag"}</p>
                  {post.media_url && post.media_type === "image" && <img src={post.media_url} alt="" className="mt-3 max-h-56 w-full rounded-xl object-cover"/>}
                  <a href={`/feed#post-${post.id}`} className="mt-3 inline-flex rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-paper">Beitrag im Feed ansehen</a>
                </article>;
              })}
            </div>
          </section>
        )}
        {groupChats && groupChats.length > 0 && (
          <section>
            <p className="font-mono text-[11px] text-ash uppercase tracking-wide mb-2">
              Gruppenchats
            </p>
            <div className="space-y-2">
              {groupChats.map((gc) => (
                <a
                  key={gc.id}
                  href={`/group-chat/${gc.id}`}
                  className="flex items-center gap-2 bg-paper text-ink rounded-card px-4 py-3 text-sm touch-target"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" /> {gc.title}
                </a>
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="font-mono text-[11px] text-ash uppercase tracking-wide mb-2">
            Direktnachrichten
          </p>
          <div className="space-y-2">
            {npcCreators?.map((c) => {
              const resumeAt = pendingByCreator.get(c.id);
              const isDue = resumeAt && new Date(resumeAt) <= new Date();
              const contacts = (npcCreators ?? []).map((creator) => {
    const resumeAt = pendingByCreator.get(creator.id);
    return {
      id: creator.id,
      display_name: creator.display_name,
      handle: creator.handle,
      isDue: Boolean(resumeAt && new Date(resumeAt) <= new Date()),
    };
  });

  const shares = (receivedShares ?? []).flatMap((share) => {
    const post = sharedPostById.get(share.content_item_id);
    if (!post) return [];
    const sender = sharedSenderById.get(share.user_id);
    return [{
      id: share.id,
      created_at: share.created_at,
      senderName: sender?.display_name || sender?.username || "Ein Klassenkamerad",
      senderSeed: sender?.avatar_seed ?? null,
      text: post.body || post.title || "Geteilter Beitrag",
      mediaUrl: post.media_url && post.media_type === "image" ? post.media_url : null,
      postId: post.id,
    }];
  });

  return <MessagesWorkspace contacts={contacts} groupChats={groupChats ?? []} shares={shares} />;
}
