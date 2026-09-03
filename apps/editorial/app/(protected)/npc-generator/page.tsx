import { Sparkles, Brain, MessageCircle, Heart, Wand2, Play } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { generateNpcProfile, generateNpcPosts } from "./actions";
import { runNpcWorldTick } from "./tick";
import { NpcInterestSelector } from "./NpcInterestSelector";

export default async function NpcGeneratorPage() {
  const supabase = supabaseServerClient();
  const [{ data: instances }, { data: npcs }, { data: interests }] = await Promise.all([
    supabase.from("class_instances").select("id, name, class_id").order("created_at", { ascending: false }).limit(100),
    supabase.from("npc_profiles").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("ambient_interests").select("key, label, emoji, category").eq("is_active", true).order("sort_order"),
  ]);
  const npcIds = (npcs ?? []).map((n) => n.id);
  const { data: runtimes } = npcIds.length
    ? await supabase.from("npc_instance_profiles").select("*, npc:npc_profiles(display_name, handle)").in("npc_id", npcIds).order("updated_at", { ascending: false })
    : { data: [] };

  return <div className="min-h-screen bg-slate-50 px-6 py-6"><div className="max-w-7xl mx-auto space-y-6">
    <header><div className="flex items-center gap-2 text-violet-600 text-xs font-semibold uppercase tracking-widest mb-2"><Sparkles className="w-4 h-4"/> AI Social World Studio</div><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-900">NPC-Generator</h1><p className="text-slate-500 mt-2 max-w-3xl">Erzeuge NPCs aus Interessen, Stichworten und Kontext. Die Interessen stammen aus demselben Katalog wie bei den Schülern und bilden später die Grundlage für passendes Content-Matching.</p></div></div></header>

    <section className="grid xl:grid-cols-[1fr_1.15fr] gap-5">
      <form action={generateNpcProfile} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 font-semibold text-slate-900"><Wand2 className="w-4 h-4 text-violet-600"/> Neue Figur</div>
        <NpcInterestSelector interests={interests ?? []} />
        <label className="block"><span className="label">STICHWORTE</span><input name="keywords" required placeholder="z.B. ruhig, ehrgeizig, neuer Schüler, Memes" className="control"/></label>
        <label className="block"><span className="label">KONTEXT</span><textarea name="context" rows={5} placeholder="Was passiert gerade in der Klasse? Welche Rolle soll die Figur im sozialen Umfeld haben?" className="control resize-y"/></label>
        <button className="w-full rounded-xl bg-slate-900 text-white px-5 py-3 font-semibold text-sm flex items-center justify-center gap-2"><Sparkles className="w-4 h-4"/> NPC mit Gemini erzeugen</button>
        <p className="text-[11px] text-slate-400">Der NPC wird zunächst als redaktionelle Figur erzeugt. Die Zuordnung zu einer Klasseninstanz erfolgt später im Social-World-Runtime-Layer.</p>
      </form>

      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm"><div className="flex items-center gap-2 font-semibold"><Brain className="w-4 h-4 text-violet-300"/> Virtuelle Seele</div><p className="text-sm text-slate-400 mt-2 leading-6">Die Seele ist kein sichtbarer Spielwert. Sie besteht aus Persona, Stimme, Interessen, Erinnerungen, aktuellem Zustand und Beziehungen. Ereignisse verändern diese Zustände schrittweise und instanzgebunden.</p><div className="grid sm:grid-cols-3 gap-3 mt-6">{[["PERSONA","Werte · Bedürfnisse · Widersprüche"],["GEDÄCHTNIS","Erlebnisse · Reaktionen · Beziehungen"],["AKTIVITÄT","Posts · Likes · Kommentare"]].map(([a,b])=><div key={a} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="text-[10px] tracking-widest text-slate-500">{a}</div><div className="text-xs text-slate-300 mt-2 leading-5">{b}</div></div>)}</div></div>
    </section>

    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"><div><div className="flex items-center gap-2 font-semibold text-slate-900"><Play className="w-4 h-4 text-violet-600"/> Social-World-Taktgeber</div><p className="text-sm text-slate-500 mt-1">Ein Takt lässt die bereits einer Klasseninstanz zugeordneten NPCs auf aktuelle Schülerbeiträge reagieren und gelegentlich selbst etwas in den Feed setzen. Alles bleibt auf die jeweilige Instanz begrenzt.</p></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{(instances ?? []).slice(0,12).map((i:any)=><form key={i.id} action={runNpcWorldTick} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-xs font-semibold text-slate-800 truncate">{i.name ?? "Klasseninstanz"}</div><div className="text-[10px] text-slate-400 truncate">{i.id}</div></div><input type="hidden" name="classInstanceId" value={i.id}/><button className="shrink-0 rounded-lg bg-violet-600 text-white px-3 py-2 text-xs font-semibold">Takt ausführen</button></form>)}</div></section>

    <section className="space-y-3"><h2 className="text-xs font-semibold tracking-widest text-slate-500">NPCs · {npcs?.length ?? 0}</h2><div className="grid lg:grid-cols-2 gap-4">{(npcs ?? []).map((npc: any)=><div key={npc.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"><div className="flex justify-between gap-4"><div><div className="font-semibold text-slate-900">{npc.display_name}</div><div className="text-xs text-slate-400">@{npc.handle} · {npc.age}</div></div><div className="text-xs text-slate-400">{(npc.interests ?? []).slice(0,3).join(" · ")}</div></div><p className="text-sm text-slate-600 leading-6">{npc.context || "Keine Zusatzbeschreibung."}</p><div className="flex flex-wrap gap-1.5">{(npc.keywords ?? []).slice(0,8).map((k:string)=><span key={k} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{k}</span>)}</div>
        <div className="border-t border-slate-100 pt-4 space-y-3">{(runtimes ?? []).filter((r:any)=>r.npc_id===npc.id).length ? (runtimes ?? []).filter((r:any)=>r.npc_id===npc.id).map((runtime:any)=><div key={runtime.id} className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] text-slate-400 mb-2">INSTANZ · {runtime.class_instance_id}</div><div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500"><span>Posts {runtime.activity_state?.posts ?? 0}</span><span>Likes {runtime.activity_state?.likes ?? 0}</span><span>Kommentare {runtime.activity_state?.comments ?? 0}</span></div><div className="flex gap-2 mt-3"><form action={generateNpcPosts} className="flex-1"><input type="hidden" name="npcId" value={npc.id}/><input type="hidden" name="classInstanceId" value={runtime.class_instance_id}/><input type="hidden" name="count" value="3"/><button className="w-full rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-medium"><MessageCircle className="w-3 h-3 inline mr-1"/> 3 Posts</button></form></div></div>) : <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">Noch keiner Klasseninstanz zugeordnet.</div>}</div>
      </div>)}</div></section>

    <section className="bg-white border border-slate-200 rounded-2xl p-6"><div className="flex items-center gap-2 font-semibold text-slate-900"><Heart className="w-4 h-4 text-rose-500"/> Kontextuelle Reaktionen</div><p className="text-sm text-slate-500 mt-2">Der Taktgeber bewertet aktuelle Schülerbeiträge pro NPC mit Persona, Stimme, Zustand und Erinnerungen. Daraus entsteht Like, kurzer Kommentar oder bewusstes Ignorieren. Reaktionen werden als Instanzdaten gespeichert und wieder Teil des NPC-Gedächtnisses.</p></section>
  </div><style>{`.control{width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:13px;background:white;color:#0f172a}.label{display:block;text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:700;color:#64748b;margin-bottom:7px}`}</style></div>;
}
