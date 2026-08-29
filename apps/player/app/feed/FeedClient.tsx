"use client";
// apps/player/app/feed/FeedClient.tsx

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { recordInteraction, startRealtimeEventBridge, eventBus } from "@dr1ft/engine-core";
import type { FeedItem } from "../../lib/types";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { PostCard } from "../../components/PostCard";
import { ReflectionOverlay } from "../../components/ReflectionOverlay";
import { CompetencyPanel, type CompetencyDisplay } from "../../components/CompetencyPanel";

export function FeedClient({
  initialItems,
  userId,
  classInstanceId,
  likedContentIds,
  competencyDisplay,
}: {
  initialItems: FeedItem[];
  userId: string;
  classInstanceId: string;
  likedContentIds: Set<string>;
  competencyDisplay: CompetencyDisplay[];
}) {
  const supabase = supabaseBrowserClient();
  const [reflection, setReflection] = useState<{
    missionId: string;
    contentItemId: string;
  } | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stop = startRealtimeEventBridge(supabase, userId);
    return stop;
  }, [userId]);

  useEffect(() => {
    const unsubscribe = eventBus.on("MissionCompleted", async (event) => {
      const { data: mission } = await supabase
        .from("missions")
        .select("reflection_content_id")
        .eq("id", event.missionId)
        .single();

      if (mission?.reflection_content_id) {
        setReflection({
          missionId: event.missionId,
          contentItemId: mission.reflection_content_id,
        });
      }
    });
    return unsubscribe;
  }, []);

  function handleView(item: FeedItem) {
    if (seenRef.current.has(item.id)) return;
    seenRef.current.add(item.id);
    recordInteraction(supabase, {
      userId,
      contentItemId: item.id,
      interactionType: "view",
      classInstanceId,
    });
  }

  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3 flex items-center justify-between">
        <p className="font-display text-paper text-lg tracking-tight">DR1FT</p>
        <a href="/messages" className="touch-target flex items-center gap-1.5 font-mono text-xs text-ash">
          <MessageCircle className="w-4 h-4" /> Nachrichten
        </a>
      </header>

      <div className="md:max-w-4xl md:mx-auto md:grid md:grid-cols-[1fr_280px] md:gap-8 md:items-start md:px-6 md:py-6">
        <div className="max-w-md mx-auto md:max-w-none py-4 px-3 md:px-0 space-y-4">
          {initialItems.length === 0 && (
            <p className="text-ash text-sm font-body text-center py-16">
              Für dich sind gerade keine Szenarien freigeschaltet. Frag deine
              Lehrkraft, ob eure Klasse schon ein Szenario zugewiesen bekommen hat.
            </p>
          )}

          {initialItems.map((item) => (
            <PostCard
              key={item.id}
              item={item}
              userId={userId}
              classInstanceId={classInstanceId}
              initiallyLiked={likedContentIds.has(item.id)}
              onView={() => handleView(item)}
            />
          ))}

          <div className="md:hidden bg-ink-light border border-ink-border rounded-card p-4 mt-2">
            <CompetencyPanel initial={competencyDisplay} />
          </div>
        </div>

        <aside className="hidden md:block sticky top-24 bg-ink-light border border-ink-border rounded-card p-5">
          <CompetencyPanel initial={competencyDisplay} />
        </aside>
      </div>

      {reflection && (
        <ReflectionOverlay
          contentItemId={reflection.contentItemId}
          onClose={() => setReflection(null)}
        />
      )}
    </main>
  );
}
