"use client";
// apps/player/components/PostCard.tsx
//
// Every card deliberately exposes the same interaction layer. Ambient posts
// are not visually distinguishable from scenario/signal posts. The card
// metadata decides what an inspection reveals; every action still produces
// immediate feedback so exploration itself feels like a normal product flow.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, ChevronDown, Eye, Flag, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Search, Send, Share2, Sparkles, UserRound, X } from "lucide-react";
import type { FeedItem, CreatorSummary } from "../lib/types";
import { mapCreatorRow } from "../lib/types";
import { recordInteraction } from "@dr1ft/engine-core";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { CommentSkeleton } from "./Skeleton";

function initials(name: string): string { return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); }
function getString(value: unknown): string | undefined { return typeof value === "string" ? value : undefined; }
function getStringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []; }

function AuthorRow({ creator }: { creator?: CreatorSummary }) {
  if (!creator) return null;
  return <Link href={`/creator/${creator.id}`} className="flex items-center gap-2 mb-2 group" onClick={(e) => e.stopPropagation()}><span className="w-6 h-6 rounded-full bg-ink text-paper text-[10px] font-mono flex items-center justify-center shrink-0">{initials(creator.displayName)}</span><span className="text-xs font-medium text-ink group-hover:underline">{creator.displayName}</span><span className="text-xs text-ink/40">{creator.handle}</span></Link>;
}

