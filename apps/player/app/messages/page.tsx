// apps/player/app/messages/page.tsx
// Bisher fehlender Einstiegspunkt: NPC-Dialoge existierten als Engine,
// waren aber im Feed nirgends erreichbar. Diese Seite listet alle
// ansprechbaren NPCs + aktive Gruppenchats der freigeschalteten Szenarien.

import { ChevronLeft, MessageSquare, Send, Circle, Sparkles, Users, Inbox } from "lucide-react";
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
    <main className="relative isolate min-h-screen overflow-hidden bg-ink">
      <img src="/branding/bg-neon-circle.webp" alt="" aria-hidden="true" className="pointer-events-none absolute -top-20 -right-36 z-[-1] w-[28rem] max-w-none opacity-25 dark:opacity-30" />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-border/70 bg-ink/80 px-4 py-3 backdrop-blur-xl safe-top">
        <a href="/feed" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash">
          <ChevronLeft className="w-4 h-4" /> Feed
        </a>
        <p className="font-display text-paper text-sm">Nachrichten</p>
        <span className="w-11" />
      </header>

      <div className="mx-auto max-w-2xl space-y-7 px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-paper/[0.09] via-paper/[0.04] to-transparent p-5 shadow-xl shadow-black/10 sm:p-7">
          <div className="pointer-events-none absolute -right-5 -top-8 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/20"><Inbox className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Dein DR1FT-Postfach</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-paper sm:text-3xl">Alles im Gespräch.</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-ash">Nachrichten aus Szenarien, Gruppenchats und Beiträge, die mit dir geteilt wurden – alles an einem Ort.</p>
            </div>
          </div>
        </section>
        {receivedShares && receivedShares.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/10 text-accent"><Sparkles className="h-4 w-4" /></span><p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper">Mit dir geteilt</p></div>
            <div className="space-y-3">
              {receivedShares.map((share) => {
                const sender = sharedSenderById.get(share.user_id);
                const post = sharedPostById.get(share.content_item_id);
                if (!post) return null;
                const senderName = sender?.display_name || sender?.username || "Ein Klassenkamerad";
                return <article key={share.id} className="rounded-3xl border border-white/10 bg-paper p-4 text-ink shadow-lg shadow-black/10 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
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
            <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><Users className="h-4 w-4" /></span><p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper">Gruppenchats</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {groupChats.map((gc) => (
                <a
                  key={gc.id}
                  href={`/group-chat/${gc.id}`}
                  className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-white/10 bg-paper/[0.07] px-4 py-4 text-sm text-paper shadow-sm transition hover:border-accent/40 hover:bg-paper/[0.1] touch-target"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><MessageSquare className="h-4 w-4" /></span><span className="min-w-0 flex-1 font-medium">{gc.title}</span><span className="text-ash transition group-hover:translate-x-0.5">↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Send className="h-4 w-4" /></span><p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper">Direktnachrichten</p></div>
          <div className="space-y-2.5">
            {npcCreators?.map((c) => {
              const resumeAt = pendingByCreator.get(c.id);
              const isDue = resumeAt && new Date(resumeAt) <= new Date();
              return (
                <a
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-paper/[0.07] px-4 py-3.5 text-sm text-paper transition hover:border-accent/40 hover:bg-paper/[0.1] touch-target"
                >
                  <span className="flex items-center gap-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Send className="h-4 w-4" /></span>
                    <span className="min-w-0"><span className="block font-medium">{c.display_name}</span><span className="mt-0.5 block text-xs text-ash">{c.handle}</span></span>
                  </span>
                  {isDue && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <Circle className="w-2 h-2 fill-current" /> neu
                    </span>
                  )}
                </a>
              );
            })}
            {(!npcCreators || npcCreators.length === 0) && (
              <div className="flex items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-paper/[0.03] p-4"><img src="/branding/chat.webp" alt="" className="h-16 w-16 shrink-0 object-contain" /><div><p className="text-sm font-medium text-paper">Noch keine Kontakte</p><p className="mt-1 text-xs leading-5 text-ash">Sobald ein Szenario Gespräche freischaltet, tauchen sie hier auf.</p></div></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
