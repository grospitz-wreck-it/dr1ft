"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { recordInteraction, startRealtimeEventBridge, eventBus } from "@dr1ft/engine-core";
import type { FeedItem } from "../../lib/types";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { PostCard } from "../../components/PostCard";
import { LearningCardFeedItem, type PlayerLearningCard } from "../../components/LearningCardFeedItem";
import { ReflectionOverlay } from "../../components/ReflectionOverlay";
import { TeacherModuleInteraction } from "../../components/TeacherModuleInteraction";

export function FeedClient({ initialItems, userId, classInstanceId, likedContentIds, profile, scenarioIntro, scenarioSummaries = [], scenarioIds = [], scenarioMissionCount = 0, completedScenarioMissionCount = 0, learningCards = [], teacherModules = [] }: {
  initialItems: FeedItem[]; userId: string; classInstanceId: string; likedContentIds: Set<string>;
  profile: { displayName: string; username: string; avatarSeed: string };
  scenarioIntro: { id: string; title: string; description: string | null } | null;
  scenarioSummaries?: Array<{ id: string; title: string; description: string | null; coverImageUrl?: string | null }>;
  scenarioIds?: string[];
  scenarioMissionCount?: number;
  completedScenarioMissionCount?: number;
  learningCards?: PlayerLearningCard[];
  teacherModules?: Array<{ id: string; assignmentId: string; title: string; description: string; titleCardEnabled: boolean; posts: Array<{ id: string; postType: string; title: string; body: string; imageUrl: string | null; embedProvider: string | null; embedUrl: string | null; interactionData: { options?: string[] }; sortOrder: number }> }>;
}) {
  const supabase = supabaseBrowserClient();
  const [reflection, setReflection] = useState<{ missionId: string; contentItemId: string } | null>(null);
  const [scenarioStarted, setScenarioStarted] = useState(false);
  const [scenarioFinished, setScenarioFinished] = useState(false);
  const [scenarioStateLoaded, setScenarioStateLoaded] = useState(false);
  const scenarioStateKey = `dr1ft:scenario-state:${userId}:${classInstanceId}:${[...scenarioIds].sort().join(",") || scenarioIntro?.id || "none"}`;
  const multipleScenarios = scenarioIds.length > 1;
  const scenarioIdsKey = scenarioIds.join(",");

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(scenarioStateKey);
      if (saved) {
        const state = JSON.parse(saved) as { started?: boolean; finished?: boolean };
        setScenarioStarted(state.started === true);
        setScenarioFinished(state.finished === true);
      } else {
        setScenarioStarted(false);
        setScenarioFinished(false);
      }
    } catch {
      setScenarioStarted(false);
      setScenarioFinished(false);
    } finally {
      setScenarioStateLoaded(true);
    }
  }, [scenarioStateKey]);

  useEffect(() => {
    if (!scenarioStateLoaded) return;
    window.sessionStorage.setItem(scenarioStateKey, JSON.stringify({ started: scenarioStarted, finished: scenarioFinished }));
  }, [scenarioStateKey, scenarioStateLoaded, scenarioStarted, scenarioFinished]);
  useEffect(() => {
    if (!scenarioStateLoaded || !scenarioStarted || scenarioFinished) return;
    const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent("dr1ft:scenario-started", {
      detail: { scenarioId: scenarioIntro?.id ?? null, scenarioIds: scenarioIdsKey ? scenarioIdsKey.split(",") : [] },
    })), 0);
    return () => window.clearTimeout(timer);
  }, [scenarioStateLoaded, scenarioStarted, scenarioFinished, scenarioIntro?.id, scenarioIdsKey]);
  const seenRef = useRef<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || visibleCount >= initialItems.length || !scenarioStarted || scenarioFinished) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((current) => Math.min(current + 10, initialItems.length));
      }
    }, { rootMargin: "700px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, initialItems.length, scenarioStarted, scenarioFinished]);
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
  function handleView(item: FeedItem) {
    if (seenRef.current.has(item.id)) return;
    seenRef.current.add(item.id);
    void recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "view", classInstanceId })
      .then((saved) => {
        if (!saved) seenRef.current.delete(item.id);
      })
      .catch((error) => {
        seenRef.current.delete(item.id);
        console.error("[FeedClient] View-Interaktion fehlgeschlagen:", error);
      });
  }
  function handleScenarioStart() {
    if (scenarioStarted) return;
    setScenarioStarted(true);
  }
  return <main className="min-h-screen bg-canvas text-ink"><div className="mx-auto max-w-4xl"><div className="min-w-0 space-y-5">
{(scenarioIntro || multipleScenarios || !teacherModules.length) && <section className="relative overflow-hidden rounded-card border border-ink/10 bg-paper p-6 text-ink shadow-sm md:p-7">
  {multipleScenarios ? <><div className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">{scenarioIds.length} aktive Szenarien</div><h2 className="mt-2 font-display text-2xl font-semibold">{scenarioIntro?.title || "Mehrere Perspektiven. Ein gemeinsamer Feed."}</h2><p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-ink/65">{scenarioIntro?.description?.trim() || "In deinem Feed begegnen dir Inhalte aus mehreren Szenarien."}</p></> :
  <div className="flex items-center justify-between gap-5"><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">{teacherModules.length ? "Dein Lernmodul" : "Dein Szenario"}</div><h2 className="mt-2 font-display text-2xl font-semibold">{scenarioIntro?.title || "Schau genauer hin."}</h2><p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-6 text-ink/65">{scenarioIntro?.description?.trim() || "In diesem Szenario begegnest du Beiträgen und Nachrichten. Schau genau hin und triff deine eigenen Entscheidungen."}</p></div></div>}
  {!scenarioStarted && !scenarioFinished && <div className="mt-5 flex justify-end"><button type="button" onClick={handleScenarioStart} className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:opacity-90"><span>DR1FT starten</span><ArrowRight className="h-4 w-4"/></button></div>}
</section>}
{teacherModules.length > 0 && !scenarioStarted && <div className="space-y-4">{teacherModules.filter(module=>module.titleCardEnabled).map(module=><section key={module.id} className="overflow-hidden rounded-card border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 text-ink shadow-sm md:p-7"><p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-violet-600">Dein Lernmodul</p><h2 className="mt-2 font-display text-2xl font-semibold">{module.title}</h2>{module.description&&<p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-ink/65">{module.description}</p>}</section>)}{!scenarioIntro&&!multipleScenarios&&<div className="flex justify-end"><button type="button" onClick={handleScenarioStart} className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:opacity-90">Lernmodul starten <ArrowRight className="h-4 w-4"/></button></div>}</div>}
{scenarioStarted&&!scenarioFinished&&learningCards.filter(card=>card.position==="before_feed").map(card=><LearningCardFeedItem key={card.id} card={card} classInstanceId={classInstanceId}/>)}{scenarioStarted&&!scenarioFinished&&teacherModules.map(module=><section key={module.id} className="overflow-hidden rounded-card bg-paper text-ink shadow-sm"><div className="space-y-4 p-3 sm:p-4">{module.posts.map(post=><article key={post.id} className="overflow-hidden rounded-card border border-ink/10 bg-paper text-ink shadow-sm"><div className="space-y-3 p-4 sm:p-5">{post.title&&<h3 className="font-display text-lg font-semibold">{post.title}</h3>}{post.body&&<p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{post.body}</p>}{post.imageUrl&&<div className="post-media-stage relative isolate overflow-hidden rounded-[22px]"><img src={post.imageUrl} alt={post.title||"Bild zum Lernbeitrag"} loading="lazy" className="post-media-image relative z-[1] mx-auto block max-h-[75vh] h-auto w-auto max-w-full object-contain"/></div>}{post.embedUrl&&<div className="post-media-stage overflow-hidden rounded-[22px] bg-black"><div className="aspect-video"><iframe src={post.embedUrl} title={post.title||"Eingebettetes Video"} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div></div>}{(post.postType==="poll"||post.postType==="true_false")&&<TeacherModuleInteraction postId={post.id} classInstanceId={classInstanceId} postType={post.postType} interactionData={post.interactionData}/>}</div></article>)}</div></section>)}{scenarioStarted&&!scenarioFinished&&initialItems.length===0&&teacherModules.length===0&&<div className="rounded-[28px] bg-white/80 border border-dashed border-violet-200 p-12 text-center shadow-sm"><p className="font-display font-semibold">Noch ist es ruhig.</p><p className="text-sm text-[#746d89] mt-2">Für dich sind gerade keine Szenarien freigeschaltet.</p></div>}{scenarioStarted&&!scenarioFinished&&initialItems.slice(0,visibleCount).map((item,index)=><div key={item.id} className="space-y-3"><PostCard item={item} userId={userId} classInstanceId={classInstanceId} initiallyLiked={likedContentIds.has(item.id)} onView={()=>handleView(item)}/>{index===2&&<div className="h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent"/>}</div>)}{scenarioStarted&&!scenarioFinished&&visibleCount<initialItems.length&&<div ref={loadMoreRef} className="flex justify-center py-6 text-violet-300" aria-label="Weitere Beiträge werden geladen"><ArrowDown className="w-5 h-5 animate-bounce"/></div>}{scenarioStarted&&!scenarioFinished&&visibleCount>=initialItems.length&&learningCards.filter(card=>card.position==="feed_end").map(card=><LearningCardFeedItem key={card.id} card={card} classInstanceId={classInstanceId}/>)}{scenarioFinished&&<section className="rounded-[26px] border border-violet-100 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50"><CheckCircle2 className="h-6 w-6 text-violet-600"/></span><h2 className="mt-4 font-display text-2xl font-semibold text-[#27213d]">{multipleScenarios ? "Lernlauf beendet" : "Szenario beendet"}</h2><p className="mt-2 text-sm text-[#746d89]">Du kannst jetzt aufhören. Nicht abgeschlossene Aufgaben bleiben offen.</p></section>}</div></div>{reflection&&<ReflectionOverlay contentItemId={reflection.contentItemId} onClose={()=>setReflection(null)}/>}</main>;
}
