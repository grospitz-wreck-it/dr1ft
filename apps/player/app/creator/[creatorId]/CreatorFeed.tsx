"use client";
// apps/player/app/creator/[creatorId]/CreatorFeed.tsx

import { recordInteraction } from "@dr1ft/engine-core";
import type { FeedItem } from "../../../lib/types";
import { PostCard } from "../../../components/PostCard";
import { supabaseBrowserClient } from "../../../lib/supabaseBrowserClient";

export function CreatorFeed({
  posts,
  userId,
  likedContentIds,
}: {
  posts: FeedItem[];
  userId: string;
  likedContentIds: Set<string>;
}) {
  const supabase = supabaseBrowserClient();

  if (posts.length === 0) {
    return <p className="text-ash text-sm">Noch keine Beiträge.</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((item) => (
        <PostCard
          key={item.id}
          item={item}
          userId={userId}
          initiallyLiked={likedContentIds.has(item.id)}
          onView={() =>
            recordInteraction(supabase, {
              userId,
              contentItemId: item.id,
              interactionType: "view",
            })
          }
        />
      ))}
    </div>
  );
}
