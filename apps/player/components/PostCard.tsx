"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag, Heart, MessageCircle, Send, Share2, Sparkles } from "lucide-react";
import type { FeedItem, CreatorSummary } from "../lib/types";
import { mapCreatorRow } from "../lib/types";
import { recordInteraction } from "@dr1ft/engine-core";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { CommentSkeleton } from "./Skeleton";
import { avatarUrl } from "../lib/avatar";

function AuthorRow({ creator, student }: { creator?: CreatorSummary; student?: { id: string; displayName: string; username: string; avatarSeed: string } }) {
  if (!creator && !student) return null;
  const image = creator ? (creator.avatarUrl || avatarUrl(creator.id, 80)) : avatarUrl(student!.avatarSeed, 80);
  const name = creator?.displayName ?? student?.displayName ?? "DR1FT User";
  const handle = creator?.handle ?? `@${student?.username ?? "user"}`;
  const href = creator ? `/creator/${creator.id}` : `/profile/${student!.id}`;
  return <Link href={href} className="group flex items-center gap-3" onClick={(e) => e.stopPropagation()}><span className="relative block w-11 h-11 shrink-0 overflow-hidden rounded-[15px] p-[2px] bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-300 shadow-[0_5px_16px_rgba(124,58,237,.18)]"><span className="block h-full w-full overflow-hidden rounded-[12px] bg-[#f3eefb]"><img src={image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" /></span></span><span className="min-w-0"><span className="block text-[13px] font-semibold leading-tight group-hover:text-violet-600 transition-colors">{name}</span><span className="block text-[11px] text-[#8c849d] mt-0.5">{handle}</span></span></Link>;
}

function ReactionPeople({ users }: { users: Array<{ id: string; displayName: string; username: string; avatarSeed: string }> }) {
  if (!users.length) return <p className="text-[11px] text-[#aaa1b1] mt-3">Noch keine Reaktionen aus deiner Klasse.</p>;
  const shown = users.slice(0, 3), first = shown[0], remaining = users.length - shown.length;
  return <div className="flex items-center gap-2.5 mt-3"><div className="flex -space-x-2">{shown.map((user) => <Link key={user.id} href={`/profile/${user.id}`} title={`@${user.username}`} className="block"><img src={avatarUrl(user.avatarSeed, 52)} alt="" className="w-7 h-7 rounded-[10px] bg-white border-2 border-white shadow-sm" /></Link>)}</div><span className="text-[11px] text-[#82798f]">{users.length === 1 ? `${first.displayName} gefällt das` : `${first.displayName} und ${remaining} weitere gefällt das`}</span></div>;
}

type CommentView = FeedItem & { studentAuthor?: { id: string; displayName: string; username: string; avatarSeed: string } };
type StudentProfile = { displayName: string; username: string; avatarSeed: string };

export function PostCard({ item, userId, classInstanceId, initiallyLiked, onView, profile }: { item: FeedItem; userId: string; classInstanceId: string; initiallyLiked: boolean; onView: () => void; profile: StudentProfile }) {
  const supabase = supabaseBrowserClient();
  const ref = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(initiallyLiked);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [reported, setReported] = useState(false);
  const storedLikeCount = Number((item.extra as any)?.classLikeCount ?? 0);
  const baseLikeCount = Number((item.extra as any)?.baseEngagement ?? 0);
  const commentCount = Number((item.extra as any)?.classCommentCount ?? (item.extra as any)?.baseCommentCount ?? 0);
  const reactionUsers = ((item.extra as any)?.classLikeUsers ?? []) as Array<{ id: string; displayName: string; username: string; avatarSeed: string }>;

  useEffect(() => { const el = ref.current; if (!el) return; const observer = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && onView()), { threshold: 0.6 }); observer.observe(el); return () => observer.disconnect(); }, [onView]);

  async function toggleLike() { if (liked) return; setLiked(true); await recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "like", classInstanceId }); }

  async function sharePost() {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: item.title ?? "DR1FT", text: item.body ?? "", url }); else await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1800); await recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "share", classInstanceId }); } catch {}
  }

  async function reportPost() { if (reported) return; setReported(true); await recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "report", classInstanceId, metadata: { source: "feed" } }); }

  async function loadComments() {
    const { data, error } = await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("parent_id", item.id).eq("class_instance_id", classInstanceId).eq("type", "comment").eq("status", "live").order("created_at", { ascending: true });
    if (error) { setCommentError(error.message); setComments([]); return; }
    setComments((data ?? []).map((row: any) => { const author = row.extra?.createdBy === "student" && row.extra?.studentUserId ? { id: row.extra.studentUserId, displayName: row.extra.displayName ?? "DR1FT User", username: row.extra.username ?? "user", avatarSeed: row.extra.avatarSeed ?? row.extra.studentUserId } : undefined; return { ...row, creator: mapCreatorRow(row.creators), studentAuthor: author }; }));
  }

  async function toggleComments() { const next = !commentsOpen; setCommentsOpen(next); setCommentError(null); if (next && comments === null) await loadComments(); }

  async function submitComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const text = commentText.trim(); if (!text || commentSending) return; setCommentSending(true); setCommentError(null);
    try {
      const response = await fetch(`/api/content/${item.id}/comment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error ?? "Kommentar konnte nicht gespeichert werden."); const created = payload.comment;
      const optimistic: CommentView = { id: created.id, type: "comment", scenarioId: null, creatorId: null, parentId: item.id, title: null, body: created.body, mediaUrl: null, mediaType: null, manipulationTechniques: [], targetCompetencies: [], difficulty: 1, ageRating: "12_plus", sourceRefs: [], status: "live", reviewedBy: null, reviewedAt: null, reviewNotes: null, extra: created.extra ?? {}, createdAt: created.created_at, updatedAt: created.created_at, creator: undefined, studentAuthor: { id: userId, displayName: profile.displayName || "Du", username: profile.username || "du", avatarSeed: profile.avatarSeed || userId } };
      setComments((current) => [...(current ?? []), optimistic]); setCommentText("");
    } catch (error) { setCommentError(error instanceof Error ? error.message : "Kommentar konnte nicht gespeichert werden."); } finally { setCommentSending(false); }
  }

  const visibleLikeCount = baseLikeCount + Math.max(0, storedLikeCount) + (liked && storedLikeCount === 0 ? 1 : 0);
  const technique = item.manipulationTechniques?.[0]; const difficulty = item.difficulty;
  return <article ref={ref} className="group relative overflow-hidden rounded-[28px] bg-white/90 text-[#27213d] shadow-[0_20px_58px_rgba(62,40,104,.10)] ring-1 ring-white/80 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_72px_rgba(62,40,104,.16)]">
    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" /><div className="absolute -right-20 top-[-70px] h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl transition-opacity duration-300 group-hover:bg-fuchsia-400/20" />
    <div className="relative flex items-center justify-between px-5 pt-5 pb-4"><AuthorRow creator={item.creator}/></div>
    {item.mediaUrl && item.mediaType === "image" && <div className="relative mx-3 overflow-hidden rounded-[22px] bg-[#eeeaf7]"><img src={item.mediaUrl} alt="" className="w-full max-h-[540px] object-cover transition-transform duration-700 group-hover:scale-[1.015]" loading="lazy" /></div>}
    {item.mediaUrl && item.mediaType === "video" && <div className="mx-3 overflow-hidden rounded-[22px]"><video src={item.mediaUrl} controls className="w-full max-h-[540px] object-cover bg-[#171027]" /></div>}
    <div className="relative px-5 pt-4 pb-5"><div className="flex items-center gap-2 mb-3"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-600">{item.type}</span>{difficulty && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-orange-600">Level {difficulty}</span>}{technique && <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-medium text-[#a39bab]"><Sparkles className="w-3 h-3 text-fuchsia-400" /> entdecke selbst</span>}</div>
      {item.title && <h2 className="font-display text-[23px] font-semibold leading-[1.12] tracking-[-0.04em] mb-2">{item.title}</h2>}<p className="font-body text-[15px] leading-[1.65] text-[#554d63]">{item.body}</p><ReactionPeople users={reactionUsers}/>
      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-violet-100/80">
        <button onClick={toggleLike} aria-label={liked ? "Gefällt mir nicht mehr" : "Gefällt mir"} className={`touch-target inline-flex items-center gap-2 px-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-violet-50 ${liked ? "text-fuchsia-500" : "text-[#8e859b] hover:text-violet-600"}`}><Heart className="w-[19px] h-[19px]" fill={liked ? "currentColor" : "none"} strokeWidth={2}/><span className="font-medium">{visibleLikeCount}</span></button>
        <button onClick={toggleComments} aria-label="Kommentare anzeigen" className={`touch-target inline-flex items-center gap-2 px-2.5 rounded-xl text-sm transition hover:bg-cyan-50 ${commentsOpen ? "text-violet-600" : "text-[#8e859b] hover:text-violet-600"}`}><MessageCircle className="w-[18px] h-[18px]" strokeWidth={2}/><span className="font-medium">{comments ? comments.length : commentCount}</span></button>
        <button onClick={sharePost} aria-label="Beitrag teilen" className="touch-target inline-flex items-center gap-2 px-2.5 rounded-xl text-sm text-[#8e859b] hover:bg-violet-50 hover:text-violet-600 transition"><Share2 className="w-[18px] h-[18px]"/><span className="hidden sm:inline">{shared ? "Link kopiert" : "Teilen"}</span></button>
        <button onClick={reportPost} aria-label="Beitrag melden" disabled={reported} className={`touch-target inline-flex items-center gap-2 px-2.5 rounded-xl text-sm transition ${reported ? "text-rose-500" : "text-[#8e859b] hover:bg-rose-50 hover:text-rose-500"}`}><Flag className="w-[17px] h-[17px]"/><span className="hidden sm:inline">{reported ? "Gemeldet" : "Melden"}</span></button>
        <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-[#aaa1b1]">dein Blick zählt</span>
      </div>
      {commentsOpen && <div className="mt-3 pt-3 border-t border-violet-100/80 space-y-3">{comments === null && <><CommentSkeleton/><CommentSkeleton/></>}{comments?.length === 0 && <p className="text-xs text-[#9b93a8] py-1">Noch keine Kommentare. Sei der Erste.</p>}{comments?.map((c)=><div key={c.id} className="bg-[#f6f3fa] rounded-2xl px-3.5 py-3"><AuthorRow creator={c.creator} student={c.studentAuthor}/><p className="text-xs leading-5 mt-2 text-[#665d73]">{c.body}</p></div>)}<form onSubmit={submitComment} className="flex items-end gap-2 pt-1"><textarea value={commentText} onChange={(e)=>setCommentText(e.target.value.slice(0,500))} placeholder="Schreib etwas dazu …" rows={2} className="min-h-[44px] flex-1 resize-none rounded-2xl border border-violet-100 bg-white px-3.5 py-2.5 text-sm text-[#27213d] outline-none placeholder:text-[#aaa1b1] focus:border-violet-300 focus:ring-2 focus:ring-violet-100"/><button type="submit" disabled={!commentText.trim()||commentSending} className="grid place-items-center w-11 h-11 shrink-0 rounded-2xl bg-[#171027] text-white disabled:opacity-35 hover:bg-violet-700 transition" aria-label="Kommentar senden"><Send className="w-4 h-4"/></button></form>{commentError&&<p className="text-xs text-rose-500">{commentError}</p>}</div>}
    </div>
  </article>;
}
