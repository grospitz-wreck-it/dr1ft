import Link from "next/link";
import { MessageSquare, Send, Circle, ArrowUpRight } from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function MessagesInboxPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="min-h-screen grid place-items-center"><p className="text-[#68738a]">Bitte einloggen.</p></main>;
  const { data: classInstanceId } = await supabase.rpc("get_current_class_instance_id");
  if (!classInstanceId) return <main className="min-h-screen grid place-items-center"><p className="text-[#68738a]">Du bist aktuell keiner DR1FT-Klasse zugeordnet.</p></main>;

  const { data: assignments } = await supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classInstanceId);
  const scenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];
  const emptyId = "00000000-0000-0000-0000-000000000000";
  const scopedScenarioIds = scenarioIds.length ? scenarioIds : [emptyId];
  const [{ data: npcCreators }, { data: groupChats }, { data: pending }] = await Promise.all([
    supabase.from("creators").select("id, display_name, handle").eq("kind", "npc").in("scenario_id", scopedScenarioIds),
    supabase.from("group_chats").select("id, title").eq("status", "live").in("scenario_id", scopedScenarioIds),
    supabase.from("user_npc_conversations").select("creator_id, pending_resume_at").eq("user_id", user.id).eq("class_instance_id", classInstanceId),
  ]);
  const pendingByCreator = new Map((pending ?? []).map((p) => [p.creator_id, p.pending_resume_at]));

  return <main className="min-h-screen text-[#26324a] max-w-3xl mx-auto">
    <header className="pb-7"><p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#9aa3b5]">Dein Space</p><h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.045em] mt-1">Nachrichten</h1><p className="text-sm text-[#68738a] mt-2">Gespräche, Hinweise und Dinge, die noch nicht ganz erledigt sind.</p></header>
    {groupChats && groupChats.length > 0 && <section className="mb-7"><div className="flex items-center justify-between mb-3"><p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#9aa3b5]">Gruppen</p><Link href="/group-chat" className="text-xs font-medium text-[#789bd0] flex items-center gap-1">Alle ansehen <ArrowUpRight className="w-3.5 h-3.5" /></Link></div><div className="grid sm:grid-cols-2 gap-3">{groupChats.map((gc) => <Link key={gc.id} href={`/group-chat/${gc.id}`} className="group flex items-center gap-3 rounded-[22px] bg-white/85 border border-white p-4 shadow-[0_10px_32px_rgba(38,50,74,0.05)] hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(38,50,74,0.09)] transition-all"><span className="grid place-items-center w-11 h-11 rounded-2xl bg-[#eef2fa] text-[#789bd0]"><MessageSquare className="w-5 h-5" /></span><span className="min-w-0 flex-1 font-display font-semibold text-sm truncate">{gc.title}</span><span className="text-[#b0b7c5] group-hover:translate-x-0.5 transition">→</span></Link>)}</div></section>}
    <section><p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#9aa3b5] mb-3">Direktnachrichten</p><div className="space-y-2">{npcCreators?.map((c) => { const resumeAt = pendingByCreator.get(c.id); const isDue = !!resumeAt && new Date(resumeAt) <= new Date(); return <Link key={c.id} href={`/messages/${c.id}`} className="group flex items-center justify-between rounded-[22px] bg-white/85 border border-white px-4 py-3.5 shadow-[0_8px_28px_rgba(38,50,74,0.04)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(38,50,74,0.08)] transition-all"><span className="flex items-center gap-3 min-w-0"><span className="grid place-items-center w-10 h-10 rounded-xl bg-[#f0f3fa] text-[#8791a5]"><Send className="w-4 h-4" /></span><span className="min-w-0"><span className="block font-medium text-sm truncate">{c.display_name}</span><span className="block text-[11px] text-[#9aa3b5] truncate">{c.handle}</span></span></span>{isDue ? <span className="flex items-center gap-1.5 text-xs font-medium text-[#c47b70]"><Circle className="w-2 h-2 fill-current" /> neu</span> : <span className="text-[#b0b7c5] group-hover:translate-x-0.5 transition">→</span>}</Link>; })}{(!npcCreators || npcCreators.length === 0) && <div className="rounded-[22px] border border-dashed border-[#dfe4ee] bg-white/60 p-9 text-center"><p className="font-display font-semibold text-sm">Noch keine Kontakte.</p><p className="text-xs text-[#68738a] mt-1">Dein nächstes Szenario kann das ändern.</p></div>}</div></section>
  </main>;
}
