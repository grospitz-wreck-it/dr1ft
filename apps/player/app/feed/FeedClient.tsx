"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, MessageCircle, Sparkles } from "lucide-react";
import { recordInteraction, startRealtimeEventBridge, eventBus, type DriftState } from "@dr1ft/engine-core";
import type { FeedItem } from "../../lib/types";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { PostCard } from "../../components/PostCard";
import { ReflectionOverlay } from "../../components/ReflectionOverlay";
import { CompetencyPanel } from "../../components/CompetencyPanel";
import type { CompetencyDisplay } from "../../components/CompetencyPanel";
import { DriftSignal } from "../../components/DriftSignal";

export function FeedClient({ initialItems, userId, classInstanceId, likedContentIds, competencyDisplay, profile, driftState }: {
  initialItems: FeedItem[]; userId: string; classInstanceId: string; likedContentIds: Set<string>; competencyDisplay: CompetencyDisplay[];
  profile: { displayName: string; username: string; avatarSeed: string }; driftState: DriftState;
}) {
  const supabase = supabaseBrowserClient();
  const [reflection, setReflection] = useState<{ missionId: string; contentItemId: string } | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => startRealtimeEventBridge(supabase, userId, classInstanceId), [supabase, userId, classInstanceId]);
  useEffect(() => eventBus.on("MissionCompleted", async (event) => {
    if (event.classInstanceId !== classInstanceId) return;
    const { data: mission } = await supabase.from("missions").select("reflection_content_id").eq("id", event.missionId).single();
    if (mission?.reflection_content_id) setReflection({ missionId: event.missionId, contentItemId: mission.reflection_content_id });
  }), [supabase, classInstanceId]);
  function handleView(item: FeedItem) {
    if (seenRef.current.has(item.id)) return;
    seenRef.current.add(item.id);
    void recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "view", classInstanceId });
  }
  const drift = driftState.direction;
  return <main className="min-h-screen text-[#27213d]">
    <header className="max-w-6xl mx-auto pb-7 flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-violet-600 mb-2"><span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 shadow-sm"><Sparkles className="w-4 h-4 text-fuchsia-500" /></span><span className="text-[10px] uppercase tracking-[0.2em] font-bold">Für dich</span></div><h1 className="font-display text-4xl md:text-5xl font-bold tracking-[-0.055em]">Was ist passiert?</h1><p className="text-sm text-[#746d89] mt-2">Dein Feed reagiert auf das, was du bemerkst.</p></div><a href="/messages" className="hidden sm:flex items-center gap-2 rounded-2xl bg-[#171027] text-white px-4 py-3 text-xs font-semibold shadow-lg hover:-translate-y-0.5 transition"><MessageCircle className="w-4 h-4 text-cyan-300" /> Nachrichten</a></header>
    <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,1fr)_310px] gap-7 items-start"><div className="min-w-0 space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#201438] via-[#3b1f62] to-[#172f55] text-white p-7 md:p-8 shadow-[0_24px_70px_rgba(42,20,75,.22)]"><div className="absolute -right-10 -top-20 w-56 h-56 rounded-full bg-fuchsia-500/30 blur-3xl"/><div className="absolute right-24 bottom-[-80px] w-52 h-52 rounded-full bg-cyan-400/25 blur-3xl"/><div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,.20)_1px,transparent_1px)] [background-size:18px_18px]"/><div className="relative"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200/80"><span className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.9)]"/>DR1FT / dein Raum</div><h2 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.05em] mt-3">Schau dich um.</h2><p className="text-sm leading-6 text-white/65 mt-2 max-w-xl">Nicht alles hier will dir etwas verkaufen. Nicht alles will dir gefallen. Manche Dinge wollen nur, dass du mitmachst.</p><div className="mt-6 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.14em] font-semibold"><span className="rounded-full bg-white/10 border border-white/10 px-3 py-1.5">LIVE FEED</span><span className="rounded-full bg-fuchsia-400/15 border border-fuchsia-300/15 px-3 py-1.5 text-fuchsia-100">YOUR SPACE</span><span className="rounded-full bg-cyan-400/10 border border-cyan-300/10 px-3 py-1.5 text-cyan-100">NO SCORE</span></div></div></section>
      {initialItems.length===0&&<div className="rounded-[28px] bg-white/80 border border-dashed border-violet-200 p-12 text-center shadow-sm"><p className="font-display font-semibold">Noch ist es ruhig.</p><p className="text-sm text-[#746d89] mt-2">Für dich sind gerade keine Szenarien freigeschaltet.</p></div>}
      {initialItems.map((item,index)=><div key={item.id} className="space-y-3"><PostCard item={item} userId={userId} classInstanceId={classInstanceId} initiallyLiked={likedContentIds.has(item.id)} onView={()=>handleView(item)}/>{index===2&&<DriftSignal direction={drift}/>}</div>)}
      {initialItems.length>3&&<div className="flex justify-center py-3 text-violet-300"><ArrowDown className="w-4 h-4 animate-bounce"/></div>}
      <div className="md:hidden rounded-[28px] bg-white/85 border border-white p-5 shadow-lg"><CompetencyPanel initial={competencyDisplay}/></div>
    </div><aside className="hidden md:block sticky top-8 space-y-4"><DriftSignal direction={drift}/><div className="rounded-[28px] bg-white/85 border border-white p-5 shadow-lg backdrop-blur-xl"><CompetencyPanel initial={competencyDisplay}/></div></aside></div>
    {reflection&&<ReflectionOverlay contentItemId={reflection.contentItemId} onClose={()=>setReflection(null)}/>}</main>;
}
