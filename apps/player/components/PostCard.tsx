"use client";
// apps/player/components/PostCard.tsx
//
// Every card deliberately exposes the same interaction layer. Ambient posts
// are not visually distinguishable from scenario/signal posts. The card
// metadata decides what an inspection reveals; every action still produces
// immediate feedback so exploration itself feels like a normal product flow.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Eye,
  Flag,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Search,
  Share2,
  UserRound,
  X,
} from "lucide-react";
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

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const baseLikeCount = Number((item.extra as any)?.baseEngagement ?? 0);
  const commentCount = Number((item.extra as any)?.baseCommentCount ?? 0);
  const extra = (item.extra ?? {}) as Record<string, unknown>;
  const action = (extra.action ?? {}) as Record<string, unknown>;
  const mediaContext = (extra.media_context ?? {}) as Record<string, unknown>;

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

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2800);
  }

  async function track(interactionType:
    | "inspect_source"
    | "inspect_media"
    | "inspect_context"
    | "inspect_profile"
    | "compare_information"
    | "share"
    | "report"
    | "ignore"
  ) {
    await recordInteraction(supabase, {
      userId,
      contentItemId: item.id,
      interactionType,
      metadata: { ui: "generic_card_actions" },
    });
  }

  function toggleLike() {
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

  async function inspectSource() {
    await track("inspect_source");
    const namedAuthor = getString(action.expected_observation) || getStringArray(action.expected_observation)[0];
    if (item.sourceRefs?.length) {
      showFeedback(`Quelle: ${item.sourceRefs[0].label}`);
    } else if (namedAuthor === "no_named_author" || getStringArray(action.expected_observation).includes("no_named_author")) {
      showFeedback("Hier ist keine konkrete Autorin oder kein konkreter Autor genannt.");
    } else {
      showFeedback("Die Quelle sieht glaubwürdig aus.");
    }
  }

  async function inspectMedia() {
    await track("inspect_media");
    if (getString(mediaContext.current_claim)) {
      const date = getString(mediaContext.original_date);
      const location = getString(mediaContext.original_location);
      const detail = [date, location].filter(Boolean).join(" · ");
      showFeedback(detail ? `Bildkontext: ${detail}.` : "Das Bild lässt sich hier im Kontext prüfen.");
    } else {
      showFeedback("Das Bild wirkt echt und passt zum Beitrag.");
    }
  }

  async function inspectContext() {
    await track("inspect_context");
    if (getString(mediaContext.current_claim)) {
      showFeedback("Der Kontext dieses Beitrags sollte mit weiteren Informationen abgeglichen werden.");
    } else {
      showFeedback("Der Kontext passt zu dem, was im Beitrag beschrieben wird.");
    }
  }

  async function inspectProfile() {
    await track("inspect_profile");
    showFeedback("Das Profil wirkt auf den ersten Blick unauffällig.");
  }

  async function compareInformation() {
    await track("compare_information");
    showFeedback("Die Informationen lassen sich am besten mit einer weiteren Quelle vergleichen.");
  }

  async function share() {
    await track("share");
    await recordInteraction(supabase, {
      userId,
      contentItemId: item.id,
      interactionType: "share",
      metadata: { ui: "generic_card_actions", simulated: true },
    });
    showFeedback("Beitrag zum Teilen vorgemerkt.");
    setMenuOpen(false);
  }

  async function report() {
    await track("report");
    showFeedback("Deine Meldung wurde aufgenommen.");
    setMenuOpen(false);
  }

  async function ignore() {
    await track("ignore");
    showFeedback("Beitrag wird für dich ausgeblendet.");
    setMenuOpen(false);
  }

  return (
    <article ref={ref} className="relative bg-paper text-ink rounded-card overflow-visible shadow-sm">
      <div className="p-4 pb-0">
        <AuthorRow creator={item.creator} />
        <p className="font-mono text-[11px] text-ink/50 mb-2 uppercase tracking-wide">
          {item.type}
        </p>
      </div>

      {item.mediaUrl && item.mediaType === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.mediaUrl} alt="" className="w-full max-h-96 object-cover" loading="lazy" />
      )}
      {item.mediaUrl && item.mediaType === "video" && (
        <video src={item.mediaUrl} controls className="w-full max-h-96 object-cover bg-black" />
      )}

      <div className="p-4 pt-3">
        <p className="font-body text-[15px] leading-relaxed">{item.body}</p>

        <div className="relative flex items-center gap-1 mt-3 pt-3 border-t border-ink/10">
          <button
            onClick={toggleLike}
            className={`tap-pulse touch-target flex items-center gap-1.5 px-2 text-sm font-body rounded-lg ${liked ? "text-red-500" : "text-ink/50"}`}
            aria-label="Gefällt mir"
          >
            <Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} strokeWidth={2} />
            {baseLikeCount + (liked ? 1 : 0)}
          </button>

          <button
            onClick={toggleComments}
            className="touch-target flex items-center gap-1.5 px-2 text-sm font-body text-ink/50 rounded-lg"
            aria-label="Kommentare anzeigen"
          >
            <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            {comments ? comments.length : commentCount}
          </button>

          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="touch-target ml-auto flex items-center gap-1 px-2 text-ink/50 rounded-lg"
            aria-label="Weitere Aktionen"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-sm font-body hidden sm:inline">Mehr</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute z-20 right-0 bottom-12 w-60 rounded-xl border border-ink/10 bg-paper shadow-xl p-1.5">
              <ActionButton icon={<Search />} label="Quelle ansehen" onClick={inspectSource} />
              <ActionButton icon={<ImageIcon />} label="Bild prüfen" onClick={inspectMedia} />
              <ActionButton icon={<Eye />} label="Kontext prüfen" onClick={inspectContext} />
              <ActionButton icon={<UserRound />} label="Profil ansehen" onClick={inspectProfile} />
              <ActionButton icon={<Search />} label="Informationen vergleichen" onClick={compareInformation} />
              <div className="my-1 border-t border-ink/10" />
              <ActionButton icon={<Share2 />} label="Teilen" onClick={share} />
              <ActionButton icon={<Flag />} label="Melden" onClick={report} />
              <ActionButton icon={<X />} label="Ignorieren" onClick={ignore} />
            </div>
          )}
        </div>

        {feedback && (
          <div className="mt-3 rounded-lg bg-ink/5 px-3 py-2.5 flex items-start gap-2 text-xs leading-relaxed" role="status">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{feedback}</span>
          </div>
        )}

        {commentsOpen && (
          <div className="mt-3 space-y-2">
            {comments === null && (
              <>
                <CommentSkeleton />
                <CommentSkeleton />
              </>
            )}
            {comments?.length === 0 && <p className="text-xs text-ink/40">Noch keine Kommentare.</p>}
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

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-body text-ink hover:bg-ink/5 active:bg-ink/10"
    >
      <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 text-ink/60">{icon}</span>
      {label}
    </button>
  );
}
