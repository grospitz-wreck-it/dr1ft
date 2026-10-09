"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { recordInteraction, startRealtimeEventBridge, eventBus } from "@dr1ft/engine-core";
import type { FeedItem } from "../../lib/types";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { PostCard } from "../../components/PostCard";
import { ReflectionOverlay } from "../../components/ReflectionOverlay";

export function FeedClient({ initialItems, userId, classInstanceId, likedContentIds, profile, scenarioIntro, scenarioMissionCount = 0, completedScenarioMissionCount = 0 }: {
  initialItems: FeedItem[]; userId: string; classInstanceId: string; likedContentIds: Set<string>;
  profile: { displayName: string; username: string; avatarSeed: string };
  scenarioIntro: { id: string; title: string; description: string | null } | null;
  scenarioMissionCount?: number;
  completedScenarioMissionCount?: number;
}) {
  const supabase = supabaseBrowserClient();
  const [reflection, setReflection] = useState<{ missionId: string; contentItemId: string } | null>(null);
  const [scenarioStarted, setScenarioStarted] = useState(false);
  const [scenarioFinished, setScenarioFinished] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => startRealtimeEventBridge(supabase, userId), [supabase, userId, classInstanceId]);

  useEffect(() => {
    let mounted = true;
    const knownCommentIds = new Set<string>();

    const notifyComment = (parentId: string, commentId?: string) => {
      if (!parentId || !mounted) return;
      if (commentId) knownCommentIds.add(commentId);
      window.dispatchEvent(new CustomEvent("dr1ft:comment-created", {
        detail: { parentId, commentId },
      }));
    };

    const channel = supabase
      .channel(`player-feed-comments-${classInstanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "content_items",
          filter: `class_instance_id=eq.${classInstanceId}`,
        },
        (payload) => {
          const row = payload.new as { id?: string; parent_id?: string | null; type?: string };
          if (row.type === "comment" && row.parent_id) notifyComment(row.parent_id, row.id);
        }
      )
      .subscribe();

    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("content_items")
        .select("id, parent_id")
        .eq("class_instance_id", classInstanceId)
        .eq("type", "comment")
        .eq("status", "live")
        .not("parent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mounted) return;
      for (const row of data ?? []) {
        if (knownCommentIds.has(row.id)) continue;
        knownCommentIds.add(row.id);
        notifyComment(row.parent_id as string, row.id);
      }
    }, 5000);

    void (async () => {
      const { data } = await supabase
        .from("content_items")
        .select("id")
        .eq("class_instance_id", classInstanceId)
        .eq("type", "comment")
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(50);
      for (const row of data ?? []) knownCommentIds.add(row.id);
    })();

    return () => {
      mounted = false;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [supabase, classInstanceId]);

  useEffect(() => eventBus.on("MissionCompleted", async (event) => { const { data: mission } = await supabase.from("missions").select("reflection_content_id").eq("id", event.missionId).single(); if (mission?.reflection_content_id) setReflection({ missionId: event.missionId, contentItemId: mission.reflection_content_id }); }), [supabase, classInstanceId]);
  function handleView(item: FeedItem) { if (seenRef.current.has(item.id)) return; seenRef.current.add(item.id); void recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "view", classInstanceId }); }
  function handleScenarioStart() {
    if (scenarioStarted) return;
    setScenarioStarted(true);
    window.dispatchEvent(new CustomEvent("dr1ft:scenario-started", { detail: { scenarioId: scenarioIntro?.id ?? null, userId, classInstanceId, startedAt: new Date().toISOString() } }));
  }
  function handleScenarioFinish() {
    const incomplete = Math.max(0, scenarioMissionCount - completedScenarioMissionCount);
    if (incomplete > 0 && !window.confirm(`Du hast noch ${incomplete} von ${scenarioMissionCount} Aufgaben/Missionen nicht abgeschlossen. Möchtest du das Szenario wirklich beenden?`)) return;
    setScenarioFinished(true);
    window.dispatchEvent(new CustomEvent("dr1ft:scenario-completed", { detail: { scenarioId: scenarioIntro?.id ?? null, userId, classInstanceId, completedAt: new Date().toISOString(), completedMissionCount: completedScenarioMissionCount, totalMissionCount: scenarioMissionCount } }));
  }
  return <main className="min-h-screen text-[#27213d]"><div className="max-w-4xl mx-auto"><div className="min-w-0 space-y-5"><section className="relative overflow-hidden rounded-[26px] border border-violet-100 bg-white/90 p-6 md:p-7 shadow-sm"><div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100"><Sparkles className="h-5 w-5 text-violet-600"/></span><div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Dein Szenario</div><h2 className="mt-2 font-display text-2xl md:text-3xl font-semibold tracking-[-0.04em] text-[#27213d]">{scenarioIntro?.title || "Schau genauer hin."}</h2><p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-[#746d89]">{scenarioIntro?.description?.trim() || "In diesem Szenario begegnest du Beiträgen und Nachrichten. Schau genau hin, ordne ein, was du bemerkst, und triff deine eigenen Entscheidungen."}</p><div className="mt-5 flex justify-end"><button type="button" onClick={handleScenarioStart} className="inline-flex items-center gap-2 rounded-xl bg-[#211632] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"><span>{scenarioStarted ? "Szenario gestartet" : "Szenario starten"}</span><ArrowRight className="h-4 w-4 text-cyan-300"/></button></div></div></div></section>{scenarioStarted&&!scenarioFinished&&initialItems.length===0&&<div className="rounded-[28px] bg-white/80 border border-dashed border-violet-200 p-12 text-center shadow-sm"><p className="font-display font-semibold">Noch ist es ruhig.</p><p className="text-sm text-[#746d89] mt-2">Für dich sind gerade keine Szenarien freigeschaltet.</p></div>}{scenarioStarted&&!scenarioFinished&&initialItems.map((item,index)=><div key={item.id} className="space-y-3"><PostCard item={item} userId={userId} classInstanceId={classInstanceId} initiallyLiked={likedContentIds.has(item.id)} onView={()=>handleView(item)}/>{index===2&&<div className="h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent"/>}</div>)}{scenarioStarted&&!scenarioFinished&&initialItems.length>3&&<div className="flex justify-center py-3 text-violet-300"><ArrowDown className="w-4 h-4 animate-bounce"/></div>}{scenarioStarted&&!scenarioFinished&&<div className="flex justify-end border-t border-violet-100 pt-5"><button type="button" onClick={handleScenarioFinish} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-[#35264d] transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">Szenario abschließen <CheckCircle2 className="h-4 w-4 text-violet-600"/></button></div>}{scenarioFinished&&<section className="rounded-[26px] border border-violet-100 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50"><CheckCircle2 className="h-6 w-6 text-violet-600"/></span><h2 className="mt-4 font-display text-2xl font-semibold text-[#27213d]">Szenario beendet</h2><p className="mt-2 text-sm text-[#746d89]">Du kannst jetzt aufhören. Nicht abgeschlossene Aufgaben bleiben offen.</p></section>}</div></div>{reflection&&<ReflectionOverlay contentItemId={reflection.contentItemId} onClose={()=>setReflection(null)}/>}</main>;
}
