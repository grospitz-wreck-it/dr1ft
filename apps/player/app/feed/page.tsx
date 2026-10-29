// apps/player/app/feed/page.tsx
import { selectNextFeedItems, computeAdaptiveSignalRatio, type FeedContext } from "@dr1ft/engine-core";
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
  const assignedScenarioIds: string[] = Array.from(new Set<string>((assignments ?? []).map((a) => a.scenario_id)));
  const { data: assignedScenarios } = assignedScenarioIds.length
    ? await supabase.from("scenarios").select("id, title, description, ambient_density").in("id", assignedScenarioIds).order("created_at", { ascending: true })
    : { data: [] as { id: string; title: string; description: string | null; ambient_density: string | null }[] };
  const scenarioIntro = assignedScenarios?.[0] ?? null;
  const { data: scenarioMissions } = scenarioIntro
    ? await supabase.from("missions").select("id").eq("scenario_id", scenarioIntro.id).eq("status", "live")
    : { data: [] as { id: string }[] };
  const scenarioMissionIds = (scenarioMissions ?? []).map((mission) => mission.id);
  const { data: missionContentLinks } = scenarioMissionIds.length
    ? await supabase.from("mission_content_items").select("mission_id, content_item_id, required, order_index").in("mission_id", scenarioMissionIds).order("order_index", { ascending: true })
    : { data: [] as { mission_id: string; content_item_id: string; required: boolean; order_index: number }[] };
  const missionContentIds = Array.from(new Set((missionContentLinks ?? []).map((link) => link.content_item_id)));
  const { data: completedScenarioMissions } = scenarioMissionIds.length
    ? await supabase.from("user_mission_progress").select("mission_id").eq("user_id", user.id).eq("class_instance_id", classInstanceId).eq("status", "completed").in("mission_id", scenarioMissionIds)
    : { data: [] as { mission_id: string }[] };
  const { data: competencyProgress } = await supabase.from("user_competency_progress").select("*").eq("user_id", user.id).eq("class_instance_id", classInstanceId);
  const { data: allCompetencies } = await supabase.from("competencies").select("id, title");
  const progressByCompetency = new Map((competencyProgress ?? []).map((c) => [c.competency_id, c.level]));
  const competencyDisplay = (allCompetencies ?? []).map((c) => ({ id: c.id, title: c.title, level: progressByCompetency.get(c.id) ?? 1 }));
  const [
    { data: currentProfile },
    { data: ambientCatalog },
    { data: ambientPreferences },
  ] = await Promise.all([
    supabase.from("user_profiles").select("display_name, username, avatar_seed, birth_year").eq("id", user.id).maybeSingle(),
    supabase.from("ambient_interests").select("key, parent_key").eq("is_active", true).eq("taxonomy_status", "active"),
    supabase.from("user_ambient_preferences").select("interest_keys").eq("user_id", user.id).maybeSingle(),
  ]);
  const interestParentByKey = new Map((ambientCatalog ?? []).map((interest) => [interest.key, interest.parent_key]));
  const selectedInterestKeys: string[] = Array.isArray(ambientPreferences?.interest_keys)
    ? ambientPreferences.interest_keys.filter((key: unknown): key is string => typeof key === "string")
    : [];
  const addInterestAncestors = (keys: unknown): string[] => {
    if (!Array.isArray(keys)) return [];
    const expanded = new Set<string>();
    for (const rawKey of keys) {
      if (typeof rawKey !== "string") continue;
      let current: string | null | undefined = rawKey;
      const visited = new Set<string>();
      while (current && !visited.has(current)) {
        visited.add(current);
        expanded.add(current);
        current = interestParentByKey.get(current);
      }
    }
    return Array.from(expanded);
  };
  const { data: recentInteractions } = await supabase.from("user_interactions").select("content_item_id, interaction_type").eq("user_id", user.id).eq("class_instance_id", classInstanceId).order("created_at", { ascending: false }).limit(200);
  const recentlySeenContentIds = (recentInteractions ?? []).filter((i) => i.interaction_type === "view").map((i) => i.content_item_id);
  const scenarioFilter = assignedScenarioIds.length > 0 ? `scenario_id.in.(${assignedScenarioIds.join(",")}),scenario_id.is.null` : "scenario_id.is.null";
  const { data: scenarioPool } = await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("status", "live").eq("type", "post").or(scenarioFilter).or(`class_instance_id.eq.${classInstanceId},class_instance_id.is.null`);
  const linkedIdsOutsidePool = missionContentIds.filter((id) => !(scenarioPool ?? []).some((row: any) => row.id === id));
  const { data: linkedMissionPool } = linkedIdsOutsidePool.length
    ? await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").in("id", linkedIdsOutsidePool).eq("status", "live").eq("type", "post")
    : { data: [] as any[] };
  const pool = [...(scenarioPool ?? []), ...(linkedMissionPool ?? [])];
  const contentIds = (pool ?? []).map((row: any) => row.id);
  const { data: instanceLikes } = contentIds.length ? await supabase.from("user_interactions").select("content_item_id, user_id").eq("class_instance_id", classInstanceId).eq("interaction_type", "like").in("content_item_id", contentIds) : { data: [] as { content_item_id: string; user_id: string }[] };
  const { data: npcLikes } = contentIds.length ? await supabase.from("npc_social_interactions").select("content_item_id").eq("class_instance_id", classInstanceId).eq("interaction_type", "like").in("content_item_id", contentIds) : { data: [] as { content_item_id: string }[] };
  const { data: classComments } = contentIds.length
    ? await supabase.from("content_items").select("id, parent_id").eq("class_instance_id", classInstanceId).eq("type", "comment").eq("status", "live").in("parent_id", contentIds)
    : { data: [] as { id: string; parent_id: string | null }[] };
  const { data: scenarioComments } = contentIds.length && assignedScenarioIds.length
    ? await supabase.from("content_items").select("id, parent_id").is("class_instance_id", null).in("scenario_id", assignedScenarioIds).eq("type", "comment").eq("status", "live").in("parent_id", contentIds)
    : { data: [] as { id: string; parent_id: string | null }[] };
  const likeCounts = new Map<string, number>(); const commentCounts = new Map<string, number>(); const likeUserIds: string[] = Array.from(new Set<string>((instanceLikes ?? []).map((like) => like.user_id)));
  for (const like of instanceLikes ?? []) likeCounts.set(like.content_item_id, (likeCounts.get(like.content_item_id) ?? 0) + 1);
  for (const like of npcLikes ?? []) likeCounts.set(like.content_item_id, (likeCounts.get(like.content_item_id) ?? 0) + 1);
  const countedCommentIds = new Set<string>();
  for (const comment of [...(scenarioComments ?? []), ...(classComments ?? [])]) {
    if (!comment.id || !comment.parent_id || countedCommentIds.has(comment.id)) continue;
    countedCommentIds.add(comment.id);
    commentCounts.set(comment.parent_id, (commentCounts.get(comment.parent_id) ?? 0) + 1);
  }
  const { data: socialProfiles } = likeUserIds.length ? await supabase.from("user_profiles").select("id, display_name, username, avatar_seed").in("id", likeUserIds) : { data: [] as { id: string; display_name: string | null; username: string | null; avatar_seed: string | null }[] };
  const socialProfileById = new Map((socialProfiles ?? []).map((p) => [p.id, p])); const socialByContent = new Map<string, Array<{ id: string; displayName: string; username: string; avatarSeed: string }>>();
  for (const like of instanceLikes ?? []) { const profile = socialProfileById.get(like.user_id); if (!profile) continue; const list = socialByContent.get(like.content_item_id) ?? []; if (!list.some((p) => p.id === profile.id)) list.push({ id: profile.id, displayName: profile.display_name ?? "DR1FT User", username: profile.username ?? "user", avatarSeed: profile.avatar_seed ?? profile.id }); socialByContent.set(like.content_item_id, list); }
  const mappedPool: FeedItem[] = (pool ?? []).map((row: any) => ({ id: row.id, type: row.type, scenarioId: row.scenario_id, creatorId: row.creator_id, parentId: row.parent_id, title: row.title, body: row.body, mediaUrl: row.media_url, mediaType: row.media_type, manipulationTechniques: row.manipulation_techniques ?? [], targetCompetencies: row.target_competencies ?? [], difficulty: row.difficulty, ageRating: row.age_rating, sourceRefs: row.source_refs ?? [], status: row.status, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, reviewNotes: row.review_notes, extra: { ...(row.extra ?? {}), interestKeys: addInterestAncestors(row.extra?.interestKeys), classLikeCount: likeCounts.get(row.id) ?? 0, classLikeUsers: socialByContent.get(row.id) ?? [], classCommentCount: commentCounts.get(row.id) ?? 0 }, createdAt: row.created_at, updatedAt: row.updated_at, creator: mapCreatorRow(row.creators) }));
  const ageRating: FeedContext["userAgeRating"] = currentProfile?.birth_year && new Date().getFullYear() - currentProfile.birth_year >= 16 ? "16_plus" : "12_plus";
  const progress = (competencyProgress ?? []).map((c) => ({ userId: c.user_id, competencyId: c.competency_id, evidence: c.evidence, level: c.level, updatedAt: c.updated_at }));
  const recentTechniques = mappedPool.filter((item) => recentlySeenContentIds.includes(item.id)).flatMap((item) => item.manipulationTechniques).slice(0, 12);
  const ambientDensity = scenarioIntro?.ambient_density ?? "medium";
  const ambientSignalRatios: Record<string, number> = { off: 1, low: 0.9, medium: 0.7, high: 0.5 };
  const ctx: FeedContext = { userAgeRating: ageRating, competencyProgress: progress, recentlySeenContentIds, recentTechniques, assignedScenarioIds, signalRatio: ambientSignalRatios[ambientDensity] ?? computeAdaptiveSignalRatio(progress), interestKeys: selectedInterestKeys };
  // If a generated Learning Design has approved/live posts linked to its steps,
  // play those posts as a deliberate sequence instead of mixing them into the
  // generic recommendation feed. Legacy scenarios keep the existing feed path.
  let learningSequenceItems: FeedItem[] | null = null;

  if (scenarioIntro) {
    const { data: latestDesign } = await supabase
      .from("learning_designs")
      .select("id")
      .eq("scenario_id", scenarioIntro.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDesign) {
      const { data: steps } = await supabase
        .from("learning_steps")
        .select("id, step_index, title, description")
        .eq("learning_design_id", latestDesign.id)
        .order("step_index", { ascending: true });

      const stepIds = (steps ?? []).map((step) => step.id);
      const { data: links } = stepIds.length
        ? await supabase
            .from("learning_step_content")
            .select("learning_step_id, content_item_id, order_index, required")
            .in("learning_step_id", stepIds)
        : { data: [] as { learning_step_id: string; content_item_id: string; order_index: number; required: boolean }[] };

      const livePostIds = new Set(mappedPool.map((item) => item.id));
      const usableLinks = (links ?? []).filter((link) => livePostIds.has(link.content_item_id));
      const linkedContentIds = Array.from(new Set(usableLinks.map((link) => link.content_item_id)));
      const { data: viewedRows } = linkedContentIds.length
        ? await supabase
            .from("user_interactions")
            .select("content_item_id")
            .eq("user_id", user.id)
            .eq("class_instance_id", classInstanceId)
            .eq("interaction_type", "view")
            .in("content_item_id", linkedContentIds)
        : { data: [] as { content_item_id: string }[] };
      const viewedIds = new Set((viewedRows ?? []).map((row) => row.content_item_id));

      const stepsWithLiveContent = (steps ?? [])
        .map((step) => {
          const stepLinks = usableLinks
            .filter((link) => link.learning_step_id === step.id)
            .sort((a, b) => a.order_index - b.order_index);
          const requiredIds = stepLinks.filter((link) => link.required).map((link) => link.content_item_id);
          const progressIds = requiredIds.length ? requiredIds : stepLinks.map((link) => link.content_item_id);
          return { step, stepLinks, progressIds, done: progressIds.length > 0 && progressIds.every((id) => viewedIds.has(id)) };
        })
        .filter((entry) => entry.stepLinks.length > 0);

      const active = stepsWithLiveContent.find((entry) => !entry.done);
      if (active) {
        const activeIds = new Set(active.stepLinks.map((link) => link.content_item_id));
        const order = new Map(active.stepLinks.map((link) => [link.content_item_id, link.order_index]));
        learningSequenceItems = mappedPool
          .filter((item) => activeIds.has(item.id))
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        const requiredIds = active.progressIds;
        const viewedCount = requiredIds.filter((id) => viewedIds.has(id)).length;
      } else if (stepsWithLiveContent.length > 0) {
        // The learning sequence has no remaining unseen step. Do not render
        // an empty feed: return to the existing feed selector as a safe fallback.
        learningSequenceItems = null;
      }
    }
  }

  // Density controls both the mix and the amount of content a learner is expected to read.
  // A higher density produces a longer session, not just a different ratio.
  const densityAwarePool = ambientDensity === "off"
    ? mappedPool.filter((item) => item.scenarioId !== null)
    : mappedPool;
  const feedItemTargets: Record<string, number> = { off: 12, low: 16, medium: 20, high: 28 };
  const personalizedAmbientLimits: Record<string, number> = { off: 0, low: 1, medium: 3, high: 6 };
  const selectedFeedItems = learningSequenceItems !== null
    ? learningSequenceItems
    : selectNextFeedItems(densityAwarePool, ctx, feedItemTargets[ambientDensity] ?? 20) as FeedItem[];
  // Explicit mission mappings are mandatory curriculum content, but must be
  // woven into the feed rather than shown as a block before ambient posts.
  const missionContentOrder = new Map((missionContentLinks ?? []).map((link) => [link.content_item_id, link.order_index]));
  const requiredMissionItems = mappedPool
    .filter((item) => missionContentOrder.has(item.id) && !recentlySeenContentIds.includes(item.id))
    .sort((a, b) => (missionContentOrder.get(a.id) ?? 0) - (missionContentOrder.get(b.id) ?? 0));
  const missionContentIdsSet = new Set(requiredMissionItems.map((item) => item.id));
  const ambientBaseItems = selectedFeedItems.filter((item) => !missionContentIdsSet.has(item.id));

  // Keep the learning sequence intact, but always supplement it with a small
  // set of live ambient posts that match this learner's chosen interests.
  // This guarantees personalization even when a generated learning design
  // would otherwise replace the generic recommendation feed entirely.
  const selectedInterestHierarchyKeys = new Set(addInterestAncestors(selectedInterestKeys));
  const personalizedAmbientItems = selectedInterestHierarchyKeys.size && (personalizedAmbientLimits[ambientDensity] ?? 3) > 0
    ? densityAwarePool
        .filter((item) => {
          const ageOrder = { all_ages: 0, "12_plus": 1, "16_plus": 2 } as const;
          if (ageOrder[item.ageRating] > ageOrder[ageRating]) return false;
          if (item.manipulationTechniques.length > 0) return false;
          const itemKeys = Array.isArray(item.extra?.interestKeys)
            ? item.extra.interestKeys.filter((key: unknown): key is string => typeof key === "string")
            : [];
          return itemKeys.some((key) => selectedInterestHierarchyKeys.has(key));
        })
        .sort((a, b) => {
          const countMatches = (item: FeedItem) => {
            const keys = Array.isArray(item.extra?.interestKeys)
              ? item.extra.interestKeys.filter((key: unknown): key is string => typeof key === "string")
              : [];
            return keys.filter((key) => selectedInterestHierarchyKeys.has(key)).length;
          };
          return countMatches(b) - countMatches(a) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .filter((item) => !ambientBaseItems.some((baseItem) => baseItem.id === item.id) && !missionContentIdsSet.has(item.id))
        .slice(0, personalizedAmbientLimits[ambientDensity] ?? 3)
    : [];

  const ambientItems = [...ambientBaseItems, ...personalizedAmbientItems];
  // Interleave mission posts after short ambient runs. The mission sequence
  // stays ordered, while learners encounter mission content among ordinary
  // feed posts and have to recognize it in context.
  const items: FeedItem[] = [];
  let missionIndex = 0;
  const ambientPerMission = ambientDensity === "high" ? 3 : ambientDensity === "medium" ? 2 : 1;
  for (let i = 0; i < ambientItems.length; i += 1) {
    items.push(ambientItems[i]);
    if (ambientPerMission > 0 && (i + 1) % ambientPerMission === 0 && missionIndex < requiredMissionItems.length) {
      items.push(requiredMissionItems[missionIndex++]);
    }
  }
  // If ambient content is sparse, never drop required mission posts.
  while (missionIndex < requiredMissionItems.length) items.push(requiredMissionItems[missionIndex++]);
  const likedContentIds = new Set((recentInteractions ?? []).filter((i) => i.interaction_type === "like").map((i) => i.content_item_id));

  return <FeedClient initialItems={items} userId={user.id} classInstanceId={classInstanceId} likedContentIds={likedContentIds} scenarioIntro={scenarioIntro} scenarioMissionCount={scenarioMissionIds.length} completedScenarioMissionCount={new Set((completedScenarioMissions ?? []).map((mission) => mission.mission_id)).size} profile={{ displayName: currentProfile?.display_name ?? "DR1FT User", username: currentProfile?.username ?? "user", avatarSeed: currentProfile?.avatar_seed ?? user.id }} />;
}
