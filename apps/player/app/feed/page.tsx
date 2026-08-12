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

  // Freigeschaltete Szenarien über die Klassen des Nutzers
  const { data: memberships } = await supabase
    .from("class_memberships")
    .select("class_id")
    .eq("user_id", user.id);
  const classIds = (memberships ?? []).map((m) => m.class_id);

  const { data: assignments } = await supabase
    .from("class_scenario_assignments")
    .select("scenario_id")
    .in("class_id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]);
  const assignedScenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];

  // Kompetenz-Fortschritt
  const { data: competencyProgress } = await supabase
    .from("user_competency_progress")
    .select("*")
    .eq("user_id", user.id);

  // Alle Kompetenzen (für die Anzeige im Panel — auch die, bei denen
  // noch kein Fortschritt existiert, starten sichtbar bei Level 1)
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

  // Bereits gesehene Inhalte (letzte 200, reicht für Diversitäts-Scoring)
  const { data: recentInteractions } = await supabase
    .from("user_interactions")
    .select("content_item_id, interaction_type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const recentlySeenContentIds = (recentInteractions ?? [])
    .filter((i) => i.interaction_type === "view")
    .map((i) => i.content_item_id);

  // Content-Pool: alle live Posts der freigeschalteten Szenarien PLUS
  // szenario-unabhängiger Ambient-Content (scenario_id IS NULL) — siehe
  // 0012_ambient_content.sql. Ohne Ambient-Content wäre jeder Feed-Post
  // automatisch "verdächtig", weil er zwangsläufig zu einem Szenario gehört.
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

  // camelCase-Mapping (DB liefert snake_case)
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
    extra: row.extra ?? {},
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
      likedContentIds={likedContentIds}
      competencyDisplay={competencyDisplay}
    />
  );
}
