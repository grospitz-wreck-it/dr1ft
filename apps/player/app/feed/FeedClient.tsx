"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, MessageCircle, Sparkles } from "lucide-react";
import { recordInteraction, startRealtimeEventBridge, eventBus } from "@dr1ft/engine-core";
import type { FeedItem } from "../../lib/types";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { PostCard } from "../../components/PostCard";
import { ReflectionOverlay } from "../../components/ReflectionOverlay";
import { CompetencyPanel } from "../../components/CompetencyPanel";
import type { CompetencyDisplay } from "../../components/CompetencyPanel";

export function FeedClient({ initialItems, userId, classInstanceId, likedContentIds, competencyDisplay, profile }: {
  initialItems: FeedItem[];
  userId: string;
  classInstanceId: string;
  likedContentIds: Set<string>;
  competencyDisplay: CompetencyDisplay[];
  profile: { displayName: string; username: string; avatarSeed: string };
}) {
  const supabase = supabaseBrowserClient();
  const [reflection, setReflection] = useState<{ missionId: string; contentItemId: string } | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => startRealtimeEventBridge(supabase, userId, classInstanceId), [supabase, userId, classInstanceId]);
  useEffect(() => {
    const unsubscribe = eventBus.on("MissionCompleted", async (event) => {
      if (event.classInstanceId !== classInstanceId) return;
      const { data: mission } = await supabase.from("missions").select("reflection_content_id").eq("id", event.missionId).single();
      if (mission?.reflection_content_id) setReflection({ missionId: event.missionId, contentItemId: mission.reflection_content_id });
    });
    return unsubscribe;
  }, [supabase, classInstanceId]);

  function handleView(item: FeedItem) {
    if (seenRef.current.has(item.id)) return;
    seenRef.current.add(item.id);
    recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "view", classInstanceId });
  }

  return <main className="min-h-screen text-[#26324a]">
    <header className="max-w-4xl mx-auto pb-6 flex items-end justify-between gap-4">
      <div><div className="flex items-center gap-2 text-[#789bd0] mb-2"><span className="grid place-items-center w-7 h-7 rounded-lg bg-[#eef2fa]"><Sparkles className="w-3.5 h-3.5" /></span><span className="text-[10px] uppercase tracking-[0.18em] font-semibold">Für dich</span></div><h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.045em]">Was ist passiert?</h1><p className="text-sm text-[#68738a] mt-2">Dein Feed reagiert auf das, was du bemerkst.</p></div>
      <a href="/messages" className="hidden sm:flex items-center gap-2 rounded-2xl bg-white border border-white px-4 py-3 text-xs font-medium text-[#68738a] shadow-sm hover:-translate-y-0.5 transition"><MessageCircle className="w-4 h-4" /> Nachrichten</a>
    </header>
    <div className="max-w-4xl mx-auto grid md:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
      <div className="min-w-0 space-y-4">
        {initialItems.length === 0 && <div className="rounded-[26px] bg-white/80 border border-dashed border-[#dfe4ee] p-12 text-center"><p className="font-display font-semibold">Noch ist es ruhig.</p><p className="text-sm text-[#68738a] mt-2 max-w-sm mx-auto">Für dich sind gerade keine Szenarien freigeschaltet. Frag deine Lehrkraft, ob eure Klasse schon ein Szenario zugewiesen bekommen hat.</p></div>}
        {initialItems.map((item) => <PostCard key={item.id} item={item} userId={userId} classInstanceId={classInstanceId} initiallyLiked={likedContentIds.has(item.id)} onView={() => handleView(item)} />)}
        {initialItems.length > 3 && <div className="flex justify-center py-3 text-[#a1a9b8]"><ArrowDown className="w-4 h-4 animate-bounce" /></div>}
        <div className="md:hidden rounded-[26px] bg-white border border-white p-5 shadow-[0_12px_40px_rgba(38,50,74,0.05)]"><CompetencyPanel initial={competencyDisplay} /></div>
      </div>
      <aside className="hidden md:block sticky top-8 rounded-[26px] bg-white border border-white p-5 shadow-[0_12px_40px_rgba(38,50,74,0.05)]"><CompetencyPanel initial={competencyDisplay} /></aside>
    </div>
    {reflection && <ReflectionOverlay contentItemId={reflection.contentItemId} onClose={() => setReflection(null)} />}
  </main>;
}
