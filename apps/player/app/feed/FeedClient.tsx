"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { recordInteraction, startRealtimeEventBridge, eventBus } from "@dr1ft/engine-core";
import type { FeedItem } from "../../lib/types";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { PostCard } from "../../components/PostCard";
import { LearningCardFeedItem, type PlayerLearningCard } from "../../components/LearningCardFeedItem";
import { ReflectionOverlay } from "../../components/ReflectionOverlay";

type PlayerTeacherModule = {
  id: string; title: string; description: string | null; intro_title: string | null; intro_text: string | null;
  title_card_enabled: boolean;
  posts: Array<{ id: string; post_type: string; title: string | null; body: string | null; imageUrl: string | null; embed_provider: string | null; embed_url: string | null; interaction_data: Record<string, any> | null; sort_order: number }>;
};

export function FeedClient({ initialItems, teacherModules = [], userId, classInstanceId, likedContentIds, profile, scenarioIntro, scenarioSummaries = [], scenarioIds = [], scenarioMissionCount = 0, completedScenarioMissionCount = 0, learningCards = [] }: {
  initialItems: FeedItem[]; teacherModules?: PlayerTeacherModule[]; userId: string; classInstanceId: string; likedContentIds: Set<string>;
  profile: { displayName: string; username: string; avatarSeed: string };
  scenarioIntro: { id: string; title: string; description: string | null } | null;
  scenarioSummaries?: Array<{ id: string; title: string; description: string | null; coverImageUrl?: string | null }>;
  scenarioIds?: string[];
  scenarioMissionCount?: number;
  completedScenarioMissionCount?: number;
  learningCards?: PlayerLearningCard[];
}) {
  const supabase = supabaseBrowserClient();
  const [reflection, setReflection] = useState<{ missionId: string; contentItemId: string } | null>(null);
  const [moduleSelections, setModuleSelections] = useState<Record<string, string[]>>({});
  const [moduleFreeText, setModuleFreeText] = useState<Record<string, string>>({});
  const [moduleSubmitting, setModuleSubmitting] = useState<Record<string, boolean>>({});
  const [moduleSubmitted, setModuleSubmitted] = useState<Record<string, boolean>>({});
  const [moduleVoteErrors, setModuleVoteErrors] = useState<Record<string, string>>({});

  async function submitTeacherModuleAnswer(moduleId: string, post: PlayerTeacherModule["posts"][number]) {
    const config = post.interaction_data ?? {};
    const responseMode = config.responseMode ?? "single";
    const selected = moduleSelections[post.id] ?? [];
    const textAnswer = (moduleFreeText[post.id] ?? "").trim();
    if (responseMode === "free_text" ? !textAnswer : selected.length === 0) {
      setModuleVoteErrors((current) => ({ ...current, [post.id]: "Bitte gib eine Antwort ein." }));
      return;
    }
    setModuleSubmitting((current) => ({ ...current, [post.id]: true }));
    setModuleVoteErrors((current) => ({ ...current, [post.id]: "" }));
    try {
      const choice = selected[0] ?? null;
      const { error } = await supabase.from("teacher_module_post_votes").upsert({
        post_id: post.id,
        module_id: moduleId,
        class_instance_id: classInstanceId,
        user_id: userId,
        choice,
        selected_choices: selected,
        text_answer: responseMode === "free_text" ? textAnswer : null,
      }, { onConflict: "post_id,user_id" });
      if (error) throw error;
      setModuleSubmitted((current) => ({ ...current, [post.id]: true }));
    } catch (error) {
      console.error("[Player] teacher module answer failed", error);
      setModuleVoteErrors((current) => ({ ...current, [post.id]: "Deine Antwort konnte gerade nicht gespeichert werden. Bitte versuche es erneut." }));
    } finally {
      setModuleSubmitting((current) => ({ ...current, [post.id]: false }));
    }
  }
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
  return <main className="min-h-screen text-[#27213d]"><div className="max-w-4xl mx-auto"><div className="min-w-0 space-y-5">{(multipleScenarios || scenarioIntro) && <section className="relative overflow-hidden rounded-[26px] border border-violet-100 bg-white/90 p-6 shadow-sm md:p-7">
  {multipleScenarios ? (
    <>
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100"><Sparkles className="h-5 w-5 text-violet-600" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">{scenarioIds.length} aktive Szenarien</div>
          <h2 className="mt-2 max-w-full break-words [overflow-wrap:anywhere] font-display text-2xl font-semibold tracking-[-0.04em] text-[#27213d] md:text-3xl">{scenarioIntro?.title || "Mehrere Perspektiven. Ein gemeinsamer Feed."}</h2>
          <p className="mt-3 max-w-2xl whitespace-pre-line break-words text-sm leading-6 text-[#746d89] [overflow-wrap:anywhere]">{scenarioIntro?.description?.trim() || "In deinem Feed begegnen dir Inhalte aus mehreren Szenarien. Die Themen und Perspektiven wechseln sich ab – dazwischen erscheinen ganz normale Beiträge. Schau genau hin, verknüpfe Hinweise und bilde dir deine eigene Meinung."}</p>
        </div>
      </div>
      {scenarioSummaries.length > 0 && <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">{scenarioSummaries.map((scenario) => <article key={scenario.id} className="min-w-0 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm"><div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100">{scenario.coverImageUrl ? <img src={scenario.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-8 w-8 text-violet-300" /></div>}</div><div className="p-3.5"><h3 className="break-words text-sm font-bold leading-5 text-[#35264d]">{scenario.title}</h3><p className="mt-1.5 line-clamp-3 break-words text-xs leading-5 text-[#746d89]">{scenario.description?.trim() || "Für dieses Szenario liegt noch keine Kurzbeschreibung vor."}</p></div></article>)}</div>}
    </>
  ) : (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] md:items-center">
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100"><Sparkles className="h-5 w-5 text-violet-600" /></span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Dein Szenario</div>
          <h2 className="mt-2 max-w-full break-words [overflow-wrap:anywhere] font-display text-2xl font-semibold tracking-[-0.04em] text-[#27213d] md:text-3xl">{scenarioIntro?.title || "Schau genauer hin."}</h2>
          <p className="mt-3 max-w-2xl whitespace-pre-line break-words text-sm leading-6 text-[#746d89] [overflow-wrap:anywhere]">{scenarioIntro?.description?.trim() || "In diesem Szenario begegnest du Beiträgen und Nachrichten. Schau genau hin, ordne ein, was du bemerkst, und triff deine eigenen Entscheidungen."}</p>
        </div>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 shadow-md md:aspect-[4/3]">
        {scenarioSummaries[0]?.coverImageUrl ? <img src={scenarioSummaries[0].coverImageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-10 w-10 text-violet-300" /></div>}
      </div>
    </div>
  )}
  {!scenarioStarted && !scenarioFinished && teacherModules.length === 0 && <div className="mt-6 flex justify-end">
    <button type="button" onClick={handleScenarioStart} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">
      <span>DR1FT starten</span>
      <ArrowRight className="h-4 w-4 text-cyan-200" />
    </button>
  </div>}
</section>}{scenarioStarted&&!scenarioFinished&&learningCards.filter(card=>card.position==="before_feed").map(card=><LearningCardFeedItem key={card.id} card={card} classInstanceId={classInstanceId}/>)}
{!scenarioFinished&&teacherModules.length>0&&<section className="space-y-5" aria-label="Lernmodule deiner Lehrkraft">
  {!scenarioStarted&&<div className="flex justify-end"><button type="button" onClick={handleScenarioStart} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-md">Lernmodul starten <ArrowRight className="h-4 w-4"/></button></div>}
  {teacherModules.map((module)=><article key={module.id} className="overflow-hidden rounded-[26px] border border-violet-100 bg-white/95 shadow-sm">
    {module.title_card_enabled!==false&&<header className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50 px-5 py-5 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Lernmodul</p>
      <h3 className="mt-1 break-words font-display text-xl font-semibold text-[#27213d] [overflow-wrap:anywhere]">{module.title}</h3>
      {module.description&&<p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[#746d89] [overflow-wrap:anywhere]">{module.description}</p>}

    </header>}
    {scenarioStarted&&<div className="space-y-5 p-4 sm:p-6">
      {module.posts.map((post,index)=>{
        const config=post.interaction_data??{};
        const options=Array.isArray(config.options)?config.options.filter((option:any)=>typeof option==="string"&&option.trim()):[];
        const responseMode=config.responseMode??"single";
        const selected=moduleSelections[post.id]??[];
        const submitted=moduleSubmitted[post.id]===true;
        return <section key={post.id} className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">Beitrag {index+1}</p>
            {post.title&&<h4 className="mt-1 text-lg font-semibold text-[#27213d]">{post.title}</h4>}
            {post.body&&<p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[#51476a] [overflow-wrap:anywhere]">{post.body}</p>}
          </div>
          {post.imageUrl&&<div className="post-media-stage relative isolate mx-2 overflow-hidden rounded-[22px] sm:mx-3"><div aria-hidden="true" className="post-media-pattern pointer-events-none absolute inset-0"/><img src={post.imageUrl} alt={post.title||"Bild zum Lernmodul"} loading="lazy" className="post-media-image relative z-[1] mx-auto block h-auto max-h-[75vh] w-auto max-w-full object-contain" onError={(event)=>{event.currentTarget.style.display="none";}}/></div>}
          {post.embed_url&&<div className="px-4 pb-4"><a href={post.embed_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-violet-700 underline">Medieninhalt öffnen</a></div>}
          {(post.post_type==="poll"||post.post_type==="true_false")&&<div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
            {responseMode==="free_text"?<textarea value={moduleFreeText[post.id]??""} onChange={event=>setModuleFreeText(current=>({...current,[post.id]:event.target.value}))} disabled={submitted} rows={3} maxLength={3000} placeholder="Deine Antwort ..." className="w-full rounded-xl border border-violet-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"/>:
              <div className="grid gap-2">{options.map((option:string,optionIndex:number)=>{const value="option_"+(optionIndex+1);const active=selected.includes(value);return <button key={value} type="button" disabled={submitted} aria-pressed={active} onClick={()=>setModuleSelections(current=>({...current,[post.id]:responseMode==="multiple"?(active?(current[post.id]??[]).filter(item=>item!==value):[...(current[post.id]??[]),value]):[value]}))} className={"w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition "+(active?"border-violet-400 bg-violet-50 text-violet-900":"border-violet-100 bg-white text-slate-700 hover:border-violet-300")}>{option}</button>})}</div>}
            {moduleVoteErrors[post.id]&&<p role="alert" className="text-sm text-red-600">{moduleVoteErrors[post.id]}</p>}
            {submitted?<p role="status" className="text-sm font-semibold text-emerald-700">Antwort gespeichert. Danke!</p>:<button type="button" disabled={moduleSubmitting[post.id]} onClick={()=>void submitTeacherModuleAnswer(module.id,post)} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{moduleSubmitting[post.id]?"Wird gespeichert …":"Antwort senden"}</button>}
          </div>}
        </section>;
      })}
    </div>}
  </article>)}
</section>}
{scenarioStarted&&!scenarioFinished&&initialItems.length===0&&teacherModules.length===0&&<div className="rounded-[28px] bg-white/80 border border-dashed border-violet-200 p-12 text-center shadow-sm"><p className="font-display font-semibold">Noch ist es ruhig.</p><p className="text-sm text-[#746d89] mt-2">Für dich sind gerade keine Szenarien freigeschaltet.</p></div>}{scenarioStarted&&!scenarioFinished&&initialItems.slice(0,visibleCount).map((item,index)=><div key={item.id} className="space-y-3"><PostCard item={item} userId={userId} classInstanceId={classInstanceId} initiallyLiked={likedContentIds.has(item.id)} onView={()=>handleView(item)}/>{index===2&&<div className="h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent"/>}</div>)}{scenarioStarted&&!scenarioFinished&&visibleCount<initialItems.length&&<div ref={loadMoreRef} className="flex justify-center py-6 text-violet-300" aria-label="Weitere Beiträge werden geladen"><ArrowDown className="w-5 h-5 animate-bounce"/></div>}{scenarioStarted&&!scenarioFinished&&visibleCount>=initialItems.length&&learningCards.filter(card=>card.position==="feed_end").map(card=><LearningCardFeedItem key={card.id} card={card} classInstanceId={classInstanceId}/>)}{scenarioFinished&&<section className="rounded-[26px] border border-violet-100 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50"><CheckCircle2 className="h-6 w-6 text-violet-600"/></span><h2 className="mt-4 font-display text-2xl font-semibold text-[#27213d]">{multipleScenarios ? "Lernlauf beendet" : "Szenario beendet"}</h2><p className="mt-2 text-sm text-[#746d89]">Du kannst jetzt aufhören. Nicht abgeschlossene Aufgaben bleiben offen.</p></section>}</div></div>{reflection&&<ReflectionOverlay contentItemId={reflection.contentItemId} onClose={()=>setReflection(null)}/>}</main>;
}
