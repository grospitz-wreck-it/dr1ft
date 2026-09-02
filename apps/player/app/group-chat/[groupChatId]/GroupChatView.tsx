"use client";
// apps/player/app/group-chat/[groupChatId]/GroupChatView.tsx
//
// Kaskadierendes Reveal statt alles auf einmal — simuliert, dass mehrere
// Personen nacheinander in den Chat schreiben. Macht Gruppendruck/soziale
// Bewährung sichtbar erlebbar statt nur behauptet.

import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { recordInteraction } from "@dr1ft/engine-core";
import type { FeedItem } from "../../../lib/types";
import { supabaseBrowserClient } from "../../../lib/supabaseBrowserClient";
import { Skeleton } from "../../../components/Skeleton";

const REVEAL_DELAY_MS = 900;

export function GroupChatView({
  messages,
  userId,
  classInstanceId,
}: {
  messages: FeedItem[];
  userId: string;
  classInstanceId: string;
}) {
  const supabase = supabaseBrowserClient();
  const [visibleCount, setVisibleCount] = useState(Math.min(1, messages.length));

  useEffect(() => {
    if (visibleCount >= messages.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
      const msg = messages[visibleCount];
      if (msg) {
        void recordInteraction(supabase, {
          userId,
          contentItemId: msg.id,
          interactionType: "view",
          classInstanceId,
        });
      }
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visibleCount, messages, userId, classInstanceId, supabase]);

  return (
    <div className="space-y-3">
      {messages.slice(0, visibleCount).map((m) => (
        <div key={m.id} className="bg-paper text-ink rounded-card px-4 py-3 max-w-[85%]">
          <p className="text-xs font-medium text-ink/60 mb-1">
            {m.creator?.displayName ?? "?"}
          </p>
          <p className="text-sm">{m.body}</p>
          {typeof (m.extra as any)?.reactionCount === "number" && (
            <p className="flex items-center gap-1 text-xs text-ink/40 mt-1">
              <ThumbsUp className="w-3 h-3" /> {(m.extra as any).reactionCount}
            </p>
          )}
        </div>
      ))}
      {visibleCount < messages.length && (
        <div className="bg-paper/40 rounded-card px-4 py-3 max-w-[60%] flex gap-1 items-center">
          <Skeleton className="w-1.5 h-1.5 rounded-full" />
          <Skeleton className="w-1.5 h-1.5 rounded-full" />
          <Skeleton className="w-1.5 h-1.5 rounded-full" />
        </div>
      )}
    </div>
  );
}
