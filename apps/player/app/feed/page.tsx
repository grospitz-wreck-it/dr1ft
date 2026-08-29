// apps/player/app/feed/page.tsx

import { selectNextFeedItems, computeAdaptiveSignalRatio, type FeedContext } from "@dr1ft/engine-core";
import { mapCreatorRow, type FeedItem } from "../../lib/types";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { FeedClient } from "./FeedClient";

export default async function FeedPage() {
  const supabase = supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ash font-body">
        Bitte einloggen.
      </main>
    );
  }

  // Die Player-App arbeitet ausschließlich mit der aktiven Klasseninstanz.
  const { data: instanceMembership } = await supabase
    .from("class_instance_memberships")
    .select("class_instance_id")
    .eq("user_id", user.id)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const classInstanceId = instanceMembership?.class_instance_id ?? null;

  if (!classInstanceId) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ash font-body px-6 text-center">
        Du bist aktuell keiner DR1FT-Klasse zugeordnet.
      </main>
    );
  }

  // Freigeschaltete Szenarien gehören zur konkreten Klasseninstanz.
  const { data: assignments } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classInstanceId);
  const assignedScenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];

  // Kompetenz-Fortschritt des aktuellen Klassenkontexts.
  const { data: competencyProgress } = await supabase
    .from("user_competency_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("class_instance_id", classInstanceId);

  const { data: allCompetencies } = await supabase
    .from("competencies")
    .select("id, title");

  const progressByCompetency = new Map(
    (competencyProgress ?? []).map((c) => [c.competency_id, c.level])
  );
  const competencyDisplay = (allCompetencies ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    level: progressByCompetency.get(c.id) ?? 1,
  }));

  // Eigene Interaktionen sind ebenfalls auf die aktuelle Instanz begrenzt.
  const { data: recentInteractions } = await supabase
    .from("user_interactions")
    .select("content_item_id, interaction_type")
    .eq("user_id", user.id)
    .eq("class_instance_id", classInstanceId)
    .order("created_at", { ascending: false })
    .limit(200);

  const recentlySeenContentIds = (recentInteractions ?? [])
    .filter((i) => i.interaction_type === "view")
    .map((i) => i.content_item_id);

  const scenarioFilter =
    assignedScenarioIds.length > 0
      ? `scenario_id.in.(${assignedScenarioIds.join(",")}),scenario_id.is.null`
      : "scenario_id.is.null";

  const { data: pool } = await supabase
    .from("content_items")
    .select("*, creators(id, display_name, handle, avatar_url)")
    .eq("status", "live")
    .eq("type", "post")
    .or(scenarioFilter);

  // Soziale Aktivität: Likes derselben Klasseninstanz, niemals global.
  const contentIds = (pool ?? []).map((row: any) => row.id);
  const { data: instanceLikes } = contentIds.length
    ? await supabase
        .from("user_interactions")
        .select("content_item_id, user_id")
        .eq("class_instance_id", classInstanceId)
        .eq("interaction_type", "like")
        .in("content_item_id", contentIds)
    : { data: [] as { content_item_id: string; user_id: string }[] };

  const likeCounts = new Map<string, number>();
  for (const like of instanceLikes ?? []) {
    likeCounts.set(like.content_item_id, (likeCounts.get(like.content_item_id) ?? 0) + 1);
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("birth_year")
    .eq("id", user.id)
    .single();

  const ageRating: FeedContext["userAgeRating"] =
    profile?.birth_year && new Date().getFullYear() - profile.birth_year >= 16
      ? "16_plus"
      : "12_plus";

  const ctx: FeedContext = {
    userAgeRating: ageRating,
    competencyProgress: (competencyProgress ?? []).map((c) => ({
      userId: c.user_id,
      competencyId: c.competency_id,
      evidence: c.evidence,
      level: c.level,
      updatedAt: c.updated_at,
    })),
    recentlySeenContentIds,
    recentTechniques: [],
    assignedScenarioIds,
    signalRatio: computeAdaptiveSignalRatio(
      (competencyProgress ?? []).map((c) => ({
        userId: c.user_id,
        competencyId: c.competency_id,
        evidence: c.evidence,
        level: c.level,
        updatedAt: c.updated_at,
      }))
    ),
  };

  const mappedPool: FeedItem[] = (pool ?? []).map((row: any) => ({
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
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    extra: {
      ...(row.extra ?? {}),
      classLikeCount: likeCounts.get(row.id) ?? 0,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creator: mapCreatorRow(row.creators),
  }));

  const items = selectNextFeedItems(mappedPool, ctx, 20) as FeedItem[];

  const likedContentIds = new Set(
    (recentInteractions ?? [])
      .filter((i) => i.interaction_type === "like")
      .map((i) => i.content_item_id)
  );

  return (
    <FeedClient
      initialItems={items}
      userId={user.id}
      classInstanceId={classInstanceId}
      likedContentIds={likedContentIds}
      competencyDisplay={competencyDisplay}
    />
  );
}
