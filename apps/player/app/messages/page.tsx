// apps/player/app/messages/page.tsx

import { ChevronLeft, MessageSquare, Send, Circle } from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function MessagesInboxPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Bitte einloggen.</p></main>;

  const { data: classInstanceId } = await supabase.rpc("get_current_class_instance_id");
  if (!classInstanceId) return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Du bist aktuell keiner DR1FT-Klasse zugeordnet.</p></main>;

  const { data: assignments } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classInstanceId);
  const scenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];
  const emptyId = "00000000-0000-0000-0000-000000000000";
  const scopedScenarioIds = scenarioIds.length ? scenarioIds : [emptyId];

  const { data: npcCreators } = await supabase
    .from("creators")
    .select("id, display_name, handle")
    .eq("kind", "npc")
    .in("scenario_id", scopedScenarioIds);

  const { data: groupChats } = await supabase
    .from("group_chats")
    .select("id, title")
    .eq("status", "live")
    .in("scenario_id", scopedScenarioIds);

  const { data: pending } = await supabase
    .from("user_npc_conversations")
    .select("creator_id, pending_resume_at")
    .eq("user_id", user.id)
    .eq("class_instance_id", classInstanceId);
  const pendingByCreator = new Map((pending ?? []).map((p) => [p.creator_id, p.pending_resume_at]));

  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3 flex items-center justify-between">
        <a href="/feed" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash"><ChevronLeft className="w-4 h-4" /> Feed</a>
        <p className="font-display text-paper text-sm">Nachrichten</p><span className="w-11" />
      </header>
      <div className="max-w-md mx-auto px-3 py-4 space-y-6">
        {groupChats && groupChats.length > 0 && <section><p className="font-mono text-[11px] text-ash uppercase tracking-wide mb-2">Gruppenchats</p><div className="space-y-2">{groupChats.map((gc) => <a key={gc.id} href={`/group-chat/${gc.id}`} className="flex items-center gap-2 bg-paper text-ink rounded-card px-4 py-3 text-sm touch-target"><MessageSquare className="w-4 h-4 shrink-0" /> {gc.title}</a>)}</div></section>}
        <section><p className="font-mono text-[11px] text-ash uppercase tracking-wide mb-2">Direktnachrichten</p><div className="space-y-2">
          {npcCreators?.map((c) => { const resumeAt = pendingByCreator.get(c.id); const isDue = resumeAt && new Date(resumeAt) <= new Date(); return <a key={c.id} href={`/messages/${c.id}?classInstanceId=${classInstanceId}`} className="flex items-center justify-between bg-paper text-ink rounded-card px-4 py-3 text-sm touch-target"><span className="flex items-center gap-2"><Send className="w-4 h-4 text-ink/40 shrink-0" />{c.display_name} <span className="text-ink/40">{c.handle}</span></span>{isDue && <span className="flex items-center gap-1 text-xs text-red-500"><Circle className="w-2 h-2 fill-current" /> neu</span>}</a>; })}
          {(!npcCreators || npcCreators.length === 0) && <p className="text-ash text-sm">Noch keine Kontakte.</p>}
        </div></section>
      </div>
    </main>
  );
}
