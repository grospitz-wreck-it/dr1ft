import Link from "next/link";
import { MessageSquare, Send, Circle, ArrowUpRight, Sparkles } from "lucide-react";
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
    <header className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#17142f] via-[#33205b] to-[#711f70] text-white p-6 md:p-8 mb-6 shadow-[0_24px_70px_rgba(74,36,111,.22)]">
      <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#ff4fd8]/20 blur-3xl" />
      <div className="absolute -left-16 -bottom-24 h-52 w-52 rounded-full bg-[#48d9ff]/20 blur-3xl" />
      <div className="relative flex items-end justify-between gap-5">
        <div><div className="flex items-center gap-2 text-[#8eeaff] mb-2"><Sparkles className="w-3.5 h-3.5" /><span className="text-[9px] uppercase tracking-[0.2em] font-semibold">DR1FT / INBOX</span></div><h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.05em]">Nachrichten</h1><p className="text-sm text-white/60 mt-2 max-w-xl">Gespräche, Hinweise und Dinge, die noch nicht ganz erledigt sind.</p></div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.16em] text-white/55"><span className="h-1.5 w-1.5 rounded-full bg-[#65f5bd] shadow-[0_0_10px_#65f5bd]" /> live</span>
      </div>
    </header>

    {groupChats && groupChats.length > 0 && <section className="mb-7"><div className="flex items-center justify-between mb-3 px-1"><div><p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#8f97ab]">Social</p><h2 className="font-display text-lg font-semibold mt-0.5">Gruppen</h2></div><Link href="/group-chat" className="text-xs font-medium text-[#8b55e8] flex items-center gap-1">Alle ansehen <ArrowUpRight className="w-3.5 h-3.5" /></Link></div><div className="grid sm:grid-cols-2 gap-3">{groupChats.map((gc, index) => <Link key={gc.id} href={`/group-chat/${gc.id}`} className="group relative overflow-hidden flex items-center gap-3 rounded-[22px] bg-white/90 border border-white p-4 shadow-[0_12px_34px_rgba(38,50,74,.06)] hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(103,52,142,.12)] transition-all"><span className={`absolute left-0 inset-y-0 w-1 bg-gradient-to-b ${index % 2 ? "from-[#48d9ff] to-[#8b55e8]" : "from-[#ff4fd8] to-[#ff9c68]"}`} /><span className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f0e7ff] to-[#e0f8ff] text-[#7545c7]"><MessageSquare className="w-5 h-5" /></span><span className="min-w-0 flex-1 font-display font-semibold text-sm truncate">{gc.title}</span><span className="text-[#b0b7c5] group-hover:translate-x-1 transition">→</span></Link>)}</div></section>}

    <section><div className="flex items-end justify-between mb-3 px-1"><div><p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#8f97ab]">Direct</p><h2 className="font-display text-lg font-semibold mt-0.5">Deine Kontakte</h2></div></div><div className="space-y-2">{npcCreators?.map((c, index) => { const resumeAt = pendingByCreator.get(c.id); const isDue = !!resumeAt && new Date(resumeAt) <= new Date(); return <Link key={c.id} href={`/messages/${c.id}`} className="group relative overflow-hidden flex items-center justify-between rounded-[22px] bg-white/90 border border-white px-4 py-3.5 shadow-[0_9px_30px_rgba(38,50,74,.045)] hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(103,52,142,.10)] transition-all"><span className={`absolute left-0 inset-y-0 w-1 bg-gradient-to-b ${index % 3 === 0 ? "from-[#48d9ff] to-[#8b55e8]" : index % 3 === 1 ? "from-[#ff4fd8] to-[#8b55e8]" : "from-[#65f5bd] to-[#48d9ff]"}`} /><span className="flex items-center gap-3 min-w-0"><span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#f0e7ff] to-[#e4f8ff] text-[#7545c7]"><Send className="w-4 h-4" /></span><span className="min-w-0"><span className="block font-medium text-sm truncate">{c.display_name}</span><span className="block text-[11px] text-[#9aa3b5] truncate">{c.handle}</span></span></span>{isDue ? <span className="flex items-center gap-1.5 rounded-full bg-[#fff0f7] px-2.5 py-1 text-xs font-medium text-[#c24b8c]"><Circle className="w-2 h-2 fill-current" /> neu</span> : <span className="text-[#b0b7c5] group-hover:translate-x-0.5 transition">→</span>}</Link>; })}{(!npcCreators || npcCreators.length === 0) && <div className="rounded-[24px] border border-dashed border-[#dfe4ee] bg-white/60 p-10 text-center"><p className="font-display font-semibold text-sm">Noch keine Kontakte.</p><p className="text-xs text-[#68738a] mt-1">Dein nächstes Szenario kann das ändern.</p></div>}</div></section>
  </main>;
}
