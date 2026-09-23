"use client";
// apps/player/app/creator/[creatorId]/CreatorFeed.tsx

import { recordInteraction } from "@dr1ft/engine-core";
import type { FeedItem } from "../../../lib/types";
import { PostCard } from "../../../components/PostCard";
import { supabaseBrowserClient } from "../../../lib/supabaseBrowserClient";

export function CreatorFeed({
  posts,
  userId,
  classInstanceId,
  likedContentIds,
}: {
  posts: FeedItem[];
  userId: string;
  classInstanceId: string;
  likedContentIds: Set<string>;
}) {
  const supabase = supabaseBrowserClient();
  if (posts.length === 0) return <p className="text-ash text-sm">Noch keine Beiträge.</p>;

  return (
    <div className="space-y-4">
      {posts.map((item) => (
        <PostCard
          key={item.id}
          item={item}
          userId={userId}
          classInstanceId={classInstanceId}
          initiallyLiked={likedContentIds.has(item.id)}
          onView={() => recordInteraction(supabase, {
            userId,
            contentItemId: item.id,
            interactionType: "view",
            classInstanceId,
          })}
        />
      ))}
    </div>
  );
}