export function PostCard({ item, userId, classInstanceId, initiallyLiked, onView }: { item: FeedItem; userId: string; classInstanceId: string; initiallyLiked: boolean; onView: () => void }) {
  const supabase = supabaseBrowserClient();
  const ref = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(initiallyLiked);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedItem[] | null>(null);
  const [liveCommentCount, setLiveCommentCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({ position: "fixed", top: 12, left: 12, visibility: "hidden" });
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareRecipients, setShareRecipients] = useState<Array<{ id: string; displayName: string; username: string }>>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{ related: FeedItem | null; loading: boolean; selected?: "contradict" | "support"; assessmentOutcome?: "success" | "not_yet" | "not_assessed"; error?: string } | null>(null);
  const [taskResponse, setTaskResponse] = useState("");
  const [taskResponseSaved, setTaskResponseSaved] = useState(false);
  const [taskResponseSaving, setTaskResponseSaving] = useState(false);

  const baseLikeCount = Number((item.extra as any)?.baseEngagement ?? 0);
  const commentCount = Number((item.extra as any)?.classCommentCount ?? (item.extra as any)?.baseCommentCount ?? 0);
  const extra = (item.extra ?? {}) as Record<string, unknown>;
  const learningTask = (extra.learningTask ?? {}) as { purpose?: string; learnerAction?: string; interactionType?: string; expectedResponse?: string; evaluationMethod?: string; successCriteria?: string; feedback?: string; interactions?: Array<{ id: string; label: string; instruction?: string; custom?: boolean }>; assessment?: { assessedActions?: string[]; acceptableActions?: string[]; evidenceKey?: string } };
  const configuredLearningInteractions = new Set((learningTask.interactions ?? []).map((interaction) => interaction.id));
  useEffect(() => {
    setLiveCommentCount(commentCount);
  }, [commentCount]);
  const action = (extra.action ?? {}) as Record<string, unknown>;
  const mediaContext = (extra.media_context ?? {}) as Record<string, unknown>;
  const interactionChecks = (extra.interaction_checks ?? {}) as Record<string, { enabled?: boolean; feedback?: string }>;
  const checkFeedback = (key: string) => typeof interactionChecks[key]?.feedback === "string" ? interactionChecks[key].feedback!.trim() : "";

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest("[data-post-menu-panel], [data-post-menu-trigger]")) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;

    const updateMenuPosition = () => {
      const button = menuButtonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;
      const rect = button.getBoundingClientRect();
      const margin = 12;
      const edge = 16;
      const width = Math.max(0, Math.min(240, window.innerWidth - edge * 2));
      const maxHeight = Math.max(120, window.innerHeight - margin * 2);
      const measuredHeight = menu.getBoundingClientRect().height || menu.scrollHeight;
      const height = Math.min(measuredHeight, maxHeight);
      const left = Math.max(edge, Math.min(rect.right - width, window.innerWidth - width - edge));
      const spaceAbove = Math.max(0, rect.top - margin);
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - margin);
      const placeAbove = spaceAbove >= height || spaceAbove >= spaceBelow;
      const availableHeight = Math.max(120, Math.min(maxHeight, placeAbove ? spaceAbove : spaceBelow));
      const finalHeight = Math.min(height, availableHeight);
      const top = placeAbove
        ? Math.max(margin, rect.top - finalHeight - margin)
        : Math.min(rect.bottom + margin, window.innerHeight - finalHeight - margin);
      setMenuPosition({ position: "fixed", top, left, width, maxHeight: availableHeight, overflowY: "auto", visibility: "visible" });
    };

    frame = window.requestAnimationFrame(() => {
      updateMenuPosition();
      if (menuRef.current && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateMenuPosition);
        resizeObserver.observe(menuRef.current);
      }
    });
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [menuOpen, item.id]);

  useEffect(() => {
    const onGlobalMenuOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string }>).detail;
      setMenuOpen(detail?.postId === item.id);
    };
    window.addEventListener("dr1ft:post-menu-open", onGlobalMenuOpen);
    return () => window.removeEventListener("dr1ft:post-menu-open", onGlobalMenuOpen);
  }, [item.id]);

  useEffect(() => {
    const onCommentCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ parentId?: string }>).detail;
      if (detail?.parentId !== item.id) return;
      void loadComments();
    };

    window.addEventListener("dr1ft:comment-created", onCommentCreated);
    return () => window.removeEventListener("dr1ft:comment-created", onCommentCreated);
  }, [item.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && onView()), { threshold: 0.6 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onView]);

  function showFeedback(message: string) { setFeedback(message); window.setTimeout(() => setFeedback(null), 2800); }

  async function track(interactionType: "inspect_source" | "inspect_media" | "inspect_context" | "inspect_profile" | "compare_information" | "share" | "report" | "ignore", metadata: Record<string, unknown> = { ui: "generic_card_actions" }): Promise<boolean> {
    const saved = await recordInteraction(supabase, {
      userId,
      contentItemId: item.id,
      interactionType,
      metadata,
      classInstanceId,
    });
    if (!saved) {
      showFeedback("Deine Aktion konnte nicht gespeichert werden. Bitte versuche es erneut.");
      return false;
    }

    // Learning feedback is shown only when this interaction was explicitly
    // configured for the content. It is instructional feedback, not a score.
    const aliases: Record<string, string[]> = {
      inspect_context: ["inspect_context", "fact_check"],
      inspect_source: ["inspect_source"],
      inspect_media: ["inspect_media"],
      inspect_profile: ["inspect_profile"],
      compare_information: ["compare_information"],
    };
    const configured = (learningTask.interactions ?? []).find((entry) =>
      (aliases[interactionType] ?? [interactionType]).includes(entry.id)
    );
    // Only editorially assessed actions create learning evidence. The server
    // reads the shared rule from learningTask.assessment and derives the outcome.
    const assessment = learningTask.assessment;
    const actionAliases: Record<string, string[]> = {
      inspect_context: ["inspect_context", "fact_check"],
      inspect_source: ["inspect_source"],
      inspect_media: ["inspect_media"],
      inspect_profile: ["inspect_profile"],
      compare_information: ["compare_information"],
      report: ["report"],
      ignore: ["ignore"],
      share: ["share"],
    };
    const assessedActions = Array.isArray(assessment?.assessedActions) ? assessment.assessedActions : [];
    const isAssessed = (actionAliases[interactionType] ?? [interactionType]).some((id) => assessedActions.includes(id));
    if (configured && isAssessed) {
      const { error } = await supabase.rpc("record_discrete_action_assessment", {
        p_class_instance_id: classInstanceId,
        p_content_item_id: item.id,
        p_action_id: interactionType,
      });
      // Assessment failures stay invisible to learners: the interaction itself
      // has already been saved, and assessment status must not reveal mission membership.
      if (error) console.error("Discrete action assessment failed", error);
    }
    return true;
  }

  async function toggleLike() {
    if (liked) return;
    setLiked(true);
    const saved = await recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "like", classInstanceId });
    if (!saved) {
      setLiked(false);
      showFeedback("Dein Like konnte nicht gespeichert werden. Bitte versuche es erneut.");
    }
  }

  async function loadComments() {
    const commentSelect = "*, creators(id, display_name, handle, avatar_url)";

    // Student comments are scoped to the active class instance.
    const classCommentsRequest = supabase
      .from("content_items")
      .select(commentSelect)
      .eq("parent_id", item.id)
      .eq("class_instance_id", classInstanceId)
      .eq("type", "comment")
      .eq("status", "live")
      .order("created_at", { ascending: true });

    // Editorially prepared scenario comments are shared across class instances.
    // Only load these for a scenario post, and require the same scenario ID.
    const classResult = await classCommentsRequest;
    let scenarioRows: any[] = [];
    let scenarioError: unknown = null;

    if (item.scenarioId) {
      const scenarioResult = await supabase
        .from("content_items")
        .select(commentSelect)
        .eq("parent_id", item.id)
        .eq("scenario_id", item.scenarioId)
        .is("class_instance_id", null)
        .eq("type", "comment")
        .eq("status", "live")
        .order("created_at", { ascending: true });
      scenarioRows = scenarioResult.data ?? [];
      scenarioError = scenarioResult.error;
    }

    if (classResult.error || scenarioError) {
      showFeedback("Kommentare konnten gerade nicht vollständig geladen werden.");
    }

    // Merge both sources, avoid duplicates, and preserve chronological order.
    const rowsById = new Map<string, any>();
    for (const row of [...scenarioRows, ...(classResult.data ?? [])]) {
      rowsById.set(row.id, row);
    }
    const nextComments = Array.from(rowsById.values())
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((row: any) => ({ ...row, creator: mapCreatorRow(row.creators) }));

    setComments(nextComments);
    setLiveCommentCount(nextComments.length);
  }

  async function submitLearningTaskResponse() {
    const response = taskResponse.trim();
    if (!response || taskResponseSaving || taskResponseSaved) return;
    setTaskResponseSaving(true);
    try {
      const saved = await recordInteraction(supabase, {
        userId,
        contentItemId: item.id,
        interactionType: "learning_task_response",
        classInstanceId,
        metadata: {
          response,
          interactionType: learningTask.interactionType ?? "reflect",
          evaluationMethod: learningTask.evaluationMethod ?? "criteria",
          submittedAt: new Date().toISOString(),
        },
      });
      if (!saved) throw new Error("Learning task response was not persisted.");
      setTaskResponseSaved(true);
      showFeedback(learningTask.feedback?.trim() || "Danke für deine Antwort. Sie wurde gespeichert und kann in der Auswertung berücksichtigt werden.");
    } catch {
      showFeedback("Deine Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.");
    } finally {
      setTaskResponseSaving(false);
    }
  }

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) await loadComments();
  }

  async function submitComment() {
    const text = commentText.trim();
    if (!text || commentSaving) return;

    setCommentSaving(true);
    const response = await fetch(`/api/content/${item.id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const result = await response.json().catch(() => ({}));
    setCommentSaving(false);

    if (!response.ok) {
      showFeedback(result.error ?? "Kommentar konnte nicht gespeichert werden.");
      return;
    }

    setCommentText("");
    await loadComments();
  }

  async function inspectSource() {
    await track("inspect_source");
    const configured = checkFeedback("inspect_source");
    if (configured) { showFeedback(configured); return; }
    const observations = getStringArray(action.expected_observation);
    if (item.sourceRefs?.length) showFeedback(`Quelle: ${item.sourceRefs[0].label}`);
    else if (observations.includes("no_named_author")) showFeedback("Hier ist keine konkrete Autorin oder kein konkreter Autor genannt.");
    else if (observations.includes("no_concrete_source")) showFeedback("Hier ist keine konkrete Quelle angegeben.");
    else showFeedback("Für diesen Beitrag ist keine konkrete Quellenbewertung hinterlegt. Prüfe, ob eine nachvollziehbare Originalquelle angegeben ist.");
  }

  async function inspectMedia() {
    await track("inspect_media");
    const configured = checkFeedback("inspect_media");
    if (configured) { showFeedback(configured); return; }
    if (getString(mediaContext.current_claim)) {
      const detail = [getString(mediaContext.original_date), getString(mediaContext.original_location)].filter(Boolean).join(" · ");
      showFeedback(detail ? `Bildkontext: ${detail}.` : "Das Bild lässt sich hier im Kontext prüfen.");
    } else showFeedback("Für dieses Bild sind keine überprüfbaren Herkunfts- oder Kontextdaten hinterlegt. Aus dieser Ansicht allein lässt sich seine Echtheit nicht bestätigen.");
  }

  async function inspectContext() {
    await track("inspect_context");
    const configured = checkFeedback("inspect_context");
    if (configured) { showFeedback(configured); return; }
    showFeedback(getString(mediaContext.current_claim) ? "Der Kontext dieses Beitrags sollte mit weiteren Informationen abgeglichen werden." : "Für diesen Beitrag sind keine konkreten Kontextdaten hinterlegt. Ob die Aussage stimmt, lässt sich mit diesem Check nicht beurteilen.");
  }

  async function inspectProfile() { await track("inspect_profile"); showFeedback(checkFeedback("inspect_profile") || "Für dieses Profil ist keine konkrete Vertrauens- oder Herkunftsbewertung hinterlegt. Prüfe Angaben und frühere Beiträge selbst."); }

  async function compareInformation() {
    await track("compare_information", { ui: "generic_card_actions", phase: "open_comparison" });
    if (!item.scenarioId) { showFeedback("Für diesen Beitrag ist keine weitere Vergleichsinformation hinterlegt."); return; }
    setComparison({ related: null, loading: true });
    const { data, error } = await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("scenario_id", item.scenarioId).eq("type", "post").eq("status", "live");
    if (error) { setComparison({ related: null, loading: false, error: "Die Vergleichsinformation konnte nicht geladen werden." }); return; }
    const relatedRow = (data ?? []).find((row: any) => {
      const relation = row.extra?.relation;
      return ["corroborates", "contradicts", "supports"].includes(relation?.type) && relation?.relatedContentId === item.id;
    });
    if (!relatedRow) { setComparison({ related: null, loading: false, error: "Für diesen Beitrag ist keine weitere Vergleichsinformation hinterlegt." }); return; }
    setComparison({ related: { ...relatedRow, creator: mapCreatorRow(relatedRow.creators) }, loading: false });
  }

  async function chooseComparison(result: "contradict" | "support") {
    setComparison((current) => current ? { ...current, selected: result } : current);
    await track("compare_information", { ui: "comparison_experience", phase: "decision", result, comparedContentItemId: comparison?.related?.id ?? null });

    if (!comparison?.related?.id) return;
    if (!configuredLearningInteractions.has("compare_information")) {
      setComparison((current) => current ? { ...current, assessmentOutcome: "not_assessed" } : current);
      return;
    }
    const { data, error } = await supabase.rpc("record_comparison_assessment", {
      p_class_instance_id: classInstanceId,
      p_content_item_id: item.id,
      p_compared_content_item_id: comparison.related.id,
      p_selected: result,
    });
    if (error) {
      console.error("Comparison assessment failed", error);
      setComparison((current) => current ? { ...current, assessmentOutcome: undefined } : current);
      return;
    }
    const outcome = Array.isArray(data) ? data[0]?.outcome : undefined;
    setComparison((current) => current ? {
      ...current,
      assessmentOutcome: outcome === "success" || outcome === "not_yet" ? outcome : undefined,
    } : current);
  }

  async function share() {
    setMenuOpen(false);
    setShareOpen(true);
    setShareLoading(true);
    setSelectedRecipients([]);
    const { data: interactions } = await supabase
      .from("user_interactions")
      .select("user_id")
      .eq("class_instance_id", classInstanceId)
      .neq("user_id", userId)
      .limit(500);
    const ids = Array.from(new Set((interactions ?? []).map((row) => row.user_id).filter((id): id is string => Boolean(id))));
    const { data: profiles } = ids.length
      ? await supabase.from("user_profiles").select("id, display_name, username").in("id", ids).order("display_name")
      : { data: [] as { id: string; display_name: string | null; username: string | null }[] };
    setShareRecipients((profiles ?? []).map((profile) => ({
      id: profile.id,
      displayName: profile.display_name || profile.username || "DR1FT User",
      username: profile.username || "user",
    })));
    setShareLoading(false);
  }

  async function sendShare() {
    if (!selectedRecipients.length || shareSaving) return;
    setShareSaving(true);
    try {
      for (const recipientUserId of selectedRecipients) {
        await track("share", {
          source: "post_share_dialog",
          recipient_user_id: recipientUserId,
          class_instance_id: classInstanceId,
          post_title: item.title ?? null,
          post_excerpt: item.body.slice(0, 180),
        });
      }
      setShareOpen(false);
      showFeedback(`Beitrag mit ${selectedRecipients.length} Klassenkamerad${selectedRecipients.length === 1 ? "" : "en"} geteilt.`);
    } catch {
      showFeedback("Teilen ist gerade nicht möglich. Bitte versuche es erneut.");
    } finally {
      setShareSaving(false);
    }
  }
  async function report() {
    const saved = await track("report");
    setMenuOpen(false);
    if (!saved) return;
    showFeedback("Deine Meldung wurde aufgenommen.");
  }
  async function ignore() {
    const saved = await track("ignore");
    setMenuOpen(false);
    if (!saved) return;
    showFeedback("Beitrag wird für dich ausgeblendet.");
  }

  return <>
    <article id={`post-${item.id}`} ref={ref} className="relative bg-paper text-ink rounded-card overflow-visible shadow-sm">
      <div className="p-4 pb-0"><AuthorRow creator={item.creator}/><p className="font-mono text-[11px] text-ink/50 mb-2 uppercase tracking-wide">{item.type}</p></div>
      {item.mediaUrl && item.mediaType === "image" && <div className="post-media-stage relative isolate mx-2 overflow-hidden rounded-[22px] sm:mx-3"><div aria-hidden="true" className="post-media-pattern pointer-events-none absolute inset-0"/><div aria-hidden="true" className="post-media-orb post-media-orb-one pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full"/><div aria-hidden="true" className="post-media-orb post-media-orb-two pointer-events-none absolute -bottom-8 right-8 h-28 w-28 rounded-full"/><img src={item.mediaUrl} alt="" className="post-media-image relative z-[1] mx-auto block h-auto max-h-[75vh] w-auto max-w-full object-contain" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }}/></div>}
      {item.mediaUrl && item.mediaType === "video" && <video src={item.mediaUrl} controls className="block w-full aspect-video object-cover bg-black"/>}
      <div className="p-4 pt-3">
        <p className="font-body text-[15px] leading-relaxed">{item.body}</p>
        {!learningTask.interactions?.length && !learningTask.assessment?.assessedActions?.length && learningTask.learnerAction?.trim() && <section className="mt-4 min-w-0 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50/60 p-4 pb-6 text-left">
          <div className="flex items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Sparkles className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Deine Aufgabe</p>
              {learningTask.purpose?.trim() && <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-left text-xs leading-relaxed text-violet-900/75">{learningTask.purpose}</p>}
              <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-left text-sm font-semibold leading-relaxed text-slate-900">{learningTask.learnerAction}</p>
              {!taskResponseSaved ? <>
                <label htmlFor={`learning-task-response-${item.id}`} className="mt-3 block text-xs font-semibold text-slate-700">Deine Antwort</label>
                <textarea id={`learning-task-response-${item.id}`} value={taskResponse} onChange={event => setTaskResponse(event.target.value)} rows={3} maxLength={3000} placeholder="Schreibe deine Überlegung auf …" className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                <button type="button" disabled={!taskResponse.trim() || taskResponseSaving} onClick={() => void submitLearningTaskResponse()} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{taskResponseSaving ? "Wird gespeichert …" : "Antwort abgeben"}<Send className="h-3.5 w-3.5" /></button>
              </> : <p role="status" className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">Antwort abgegeben</p>}
            </div>
          </div>
        </section>}
        <div data-post-menu className="relative flex items-center gap-2 mt-3 pt-3 border-t border-ink/10">
          <button onClick={toggleLike} className={`tap-pulse touch-target flex items-center gap-1.5 rounded-xl px-3 text-sm font-body transition-colors hover:bg-ink/5 ${liked ? "text-social-pink" : "text-ink/60"}`} aria-label="Gefällt mir"><Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} strokeWidth={2}/>{baseLikeCount + (liked ? 1 : 0)}</button>
          <button onClick={toggleComments} className="touch-target flex items-center gap-1.5 rounded-xl px-3 text-sm font-body text-ink/60 transition-colors hover:bg-ink/5" aria-label="Kommentare anzeigen"><MessageCircle className="w-[18px] h-[18px]" strokeWidth={2}/>{comments ? comments.length : liveCommentCount}</button>
          <div className="ml-auto flex items-center gap-1">
            <button ref={menuButtonRef} data-post-menu-trigger onClick={() => {
              const nextOpen = !menuOpen;
              if (nextOpen) window.dispatchEvent(new CustomEvent("dr1ft:post-menu-open", { detail: { postId: item.id } }));
              setMenuOpen(nextOpen);
            }} className="touch-target group grid w-10 place-items-center rounded-xl transition-colors hover:bg-violet-500/10" aria-label="Weitere Optionen" aria-expanded={menuOpen}>
              <span className="flex items-center gap-[3px]" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#22D3EE] group-hover:scale-125"/>
                <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE] transition-all duration-300 group-hover:translate-y-0.5 group-hover:bg-[#EC4899] group-hover:scale-125"/>
                <span className="h-1.5 w-1.5 rounded-full bg-[#EC4899] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#8B5CF6] group-hover:scale-125"/>
              </span>
            </button>
          </div>
          {menuOpen && typeof document !== "undefined" && createPortal(<div ref={menuRef} data-post-menu-panel style={menuPosition} className="z-[80] overflow-hidden rounded-[1.35rem] border border-violet-300/35 bg-white/85 p-2 text-slate-900 shadow-[0_24px_80px_rgba(77,39,145,0.28)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/70 dark:border-violet-300/20 dark:bg-[#211a32]/85 dark:text-slate-100 dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] dark-post-menu"><div className="flex items-center gap-2 px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300"><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500"/><span className="h-1.5 w-1.5 rounded-full bg-cyan-400"/><span className="h-1.5 w-1.5 rounded-full bg-pink-500"/></span>DR1FT · Prüfen</div><ActionButton icon={<Search/>} label="Quelle ansehen" onClick={inspectSource}/><ActionButton icon={<ImageIcon/>} label="Bild prüfen" onClick={inspectMedia}/><ActionButton icon={<Eye/>} label="Fakten & Kontext checken" onClick={inspectContext}/><ActionButton icon={<UserRound/>} label="Profil ansehen" onClick={inspectProfile}/><ActionButton icon={<Search/>} label="Informationen vergleichen" onClick={compareInformation}/><div className="mx-2 my-2 h-px bg-gradient-to-r from-violet-400/40 via-cyan-400/35 to-pink-400/40"/><div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Weiter</div><ActionButton icon={<Share2/>} label="Teilen" onClick={share}/><ActionButton icon={<Flag/>} label="Melden" onClick={report} /><ActionButton icon={<X/>} label="Ignorieren" onClick={ignore} /></div>, document.body)}
        </div>
        {shareOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onPointerDown={(event) => { if (event.target === event.currentTarget) setShareOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`share-title-${item.id}`} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark-share-dialog">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id={`share-title-${item.id}`} className="text-lg font-semibold">Beitrag teilen</h2><p className="mt-1 text-sm text-slate-500">Nur mit Leuten aus deiner Klasseninstanz.</p></div>
              <button type="button" onClick={() => setShareOpen(false)} aria-label="Dialog schließen" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 line-clamp-3">{item.body}</div>
            <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
              {shareLoading && <p className="py-6 text-center text-sm text-slate-500">Klassenkameraden werden geladen …</p>}
              {!shareLoading && shareRecipients.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Noch keine Klassenkameraden gefunden, mit denen du hier interagieren kannst.</p>}
              {shareRecipients.map((person) => <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50">
                <input type="checkbox" checked={selectedRecipients.includes(person.id)} onChange={(event) => setSelectedRecipients((current) => event.target.checked ? [...current, person.id] : current.filter((id) => id !== person.id))} className="h-4 w-4 accent-violet-600"/>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{person.displayName}</span><span className="block truncate text-xs text-slate-500">@{person.username}</span></span>
              </label>)}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">{selectedRecipients.length} ausgewählt</span>
              <button type="button" disabled={!selectedRecipients.length || shareSaving || shareLoading} onClick={() => void sendShare()} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Share2 className="h-4 w-4"/>{shareSaving ? "Wird geteilt …" : "Jetzt teilen"}</button>
            </div>
          </section>
        </div>}
        {feedback && <div className="mt-3 rounded-lg bg-ink/5 px-3 py-2.5 flex items-start gap-2 text-xs leading-relaxed" role="status"><Check className="w-4 h-4 shrink-0 mt-0.5"/><span>{feedback}</span></div>}
        {commentsOpen && <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-ink/10 bg-ink/[0.025] p-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
              placeholder="Schreib einen Kommentar …"
              rows={2}
              maxLength={500}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-ink/35"
              aria-label="Kommentar schreiben"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[10px] text-ink/35">{commentText.length}/500</span>
              <button
                type="button"
                onClick={submitComment}
                disabled={!commentText.trim() || commentSaving}
                className="rounded-xl bg-ink px-3.5 py-2 text-xs font-medium text-paper disabled:opacity-40"
              >
                {commentSaving ? "Wird gespeichert …" : "Kommentieren"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {comments === null && <><CommentSkeleton/><CommentSkeleton/></>}
            {comments?.length === 0 && <p className="text-xs text-ink/40">Noch keine Kommentare.</p>}
            {comments?.map((c) => {
              const commentExtra = (c.extra ?? {}) as Record<string, unknown>;
              const studentName = typeof commentExtra.displayName === "string" ? commentExtra.displayName : "DR1FT User";
              const studentUsername = typeof commentExtra.username === "string" ? commentExtra.username : "user";
              return <div key={c.id} className="bg-ink/5 rounded-lg px-3 py-2">
                {c.creator ? <AuthorRow creator={c.creator}/> : <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-ink text-paper text-[10px] font-mono flex items-center justify-center shrink-0">{initials(studentName)}</span>
                  <span className="text-xs font-medium text-ink">{studentName}</span>
                  <span className="text-xs text-ink/40">@{studentUsername}</span>
                </div>}
                <p className="text-xs">{c.body}</p>
              </div>;
            })}
          </div>
        </div>}
      </div>
    </article>

    {comparison && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label="Informationen vergleichen">
      <div className="w-full max-w-2xl rounded-2xl bg-paper shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10"><div><p className="font-mono text-[10px] uppercase tracking-wider text-ink/40">Informationen vergleichen</p><h2 className="font-display text-xl mt-1">Schau dir beide Aussagen an.</h2></div><button onClick={() => setComparison(null)} className="touch-target rounded-lg text-ink/50 hover:bg-ink/5" aria-label="Vergleich schließen"><X className="w-5 h-5"/></button></div>
        {comparison.loading && <div className="p-8 text-sm text-ink/50">Eine weitere Information wird geladen …</div>}
        {!comparison.loading && comparison.error && <div className="p-8 text-sm text-ink/50">{comparison.error}</div>}
        {!comparison.loading && !comparison.error && comparison.related && <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-ink/10 bg-ink/[0.025] p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-ink/40 mb-3">Aussage 1</p><AuthorRow creator={item.creator}/><p className="text-sm leading-relaxed">{item.body}</p></div>
            <div className="rounded-xl border border-ink/10 bg-ink/[0.025] p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-ink/40 mb-3">Aussage 2</p><AuthorRow creator={comparison.related.creator}/><p className="text-sm leading-relaxed">{comparison.related.body}</p></div>
          </div>
          <div className="mt-5 border-t border-ink/10 pt-5"><p className="text-sm font-medium mb-3">Wie verhalten sich die beiden Aussagen zueinander?</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><button onClick={() => chooseComparison("contradict")} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${comparison.selected === "contradict" ? "border-ink bg-ink text-paper" : "border-ink/15 hover:bg-ink/5"}`}>Sie widersprechen sich.</button><button onClick={() => chooseComparison("support")} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${comparison.selected === "support" ? "border-ink bg-ink text-paper" : "border-ink/15 hover:bg-ink/5"}`}>Sie stützen dieselbe Aussage.</button></div>
            {comparison.selected && <div className="mt-4 rounded-xl bg-ink/5 px-4 py-3 text-sm leading-relaxed" role="status">"Danke fürs Vergleichen. Schau dir beide Aussagen noch einmal im Zusammenhang an."</div>}
          </div>
        </div>}
      </div>
    </div>}
  </>;
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="group/action w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-body text-slate-800 transition-all duration-200 hover:translate-x-0.5 hover:bg-gradient-to-r hover:from-violet-500/10 hover:via-cyan-400/10 hover:to-pink-400/10 active:scale-[0.99] dark:text-slate-100 dark:hover:from-violet-400/15 dark:hover:via-cyan-300/10 dark:hover:to-pink-400/10"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-300/25 bg-gradient-to-br from-violet-500/15 via-cyan-400/10 to-pink-400/15 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-colors group-hover/action:border-violet-400/40 group-hover/action:text-violet-600 dark:text-violet-200 dark:group-hover/action:text-cyan-200 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>{label}</button>;
}
