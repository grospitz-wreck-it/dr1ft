"use client";
// apps/player/components/PostCard.tsx
//
// Content-Karten sind bewusst NEUTRAL und hell — sie sollen wie ein
// "echter" Social-Post wirken, im Kontrast zur dunklen Analyse-Chrome
// der App drumherum. Erst die ReflectionOverlay bricht diese Neutralität
// auf (siehe dort).
//
// Like + Kommentare geben dem Feed ein "lebendiges" Gefühl (siehe
// 06_FEED_PHILOSOPHY: "Living Information Space"). Kommentare sind
// bewusst NUR lesbar/vorautoriert (redaktionell geprüft) — ein freies
// Kommentarfeld für Schüler:innen wäre ein eigenes Moderations-/
// Kinderschutzthema und hier nicht einfach "nebenbei" gelöst.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import type { FeedItem, CreatorSummary } from "../lib/types";
import { mapCreatorRow } from "../lib/types";
import { recordInteraction } from "@dr1ft/engine-core";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { CommentSkeleton } from "./Skeleton";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AuthorRow({ creator }: { creator?: CreatorSummary }) {
  if (!creator) return null;
  return (
    <Link
      href={`/creator/${creator.id}`}
      className="flex items-center gap-2 mb-2 group"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="w-6 h-6 rounded-full bg-ink text-paper text-[10px] font-mono flex items-center justify-center shrink-0">
        {initials(creator.displayName)}
      </span>
      <span className="text-xs font-medium text-ink group-hover:underline">
        {creator.displayName}
      </span>
      <span className="text-xs text-ink/40">{creator.handle}</span>
    </Link>
  );
}

export function PostCard({
  item,
  userId,
  initiallyLiked,
  onView,
}: {
  item: FeedItem;
  userId: string;
  initiallyLiked: boolean;
  onView: () => void;
}) {
  const supabase = supabaseBrowserClient();
  const ref = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(initiallyLiked);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedItem[] | null>(null);

  const baseLikeCount = Number((item.extra as any)?.baseEngagement ?? 0);
  const commentCount = Number((item.extra as any)?.baseCommentCount ?? 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && onView()),
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onView]);

  function toggleLike() {
    // Bewusst nur "hinzufügen" — kein Zurückziehen einer bereits
    // gespeicherten Interaktion, das ist für ein Lern-Analytics-System
    // ohnehin nicht die entscheidende Feinheit. UI wirkt trotzdem sofort.
    if (!liked) {
      setLiked(true);
      recordInteraction(supabase, {
        userId,
        contentItemId: item.id,
        interactionType: "like",
      });
    }
  }

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) {
      const { data } = await supabase
        .from("content_items")
        .select("*, creators(id, display_name, handle, avatar_url)")
        .eq("parent_id", item.id)
        .eq("type", "comment")
        .eq("status", "live")
        .order("created_at", { ascending: true });

      const mapped: FeedItem[] = (data ?? []).map((row: any) => ({
        ...row,
        creator: mapCreatorRow(row.creators),
      }));
      setComments(mapped);
    }
  }

  return (
    <article ref={ref} className="bg-paper text-ink rounded-card overflow-hidden shadow-sm">
      <div className="p-4 pb-0">
        <AuthorRow creator={item.creator} />
        <p className="font-mono text-[11px] text-ink/50 mb-2 uppercase tracking-wide">
          {item.type}
        </p>
      </div>

      {item.mediaUrl && item.mediaType === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.mediaUrl}
          alt=""
          className="w-full max-h-96 object-cover"
          loading="lazy"
        />
      )}
      {item.mediaUrl && item.mediaType === "video" && (
        <video
          src={item.mediaUrl}
          controls
          className="w-full max-h-96 object-cover bg-black"
        />
      )}

      <div className="p-4 pt-3">
        <p className="font-body text-[15px] leading-relaxed">{item.body}</p>

        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-ink/10">
        <button
          onClick={toggleLike}
          className={`tap-pulse touch-target flex items-center gap-1.5 px-2 text-sm font-body rounded-lg ${
            liked ? "text-red-500" : "text-ink/50"
          }`}
        >
          <Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} strokeWidth={2} />
          {baseLikeCount + (liked ? 1 : 0)}
        </button>

        <button
          onClick={toggleComments}
          className="touch-target flex items-center gap-1.5 px-2 text-sm font-body text-ink/50 rounded-lg"
        >
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
          {comments ? comments.length : commentCount}
        </button>
      </div>

      {commentsOpen && (
        <div className="mt-3 space-y-2">
          {comments === null && (
            <>
              <CommentSkeleton />
              <CommentSkeleton />
            </>
          )}
          {comments?.length === 0 && (
            <p className="text-xs text-ink/40">Noch keine Kommentare.</p>
          )}
          {comments?.map((c) => (
            <div key={c.id} className="bg-ink/5 rounded-lg px-3 py-2">
              <AuthorRow creator={c.creator} />
              <p className="text-xs">{c.body}</p>
            </div>
          ))}
        </div>
      )}
      </div>
    </article>
  );
}

