"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal, Sparkles } from "lucide-react";
import type { FeedItem, CreatorSummary } from "../lib/types";
import { mapCreatorRow } from "../lib/types";
import { recordInteraction } from "@dr1ft/engine-core";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { CommentSkeleton } from "./Skeleton";
import { avatarUrl } from "../lib/avatar";

function AuthorRow({ creator }: { creator?: CreatorSummary }) {
  if (!creator) return null;
  const image = creator.avatarUrl || avatarUrl(creator.id, 80);
  return <Link href={`/creator/${creator.id}`} className="group flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
    <span className="relative block w-11 h-11 shrink-0 overflow-hidden rounded-[15px] bg-gradient-to-br from-[#dcecff] via-[#e8e5fb] to-[#ffe8d8] shadow-sm ring-1 ring-black/[0.04]">
      <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
    </span>
    <span className="min-w-0"><span className="block text-[13px] font-semibold leading-tight group-hover:underline">{creator.displayName}</span><span className="block text-[11px] text-ink/40 mt-0.5">{creator.handle}</span></span>
  </Link>;
}

function ReactionPeople({ users }: { users: Array<{ id: string; displayName: string; username: string; avatarSeed: string }> }) {
  if (!users.length) return null;
  const shown = users.slice(0, 3), first = shown[0], remaining = users.length - shown.length;
  return <div className="flex items-center gap-2.5 mt-3"><div className="flex -space-x-2">{shown.map((user) => <Link key={user.id} href={`/profile/${user.id}`} title={`@${user.username}`} className="block"><img src={avatarUrl(user.avatarSeed, 52)} alt="" className="w-7 h-7 rounded-[10px] bg-ink-light border-2 border-paper shadow-sm" /></Link>)}</div><span className="text-[11px] text-ink/45">{users.length === 1 ? `${first.displayName} gefällt das` : `${first.displayName} und ${remaining} weitere gefällt das`}</span></div>;
}

export function PostCard({ item, userId, classInstanceId, initiallyLiked, onView }: {
  item: FeedItem; userId: string; classInstanceId: string; initiallyLiked: boolean; onView: () => void;
}) {
  const supabase = supabaseBrowserClient();
  const ref = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(initiallyLiked);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedItem[] | null>(null);
  const storedLikeCount = Number((item.extra as any)?.classLikeCount ?? 0);
  const baseLikeCount = Number((item.extra as any)?.baseEngagement ?? 0);
  const commentCount = Number((item.extra as any)?.baseCommentCount ?? 0);
  const reactionUsers = ((item.extra as any)?.classLikeUsers ?? []) as Array<{ id: string; displayName: string; username: string; avatarSeed: string }>;

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && onView()), { threshold: 0.6 });
    observer.observe(el); return () => observer.disconnect();
  }, [onView]);

  async function toggleLike() {
    if (liked) return;
    setLiked(true);
    await recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "like", classInstanceId });
  }

  async function toggleComments() {
    const next = !commentsOpen; setCommentsOpen(next);
    if (next && comments === null) {
      const query = supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("parent_id", item.id).eq("type", "comment").eq("status", "live");
      const scoped = item.scenarioId ? query.eq("scenario_id", item.scenarioId) : query.is("scenario_id", null);
      const { data } = await scoped.order("created_at", { ascending: true });
      setComments((data ?? []).map((row: any) => ({ ...row, creator: mapCreatorRow(row.creators) })));
    }
  }

  const visibleLikeCount = baseLikeCount + Math.max(0, storedLikeCount) + (liked && storedLikeCount === 0 ? 1 : 0);
  const technique = item.manipulationTechniques?.[0];
  const difficulty = item.difficulty;

  return <article ref={ref} className="group relative overflow-hidden rounded-[26px] bg-white text-ink shadow-[0_16px_48px_rgba(38,50,74,0.08)] ring-1 ring-black/[0.035] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_62px_rgba(38,50,74,0.12)]">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#75b9ff] via-[#a59bea] to-[#ffb58d] opacity-85" />
    <div className="flex items-center justify-between px-5 pt-5 pb-4">
      <AuthorRow creator={item.creator} />
      <button className="grid place-items-center w-9 h-9 rounded-xl text-ink/30 hover:bg-ink/5 hover:text-ink/60 transition" aria-label="Weitere Optionen"><MoreHorizontal className="w-5 h-5" /></button>
    </div>

    {item.mediaUrl && item.mediaType === "image" && <div className="relative overflow-hidden bg-[#eef1f6]"><img src={item.mediaUrl} alt="" className="w-full max-h-[520px] object-cover transition-transform duration-700 group-hover:scale-[1.012]" loading="lazy" /></div>}
    {item.mediaUrl && item.mediaType === "video" && <video src={item.mediaUrl} controls className="w-full max-h-[520px] object-cover bg-black" />}

    <div className="px-5 pt-4 pb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="rounded-full bg-[#f1f3f8] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/45">{item.type}</span>
        {difficulty && <span className="rounded-full bg-[#f8eee8] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a46e4d]">Level {difficulty}</span>}
        {technique && <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-medium text-ink/30"><Sparkles className="w-3 h-3" /> entdecke selbst</span>}
      </div>
      {item.title && <h2 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.035em] mb-2">{item.title}</h2>}
      <p className="font-body text-[15px] leading-[1.65] text-ink/80">{item.body}</p>
      <ReactionPeople users={reactionUsers} />

      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-ink/[0.07]">
        <button onClick={toggleLike} aria-label={liked ? "Gefällt mir nicht mehr" : "Gefällt mir"} className={`touch-target inline-flex items-center gap-2 px-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-ink/5 ${liked ? "text-[#d66f6f]" : "text-ink/45 hover:text-ink"}`}>
          <Heart className="w-[19px] h-[19px]" fill={liked ? "currentColor" : "none"} strokeWidth={2} /> <span className="font-medium">{visibleLikeCount}</span>
        </button>
        <button onClick={toggleComments} aria-label="Kommentare anzeigen" className={`touch-target inline-flex items-center gap-2 px-2.5 rounded-xl text-sm transition hover:bg-ink/5 ${commentsOpen ? "text-ink" : "text-ink/45 hover:text-ink"}`}>
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} /> <span className="font-medium">{comments ? comments.length : commentCount}</span>
        </button>
        <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-ink/25">dein Blick zählt</span>
      </div>

      {commentsOpen && <div className="mt-3 pt-3 border-t border-ink/[0.06] space-y-2">{comments === null && <><CommentSkeleton /><CommentSkeleton /></>}{comments?.length === 0 && <p className="text-xs text-ink/40 py-2">Noch keine Kommentare.</p>}{comments?.map((c) => <div key={c.id} className="bg-[#f5f6fa] rounded-2xl px-3.5 py-3"><AuthorRow creator={c.creator} /><p className="text-xs leading-5 mt-2 text-ink/75">{c.body}</p></div>)}</div>}
    </div>
  </article>;
}
