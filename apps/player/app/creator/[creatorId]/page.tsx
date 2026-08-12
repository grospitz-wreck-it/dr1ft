// apps/player/app/creator/[creatorId]/page.tsx
//
// WICHTIG: Diese Seite darf NICHT verraten, ob ein Account 'ambient',
// 'antagonist' oder 'ally' ist (creator_role wird bewusst nicht
// abgefragt/angezeigt) — sonst wäre die Lernübung sofort durchschaut.
// Jedes Profil sieht strukturell gleich normal aus.

import { ChevronLeft } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { mapCreatorRow, type FeedItem } from "../../../lib/types";
import { CreatorFeed } from "./CreatorFeed";

interface Props {
  params: { creatorId: string };
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function CreatorProfilePage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { creatorId } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, display_name, handle, avatar_url, persona")
    .eq("id", creatorId)
    .single();

  if (!creator) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-ash text-sm">Profil nicht gefunden.</p>
      </main>
    );
  }

  const { data: posts } = await supabase
    .from("content_items")
    .select("*, creators(id, display_name, handle, avatar_url)")
    .eq("creator_id", creatorId)
    .eq("type", "post")
    .eq("status", "live")
    .order("created_at", { ascending: false });

  const mappedPosts: FeedItem[] = (posts ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    scenarioId: row.scenario_id,
    creatorId: row.creator_id,
    parentId: row.parent_id,
    title: row.title,
    body: row.body,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    manipulationTechniques: row.manipulation_techniques ?? [],
    targetCompetencies: row.target_competencies ?? [],
    difficulty: row.difficulty,
    ageRating: row.age_rating,
    sourceRefs: row.source_refs ?? [],
    status: row.status,
    extra: row.extra ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creator: mapCreatorRow(row.creators),
  }));

  const bio = creator.persona?.bio ?? "";
  const followerCount = creator.persona?.followerCount ?? 128;

  let likedContentIds = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from("user_interactions")
      .select("content_item_id")
      .eq("user_id", user.id)
      .eq("interaction_type", "like")
      .in("content_item_id", mappedPosts.map((p) => p.id));
    likedContentIds = new Set((likes ?? []).map((l) => l.content_item_id));
  }

  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3">
        <a href="/feed" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash">
          <ChevronLeft className="w-4 h-4" /> Feed
        </a>
      </header>

      <div className="max-w-md mx-auto px-3 py-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-16 h-16 rounded-full bg-paper text-ink text-xl font-display flex items-center justify-center shrink-0">
            {initials(creator.display_name)}
          </span>
          <div>
            <p className="font-display text-lg text-paper">{creator.display_name}</p>
            <p className="font-mono text-xs text-ash">{creator.handle}</p>
            <p className="font-mono text-xs text-ash mt-1">{followerCount} Follower</p>
          </div>
        </div>

        {bio && <p className="font-body text-sm text-paper/80 mb-6">{bio}</p>}

        <p className="font-mono text-[11px] text-ash uppercase tracking-wide mb-3">
          Beiträge
        </p>

        {user ? (
          <CreatorFeed
            posts={mappedPosts}
            userId={user.id}
            likedContentIds={likedContentIds}
          />
        ) : (
          <p className="text-ash text-sm">Bitte einloggen, um Beiträge zu sehen.</p>
        )}
      </div>
    </main>
  );
}
