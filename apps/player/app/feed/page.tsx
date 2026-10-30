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
  const { data: assignments } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id,scheduled_start_at,scheduled_end_at,is_active,archived_at")
    .eq("class_instance_id", classInstanceId)
    .eq("is_active", true)
    .is("archived_at", null);
  const now = Date.now();
  const availableAssignments = (assignments ?? []).filter((assignment: any) => {
    const startsAt = assignment.scheduled_start_at ? new Date(assignment.scheduled_start_at).getTime() : null;
    const endsAt = assignment.scheduled_end_at ? new Date(assignment.scheduled_end_at).getTime() : null;
    return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt > now);
  });
  const assignedScenarioIds: string[] = Array.from(new Set<string>(availableAssignments.map((a: any) => a.scenario_id)));
  const { data: assignedScenarios } = assignedScenarioIds.length
    ? await supabase.from("scenarios").select("id, title, description, ambient_density").in("id", assignedScenarioIds).order("created_at", { ascending: true })
    : { data: [] as { id: string; title: string; description: string | null; ambient_density: string | null }[] };
  const scenarioIntros = assignedScenarios ?? [];
  const scenarioIntro = scenarioIntros[0] ?? null;
  const scenarioIntroTitle = scenarioIntros.length > 1
    ? "Mehrere Perspektiven. Ein gemeinsamer Feed."
    : scenarioIntro?.title ?? null;
  const scenarioIntroDescription = scenarioIntros.length > 1
    ? "In deinem Feed begegnen dir Inhalte aus mehreren Szenarien. Die Themen und Perspektiven wechseln sich ab – dazwischen erscheinen ganz normale Beiträge. Schau genau hin, verknüpfe Hinweise und bilde dir deine eigene Meinung. Nicht jeder Beitrag gehört zum selben Zusammenhang."
    : scenarioIntro?.description ?? null;
  const { data: scenarioMissions } = assignedScenarioIds.length
    ? await supabase.from("missions").select("id").in("scenario_id", assignedScenarioIds).eq("status", "live")
    : { data: [] as { id: string }[] };
  const scenarioMissionIds = (scenarioMissions ?? []).map((mission) => mission.id);
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
  const { data: pool } = await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("status", "live").eq("type", "post").or(scenarioFilter).or(`class_instance_id.eq.${classInstanceId},class_instance_id.is.null`);
  const contentIds = (pool ?? []).map((row: any) => row.id);
  const creatorIds = Array.from(new Set((pool ?? []).map((row: any) => row.creator_id).filter((id: unknown): id is string => typeof id === "string")));\n  const { data: creatorRows } = creatorIds.length ? await supabase.from("creators").select("id, display_name, handle, avatar_url").in("id", creatorIds) : { data: [] as { id: string; display_name: string; handle: string; avatar_url: string | null }[] };\n  const creatorById = new Map((creatorRows ?? []).map((creator) => [creator.id, creator]));
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
  const mappedPool: FeedItem[] = (pool ?? []).map((row: any) => ({ id: row.id, type: row.type, scenarioId: row.scenario_id, creatorId: row.creator_id, parentId: row.parent_id, title: row.title, body: row.body, mediaUrl: row.media_url, mediaType: row.media_type, manipulationTechniques: row.manipulation_techniques ?? [], targetCompetencies: row.target_competencies ?? [], difficulty: row.difficulty, ageRating: row.age_rating, sourceRefs: row.source_refs ?? [], status: row.status, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, reviewNotes: row.review_notes, extra: { ...(row.extra ?? {}), interestKeys: addInterestAncestors(row.extra?.interestKeys), classLikeCount: likeCounts.get(row.id) ?? 0, classLikeUsers: socialByContent.get(row.id) ?? [], classCommentCount: commentCounts.get(row.id) ?? 0 }, createdAt: row.created_at, updatedAt: row.updated_at, creator: mapCreatorRow(row.creators ?? creatorById.get(row.creator_id)) }));
  const ageRating: FeedContext["userAgeRating"] = currentProfile?.birth_year && new Date().getFullYear() - currentProfile.birth_year >= 16 ? "16_plus" : "12_plus";
  const progress = (competencyProgress ?? []).map((c) => ({ userId: c.user_id, competencyId: c.competency_id, evidence: c.evidence, level: c.level, updatedAt: c.updated_at }));
  const recentTechniques = mappedPool.filter((item) => recentlySeenContentIds.includes(item.id)).flatMap((item) => item.manipulationTechniques).slice(0, 12);
  const densityRank: Record<string, number> = { off: 0, low: 1, medium: 2, high: 3 };
  const ambientDensity = scenarioIntros.reduce((highest, scenario) =>
    (densityRank[scenario.ambient_density ?? "medium"] ?? 2) > (densityRank[highest] ?? 2)
      ? (scenario.ambient_density ?? "medium")
      : highest, "off");
  const ambientSignalRatios: Record<string, number> = { off: 1, low: 0.9, medium: 0.7, high: 0.5 };
  const ctx: FeedContext = { userAgeRating: ageRating, competencyProgress: progress, recentlySeenContentIds, recentTechniques, assignedScenarioIds, signalRatio: ambientSignalRatios[ambientDensity] ?? computeAdaptiveSignalRatio(progress), interestKeys: selectedInterestKeys };
  // Collect the currently active learning step from every assigned scenario.
  // Each scenario keeps its own step order; only the resulting active posts are mixed.
  const scenarioLearningItems: FeedItem[] = [];
  if (scenarioIntros.length > 0) {
    const livePostIds = new Set(mappedPool.map((item) => item.id));
    const { data: designs } = await supabase
      .from("learning_designs")
      .select("id, scenario_id, version")
      .in("scenario_id", assignedScenarioIds)
      .order("version", { ascending: false });

    const latestDesignByScenario = new Map<string, string>();
    for (const design of designs ?? []) {
      if (!latestDesignByScenario.has(design.scenario_id)) latestDesignByScenario.set(design.scenario_id, design.id);
    }

    const designIds = Array.from(latestDesignByScenario.values());
    const { data: allSteps } = designIds.length
      ? await supabase.from("learning_steps").select("id, learning_design_id, step_index").in("learning_design_id", designIds).order("step_index", { ascending: true })
      : { data: [] as { id: string; learning_design_id: string; step_index: number }[] };
    const stepIds = (allSteps ?? []).map((step) => step.id);
    const { data: allLinks } = stepIds.length
      ? await supabase.from("learning_step_content").select("learning_step_id, content_item_id, order_index, required").in("learning_step_id", stepIds)
      : { data: [] as { learning_step_id: string; content_item_id: string; order_index: number; required: boolean }[] };
    const usableLinks = (allLinks ?? []).filter((link) => livePostIds.has(link.content_item_id));
    const linkedContentIds = Array.from(new Set(usableLinks.map((link) => link.content_item_id)));
    const { data: viewedRows } = linkedContentIds.length
      ? await supabase.from("user_interactions").select("content_item_id").eq("user_id", user.id).eq("class_instance_id", classInstanceId).eq("interaction_type", "view").in("content_item_id", linkedContentIds)
      : { data: [] as { content_item_id: string }[] };
    const viewedIds = new Set((viewedRows ?? []).map((row) => row.content_item_id));

    latestDesignByScenario.forEach((designId) => {
      const scenarioSteps = (allSteps ?? []).filter((step) => step.learning_design_id === designId);
      const stepsWithLiveContent = scenarioSteps.map((step) => {
        const stepLinks = usableLinks.filter((link) => link.learning_step_id === step.id).sort((a, b) => a.order_index - b.order_index);
        const requiredIds = stepLinks.filter((link) => link.required).map((link) => link.content_item_id);
        const progressIds = requiredIds.length ? requiredIds : stepLinks.map((link) => link.content_item_id);
        return { step, stepLinks, progressIds, done: progressIds.length > 0 && progressIds.every((id) => viewedIds.has(id)) };
      }).filter((entry) => entry.stepLinks.length > 0);
      const active = stepsWithLiveContent.find((entry) => !entry.done);
      if (!active) return;
      const order = new Map(active.stepLinks.map((link) => [link.content_item_id, link.order_index]));
      scenarioLearningItems.push(...mappedPool
        .filter((item) => active.stepLinks.some((link) => link.content_item_id === item.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
    });
  }

  // Density controls both the mix and the amount of content a learner is expected to read.
  // A higher density produces a longer session, not just a different ratio.
  const densityAwarePool = ambientDensity === "off"
    ? mappedPool.filter((item) => item.scenarioId !== null)
    : mappedPool;
  const feedItemTargets: Record<string, number> = { off: 12, low: 16, medium: 20, high: 28 };
  const personalizedAmbientLimits: Record<string, number> = { off: 0, low: 1, medium: 3, high: 6 };
  const initialBatchSize = feedItemTargets[ambientDensity] ?? 20;
  const ambientPool = densityAwarePool.filter((item) => item.scenarioId === null);
  const scenarioPool = (scenarioLearningItems.length > 0
    ? scenarioLearningItems
    : densityAwarePool.filter((item) => item.scenarioId !== null))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
  // Prepare the complete eligible feed once; the client reveals it in small batches.
  // Ambient content stays at >= 2/3 whenever enough ambient posts are available.
  const availableScenarioCount = scenarioPool.length;
  const availableAmbientCount = ambientDensity === "off" ? 0 : ambientPool.length;
  const totalFeedItems = availableScenarioCount + availableAmbientCount;
  const ambientTarget = ambientDensity === "off"
    ? 0
    : Math.min(availableAmbientCount, Math.max(Math.ceil(totalFeedItems * (2 / 3)), Math.min(initialBatchSize, availableAmbientCount)));
  const scenarioTarget = Math.min(availableScenarioCount, Math.max(0, totalFeedItems - ambientTarget));
  const ambientItems = selectNextFeedItems(ambientPool, ctx, ambientTarget) as FeedItem[];
  const scenarioItems = scenarioPool.slice(0, scenarioTarget);
  // Stable pseudo-random merge. The order inside each scenario's active step
  // is preserved, while ambient and scenario queues form natural-looking clusters.
  let mixSeed = Array.from(user.id + classInstanceId + assignedScenarioIds.join("")).reduce((seed, char) => Math.imul(seed ^ char.charCodeAt(0), 16777619), 2166136261);
  const seededRandom = () => {
    mixSeed += 0x6D2B79F5;
    let value = mixSeed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const scenarioQueues = new Map<string, FeedItem[]>();
  for (const item of scenarioItems) {
    const key = item.scenarioId ?? "unassigned";
    scenarioQueues.set(key, [...(scenarioQueues.get(key) ?? []), item]);
  }
  const activeScenarioQueues = Array.from(scenarioQueues.values());
  const ambientQueue = [...ambientItems];
  const baseItems: FeedItem[] = [];
  while (baseItems.length < totalFeedItems && (ambientQueue.length > 0 || activeScenarioQueues.some((queue) => queue.length > 0))) {
    const remainingScenario = activeScenarioQueues.reduce((sum, queue) => sum + queue.length, 0);
    const remaining = ambientQueue.length + remainingScenario;
    const ambientShare = remainingScenario === 0 ? 1 : ambientQueue.length === 0 ? 0 : ambientQueue.length / remaining;
    const chooseAmbient = ambientQueue.length > 0 && (remainingScenario === 0 || (seededRandom() < Math.max(2 / 3, ambientShare)));
    if (chooseAmbient) {
      baseItems.push(ambientQueue.shift()!);
      continue;
    }
    const availableQueues = activeScenarioQueues.filter((queue) => queue.length > 0);
    if (!availableQueues.length) {
      if (ambientQueue.length) baseItems.push(ambientQueue.shift()!);
      break;
    }
    const chosenQueue = availableQueues[Math.floor(seededRandom() * availableQueues.length)];
    baseItems.push(chosenQueue.shift()!);
  }

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
        .filter((item) => !baseItems.some((baseItem) => baseItem.id === item.id))
        .slice(0, personalizedAmbientLimits[ambientDensity] ?? 3)
    : [];

  const items = [...baseItems, ...personalizedAmbientItems];
  const likedContentIds = new Set((recentInteractions ?? []).filter((i) => i.interaction_type === "like").map((i) => i.content_item_id));

  return <FeedClient scenarioSummaries={scenarioIntros.map((scenario) => ({ id: scenario.id, title: scenario.title, description: scenario.description }))} initialItems={items} userId={user.id} classInstanceId={classInstanceId} likedContentIds={likedContentIds} scenarioIntro={scenarioIntro ? { ...scenarioIntro, title: scenarioIntroTitle ?? scenarioIntro.title, description: scenarioIntroDescription } : null} scenarioIds={assignedScenarioIds} scenarioMissionCount={scenarioMissionIds.length} completedScenarioMissionCount={new Set((completedScenarioMissions ?? []).map((mission) => mission.mission_id)).size} profile={{ displayName: currentProfile?.display_name ?? "DR1FT User", username: currentProfile?.username ?? "user", avatarSeed: currentProfile?.avatar_seed ?? user.id }} />;
}
