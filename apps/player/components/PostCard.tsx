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
import { Check, ChevronDown, Eye, Flag, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Search, Share2, UserRound, X } from "lucide-react";
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
  const [comparison, setComparison] = useState<{ related: FeedItem | null; loading: boolean; selected?: "contradict" | "support"; error?: string } | null>(null);

  const baseLikeCount = Number((item.extra as any)?.baseEngagement ?? 0);
  const commentCount = Number((item.extra as any)?.classCommentCount ?? (item.extra as any)?.baseCommentCount ?? 0);
  const extra = (item.extra ?? {}) as Record<string, unknown>;
  useEffect(() => {
    setLiveCommentCount(commentCount);
  }, [commentCount]);
  const action = (extra.action ?? {}) as Record<string, unknown>;
  const mediaContext = (extra.media_context ?? {}) as Record<string, unknown>;
  const interactionChecks = (extra.interaction_checks ?? {}) as Record<string, { enabled?: boolean; feedback?: string }>;
  const hasConfiguredChecks = Object.keys(interactionChecks).length > 0;
  const showCheck = (key: string) => !hasConfiguredChecks || interactionChecks[key]?.enabled === true;
  const checkFeedback = (key: string) => typeof interactionChecks[key]?.feedback === "string" ? interactionChecks[key].feedback!.trim() : "";

  useEffect(() => {
    if (!menuOpen) return;
    let frame = 0;
    const updateMenuPosition = () => {
      const button = menuButtonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;
      const rect = button.getBoundingClientRect();
      const width = Math.min(240, window.innerWidth - 32);
      const height = Math.min(menu.scrollHeight, window.innerHeight * 0.7);
      const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
      const spaceAbove = rect.top - 12;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const top = spaceAbove >= height || spaceAbove >= spaceBelow
        ? Math.max(12, rect.top - height - 12)
        : Math.min(rect.bottom + 12, window.innerHeight - height - 12);
      setMenuPosition({ position: "fixed", top, left, width, maxHeight: "70vh", overflowY: "auto", visibility: "visible" });
    };
    frame = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onGlobalMenuOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string }>).detail;
      setMenuOpen(detail?.postId === item.id);
    };
    window.addEventListener("dr1ft:post-menu-open", onGlobalMenuOpen);
    return () => window.removeEventListener("dr1ft:post-menu-open", onGlobalMenuOpen);
  }, [item.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest("[data-post-menu], [data-post-menu-trigger]")) setMenuOpen(false);
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

  async function track(interactionType: "inspect_source" | "inspect_media" | "inspect_context" | "inspect_profile" | "compare_information" | "share" | "report" | "ignore", metadata: Record<string, unknown> = { ui: "generic_card_actions" }) {
    await recordInteraction(supabase, { userId, contentItemId: item.id, interactionType, metadata, classInstanceId });
  }

  function toggleLike() { if (!liked) { setLiked(true); recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "like", classInstanceId }); } }

  async function loadComments() {
    const { data } = await supabase
      .from("content_items")
      .select("*, creators(id, display_name, handle, avatar_url)")
      .eq("parent_id", item.id)
      .eq("class_instance_id", classInstanceId)
      .eq("type", "comment")
      .eq("status", "live")
      .order("created_at", { ascending: true });
    const nextComments = (data ?? []).map((row: any) => ({ ...row, creator: mapCreatorRow(row.creators) }));
    setComments(nextComments);
    setLiveCommentCount(nextComments.length);
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
  }
  const relatedRelation = ((comparison?.related?.extra as Record<string, unknown> | undefined)?.relation ?? {}) as Record<string, unknown>;
  const relationType = String(relatedRelation.type ?? "");
  const expectedComparison = ["contradicts"].includes(relationType) ? "contradict" : ["supports", "corroborates"].includes(relationType) ? "support" : null;
  const comparisonIsCorrect = Boolean(comparison?.selected && expectedComparison && comparison.selected === expectedComparison);

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
  async function report() { await track("report"); showFeedback("Deine Meldung wurde aufgenommen."); setMenuOpen(false); }
  async function ignore() { await track("ignore"); showFeedback("Beitrag wird für dich ausgeblendet."); setMenuOpen(false); }

  return <>
    <article id={`post-${item.id}`} ref={ref} className="relative bg-paper text-ink rounded-card overflow-visible shadow-sm">
      <div className="p-4 pb-0"><AuthorRow creator={item.creator}/><p className="font-mono text-[11px] text-ink/50 mb-2 uppercase tracking-wide">{item.type}</p></div>
      {item.mediaUrl && item.mediaType === "image" && <img src={item.mediaUrl} alt="" className="w-full max-h-96 object-cover" loading="lazy"/>}
      {item.mediaUrl && item.mediaType === "video" && <video src={item.mediaUrl} controls className="w-full max-h-96 object-cover bg-black"/>}
      <div className="p-4 pt-3">
        <p className="font-body text-[15px] leading-relaxed">{item.body}</p>
        <div data-post-menu className="relative flex items-center gap-2 mt-3 pt-3 border-t border-ink/10">
          <button onClick={toggleLike} className={`tap-pulse touch-target flex items-center gap-1.5 rounded-xl px-3 text-sm font-body transition-colors hover:bg-ink/5 ${liked ? "text-social-pink" : "text-ink/60"}`} aria-label="Gefällt mir"><Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} strokeWidth={2}/>{baseLikeCount + (liked ? 1 : 0)}</button>
          <button onClick={toggleComments} className="touch-target flex items-center gap-1.5 rounded-xl px-3 text-sm font-body text-ink/60 transition-colors hover:bg-ink/5" aria-label="Kommentare anzeigen"><MessageCircle className="w-[18px] h-[18px]" strokeWidth={2}/>{comments ? comments.length : liveCommentCount}</button>
          <button onClick={() => void share()} className="touch-target ml-auto inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700" aria-label="Beitrag teilen"><Share2 className="h-4 w-4"/><span>Teilen</span></button>
          <button ref={menuButtonRef} onClick={() => { if (menuOpen) { setMenuOpen(false); return; } setMenuPosition((position) => ({ ...position, visibility: "hidden" })); window.dispatchEvent(new CustomEvent("dr1ft:post-menu-open", { detail: { postId: item.id } })); }} className="touch-target grid w-11 place-items-center rounded-xl text-ink/60 transition-colors hover:bg-ink/5" data-post-menu-trigger aria-label="Weitere Optionen" aria-expanded={menuOpen}><MoreHorizontal className="w-5 h-5"/></button>
          {menuOpen && typeof document !== "undefined" && createPortal(<div ref={menuRef} data-post-menu className="z-[1100] rounded-xl border border-ink/15 bg-paper text-ink shadow-xl p-1.5 dark-post-menu" style={menuPosition}>{showCheck("inspect_source") && <ActionButton icon={<Search/>} label="Quelle ansehen" onClick={inspectSource}/>}{showCheck("inspect_media") && <ActionButton icon={<ImageIcon/>} label="Bild prüfen" onClick={inspectMedia}/>}{showCheck("inspect_context") && <ActionButton icon={<Eye/>} label="Kontext prüfen" onClick={inspectContext}/>}{showCheck("inspect_profile") && <ActionButton icon={<UserRound/>} label="Profil ansehen" onClick={inspectProfile}/>}{showCheck("compare_information") && <ActionButton icon={<Search/>} label="Informationen vergleichen" onClick={compareInformation}/>}<div className="my-1 border-t border-ink/10"/><ActionButton icon={<Share2/>} label="Teilen" onClick={share}/><ActionButton icon={<Flag/>} label="Melden" onClick={report}/><ActionButton icon={<X/>} label="Ignorieren" onClick={ignore}/></div>, document.body)}
        </div>
        {shareOpen && typeof document !== "undefined" && createPortal(<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onPointerDown={(event) => { if (event.target === event.currentTarget) setShareOpen(false); }}>
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
        </div>, document.body)}
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
            {comparison.selected && <div className="mt-4 rounded-xl bg-ink/5 px-4 py-3 text-sm leading-relaxed" role="status">{expectedComparison ? (comparisonIsCorrect ? (checkFeedback("compare_information") || "Richtig eingeordnet. Deine Entscheidung passt zur redaktionell hinterlegten Beziehung zwischen den Aussagen.") : "Das passt nicht zur redaktionell hinterlegten Beziehung. Vergleiche die Aussagen noch einmal und achte darauf, ob sie sich widersprechen oder gegenseitig stützen.") : "Für diese beiden Aussagen ist noch keine geprüfte Vergleichsbeziehung hinterlegt. Eine richtige oder falsche Einordnung kann deshalb nicht bewertet werden."}</div>}
          </div>
        </div>}
      </div>
    </div>}
  </>;
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-body text-ink hover:bg-ink/5 active:bg-ink/10"><span className="w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 text-ink/60">{icon}</span>{label}</button>;
}
