// apps/player/app/feed/page.tsx

import { deriveDriftState, selectNextFeedItems, computeAdaptiveSignalRatio, type FeedContext } from "@dr1ft/engine-core";
import { mapCreatorRow, type FeedItem } from "../../lib/types";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { FeedClient } from "./FeedClient";

export default async function FeedPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="min-h-screen flex items-center justify-center text-ash font-body">Bitte einloggen.</main>;

  const { data: classInstanceId, error: classInstanceError } = await supabase.rpc("get_current_class_instance_id");
  if (classInstanceError || !classInstanceId) return <main className="min-h-screen flex items-center justify-center text-ash font-body px-6 text-center">Du bist aktuell keiner DR1FT-Klasse zugeordnet.</main>;

  const { data: assignments } = await supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classInstanceId);
  const assignedScenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];

  const { data: competencyProgress } = await supabase.from("user_competency_progress").select("*").eq("user_id", user.id).eq("class_instance_id", classInstanceId);
  const { data: allCompetencies } = await supabase.from("competencies").select("id, title");
  const progressByCompetency = new Map((competencyProgress ?? []).map((c) => [c.competency_id, c.level]));
  const competencyDisplay = (allCompetencies ?? []).map((c) => ({ id: c.id, title: c.title, level: progressByCompetency.get(c.id) ?? 1 }));

  const [{ data: currentProfile }, { data: ambientPreferences }] = await Promise.all([
    supabase.from("user_profiles").select("display_name, username, avatar_seed, birth_year").eq("id", user.id).maybeSingle(),
    supabase.from("user_ambient_preferences").select("interest_keys").eq("user_id", user.id).maybeSingle(),
  ]);
  const interestKeys = Array.isArray(ambientPreferences?.interest_keys) ? ambientPreferences.interest_keys.filter((key): key is string => typeof key === "string").slice(0, 3) : [];

  const { data: recentInteractions } = await supabase.from("user_interactions").select("content_item_id, interaction_type").eq("user_id", user.id).eq("class_instance_id", classInstanceId).order("created_at", { ascending: false }).limit(200);
  const recentlySeenContentIds = (recentInteractions ?? []).filter((i) => i.interaction_type === "view").map((i) => i.content_item_id);
  const scenarioFilter = assignedScenarioIds.length > 0 ? `scenario_id.in.(${assignedScenarioIds.join(",")}),scenario_id.is.null` : "scenario_id.is.null";

  const { data: pool } = await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("status", "live").eq("type", "post").or(scenarioFilter);
  const contentIds = (pool ?? []).map((row: any) => row.id);
  const { data: instanceLikes } = contentIds.length
    ? await supabase.from("user_interactions").select("content_item_id, user_id").eq("class_instance_id", classInstanceId).eq("interaction_type", "like").in("content_item_id", contentIds)
    : { data: [] as { content_item_id: string; user_id: string }[] };

  const likeCounts = new Map<string, number>();
  const likeUserIds = [...new Set((instanceLikes ?? []).map((like) => like.user_id))];
  for (const like of instanceLikes ?? []) likeCounts.set(like.content_item_id, (likeCounts.get(like.content_item_id) ?? 0) + 1);
  const { data: socialProfiles } = likeUserIds.length
    ? await supabase.from("user_profiles").select("id, display_name, username, avatar_seed").in("id", likeUserIds)
    : { data: [] as { id: string; display_name: string | null; username: string | null; avatar_seed: string | null }[] };
  const socialProfileById = new Map((socialProfiles ?? []).map((p) => [p.id, p]));
  const socialByContent = new Map<string, Array<{ id: string; displayName: string; username: string; avatarSeed: string }>>();
  for (const like of instanceLikes ?? []) {
    const profile = socialProfileById.get(like.user_id);
    if (!profile) continue;
    const list = socialByContent.get(like.content_item_id) ?? [];
    if (!list.some((p) => p.id === profile.id)) list.push({ id: profile.id, displayName: profile.display_name ?? "DR1FT User", username: profile.username ?? "user", avatarSeed: profile.avatar_seed ?? profile.id });
    socialByContent.set(like.content_item_id, list);
  }

  const mappedPool: FeedItem[] = (pool ?? []).map((row: any) => ({
    id: row.id, type: row.type, scenarioId: row.scenario_id, creatorId: row.creator_id, parentId: row.parent_id,
    title: row.title, body: row.body, mediaUrl: row.media_url, mediaType: row.media_type,
    manipulationTechniques: row.manipulation_techniques ?? [], targetCompetencies: row.target_competencies ?? [],
    difficulty: row.difficulty, ageRating: row.age_rating, sourceRefs: row.source_refs ?? [], status: row.status,
    reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, reviewNotes: row.review_notes,
    extra: { ...(row.extra ?? {}), classLikeCount: likeCounts.get(row.id) ?? 0, classLikeUsers: socialByContent.get(row.id) ?? [] },
    createdAt: row.created_at, updatedAt: row.updated_at, creator: mapCreatorRow(row.creators),
  }));

  const driftState = deriveDriftState(mappedPool, recentInteractions ?? []);
  const ageRating: FeedContext["userAgeRating"] = currentProfile?.birth_year && new Date().getFullYear() - currentProfile.birth_year >= 16 ? "16_plus" : "12_plus";
  const progress = (competencyProgress ?? []).map((c) => ({ userId: c.user_id, competencyId: c.competency_id, evidence: c.evidence, level: c.level, updatedAt: c.updated_at }));
  const recentTechniques = mappedPool.filter((item) => recentlySeenContentIds.includes(item.id)).flatMap((item) => item.manipulationTechniques).slice(0, 12);
  const ctx: FeedContext = { userAgeRating: ageRating, competencyProgress: progress, recentlySeenContentIds, recentTechniques, assignedScenarioIds, signalRatio: computeAdaptiveSignalRatio(progress), interestKeys, driftState };
  const items = selectNextFeedItems(mappedPool, ctx, 20) as FeedItem[];
  const likedContentIds = new Set((recentInteractions ?? []).filter((i) => i.interaction_type === "like").map((i) => i.content_item_id));

  return <FeedClient initialItems={items} userId={user.id} classInstanceId={classInstanceId} likedContentIds={likedContentIds} competencyDisplay={competencyDisplay} profile={{ displayName: currentProfile?.display_name ?? "DR1FT User", username: currentProfile?.username ?? "user", avatarSeed: currentProfile?.avatar_seed ?? user.id }} />;
}
