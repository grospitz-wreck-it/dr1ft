// apps/player/app/creator/[creatorId]/page.tsx
//
// Creator profiles are only reachable inside the active class instance.

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Bitte einloggen.</p></main>;
  }

  const { data: classInstanceId } = await supabase.rpc("get_current_class_instance_id");
  if (!classInstanceId) {
    return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Du bist aktuell keiner DR1FT-Klasse zugeordnet.</p></main>;
  }

  const { data: assignments } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classInstanceId);
  const assignedScenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];

  const { data: creator } = await supabase
    .from("creators")
    .select("id, display_name, handle, avatar_url, persona, scenario_id")
    .eq("id", creatorId)
    .single();

  if (!creator || (creator.scenario_id && !assignedScenarioIds.includes(creator.scenario_id))) {
    return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Profil nicht gefunden.</p></main>;
  }

  const scenarioFilter = assignedScenarioIds.length > 0
    ? `scenario_id.in.(${assignedScenarioIds.join(",")}),scenario_id.is.null`
    : "scenario_id.is.null";

  const { data: posts } = await supabase
    .from("content_items")
    .select("*, creators(id, display_name, handle, avatar_url)")
    .eq("creator_id", creatorId)
    .eq("type", "post")
    .eq("status", "live")
    .or(scenarioFilter)
    .order("created_at", { ascending: false });

  const mappedPosts: FeedItem[] = (posts ?? []).map((row: any) => ({
    id: row.id, type: row.type, scenarioId: row.scenario_id, creatorId: row.creator_id, parentId: row.parent_id,
    title: row.title, body: row.body, mediaUrl: row.media_url, mediaType: row.media_type,
    manipulationTechniques: row.manipulation_techniques ?? [], targetCompetencies: row.target_competencies ?? [],
    difficulty: row.difficulty, ageRating: row.age_rating, sourceRefs: row.source_refs ?? [], status: row.status,
    extra: row.extra ?? {}, createdAt: row.created_at, updatedAt: row.updated_at,
    creator: mapCreatorRow(row.creators),
  }));

  const bio = creator.persona?.bio ?? "";
  const followerCount = creator.persona?.followerCount ?? 128;
  const { data: likes } = await supabase
    .from("user_interactions")
    .select("content_item_id")
    .eq("user_id", user.id)
    .eq("class_instance_id", classInstanceId)
    .eq("interaction_type", "like")
    .in("content_item_id", mappedPosts.map((p) => p.id));
  const likedContentIds = new Set((likes ?? []).map((l) => l.content_item_id));

  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3">
        <a href="/feed" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash"><ChevronLeft className="w-4 h-4" /> Feed</a>
      </header>
      <div className="max-w-md mx-auto px-3 py-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-16 h-16 rounded-full bg-paper text-ink text-xl font-display flex items-center justify-center shrink-0">{initials(creator.display_name)}</span>
          <div><p className="font-display text-lg text-paper">{creator.display_name}</p><p className="font-mono text-xs text-ash">{creator.handle}</p><p className="font-mono text-xs text-ash mt-1">{followerCount} Follower</p></div>
        </div>
        {bio && <p className="font-body text-sm text-paper/80 mb-6">{bio}</p>}
        <p className="font-mono text-[11px] text-ash uppercase tracking-wide mb-3">Beiträge</p>
        <CreatorFeed posts={mappedPosts} userId={user.id} classInstanceId={classInstanceId} likedContentIds={likedContentIds} />
      </div>
    </main>
  );
}
