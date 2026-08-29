"use client";
// apps/player/components/PostCard.tsx

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import type { FeedItem, CreatorSummary } from "../lib/types";
import { mapCreatorRow } from "../lib/types";
import { recordInteraction } from "@dr1ft/engine-core";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { CommentSkeleton } from "./Skeleton";
import { avatarUrl } from "../lib/avatar";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function AuthorRow({ creator }: { creator?: CreatorSummary }) {
  if (!creator) return null;
  return <Link href={`/creator/${creator.id}`} className="flex items-center gap-2 mb-2 group" onClick={(e) => e.stopPropagation()}>
    <span className="w-6 h-6 rounded-full bg-ink text-paper text-[10px] font-mono flex items-center justify-center shrink-0">{initials(creator.displayName)}</span>
    <span className="text-xs font-medium text-ink group-hover:underline">{creator.displayName}</span>
    <span className="text-xs text-ink/40">{creator.handle}</span>
  </Link>;
}

function ReactionPeople({ users }: { users: Array<{ id: string; displayName: string; username: string; avatarSeed: string }> }) {
  if (!users.length) return null;
  const shown = users.slice(0, 3);
  const first = shown[0];
  const remaining = users.length - shown.length;
  return <div className="flex items-center gap-2 mt-2">
    <div className="flex -space-x-2">
      {shown.map((user) => <Link key={user.id} href={`/profile/${user.id}`} title={`@${user.username}`} className="block">
        <img src={avatarUrl(user.avatarSeed, 52)} alt="" className="w-7 h-7 rounded-full bg-ink-light border-2 border-paper" />
      </Link>)}
    </div>
    <span className="text-[11px] text-ink/45">
      {users.length === 1 ? `${first.displayName} gefällt das` : `${first.displayName} und ${remaining} weitere gefällt das`}
    </span>
  </div>;
}

export function PostCard({ item, userId, classInstanceId, initiallyLiked, onView }: {
  item: FeedItem;
  userId: string;
  classInstanceId: string;
  initiallyLiked: boolean;
  onView: () => void;
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
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && onView()), { threshold: 0.6 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onView]);

  async function toggleLike() {
    if (liked) return;
    setLiked(true);
    await recordInteraction(supabase, { userId, contentItemId: item.id, interactionType: "like", classInstanceId });
  }

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) {
      const { data } = await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("parent_id", item.id).eq("type", "comment").eq("status", "live").order("created_at", { ascending: true });
      setComments((data ?? []).map((row: any) => ({ ...row, creator: mapCreatorRow(row.creators) })));
    }
  }

  const visibleLikeCount = baseLikeCount + Math.max(0, storedLikeCount) + (liked && storedLikeCount === 0 ? 1 : 0);

  return <article ref={ref} className="bg-paper text-ink rounded-card overflow-hidden shadow-sm">
    <div className="p-4 pb-0">
      <AuthorRow creator={item.creator} />
      <p className="font-mono text-[11px] text-ink/50 mb-2 uppercase tracking-wide">{item.type}</p>
    </div>

    {item.mediaUrl && item.mediaType === "image" && <img src={item.mediaUrl} alt="" className="w-full max-h-96 object-cover" loading="lazy" />}
    {item.mediaUrl && item.mediaType === "video" && <video src={item.mediaUrl} controls className="w-full max-h-96 object-cover bg-black" />}

    <div className="p-4 pt-3">
      <p className="font-body text-[15px] leading-relaxed">{item.body}</p>

      <ReactionPeople users={reactionUsers} />

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-ink/10">
        <button onClick={toggleLike} className={`tap-pulse touch-target flex items-center gap-1.5 px-2 text-sm font-body rounded-lg ${liked ? "text-red-500" : "text-ink/50"}`}>
          <Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} strokeWidth={2} />
          {visibleLikeCount}
        </button>
        <button onClick={toggleComments} className="touch-target flex items-center gap-1.5 px-2 text-sm font-body text-ink/50 rounded-lg">
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
          {comments ? comments.length : commentCount}
        </button>
      </div>

      {commentsOpen && <div className="mt-3 space-y-2">
        {comments === null && <><CommentSkeleton /><CommentSkeleton /></>}
        {comments?.length === 0 && <p className="text-xs text-ink/40">Noch keine Kommentare.</p>}
        {comments?.map((c) => <div key={c.id} className="bg-ink/5 rounded-lg px-3 py-2"><AuthorRow creator={c.creator} /><p className="text-xs">{c.body}</p></div>)}
      </div>}
    </div>
  </article>;
}
