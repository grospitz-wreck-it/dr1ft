import Link from "next/link";
import { MessageSquare, Users } from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function GroupChatHubPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="min-h-screen grid place-items-center"><p className="text-[#68738a]">Bitte einloggen.</p></main>;

  const { data: classInstanceId } = await supabase.rpc("get_current_class_instance_id");
  if (!classInstanceId) return <main className="min-h-screen grid place-items-center"><p className="text-[#68738a]">Keine aktive Klasseninstanz.</p></main>;

  const { data: assignments } = await supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classInstanceId);
  const scenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];
  const emptyId = "00000000-0000-0000-0000-000000000000";
  const { data: chats } = await supabase.from("group_chats").select("id, title, description, scenario_id").eq("status", "live").in("scenario_id", scenarioIds.length ? scenarioIds : [emptyId]);

  return <main className="min-h-screen text-[#26324a]">
    <div className="max-w-3xl mx-auto">
      <header className="px-1 pt-1 pb-7">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#9aa3b5]">Deine Klasse</p><h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.045em] mt-1">Gruppen</h1><p className="text-sm text-[#68738a] mt-2">Was gerade in eurem digitalen Raum passiert.</p></div>
          <span className="hidden sm:grid place-items-center w-12 h-12 rounded-2xl bg-white shadow-sm border border-[#e8ebf2]"><Users className="w-5 h-5 text-[#789bd0]" /></span>
        </div>
      </header>
      <section className="space-y-3">
        {(chats ?? []).map((chat) => <Link key={chat.id} href={`/group-chat/${chat.id}`} className="group block rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_40px_rgba(38,50,74,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(38,50,74,0.10)]">
          <div className="flex gap-4 items-center"><span className="grid place-items-center w-12 h-12 rounded-2xl bg-[#eef2fa] text-[#789bd0] group-hover:scale-105 transition-transform"><MessageSquare className="w-5 h-5" /></span><div className="min-w-0 flex-1"><h2 className="font-display font-semibold text-base">{chat.title}</h2><p className="text-sm text-[#68738a] mt-1 truncate">{chat.description || "Ein Gruppenchat aus eurem aktuellen Szenario."}</p></div><span className="text-[#aab2c0] text-xl group-hover:translate-x-0.5 transition-transform">→</span></div>
        </Link>)}
        {(!chats || chats.length === 0) && <div className="rounded-[24px] border border-dashed border-[#dfe4ee] bg-white/60 p-10 text-center"><p className="font-display font-semibold">Noch keine Gruppe freigeschaltet.</p><p className="text-sm text-[#68738a] mt-2">Sobald eure Lehrkraft ein Szenario aktiviert, tauchen eure Gruppen hier auf.</p></div>}
      </section>
    </div>
  </main>;
}
