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
    ? await supabase.from("scenarios").select("id, title, description").in("id", assignedScenarioIds).order("created_at", { ascending: true })
    : { data: [] as { id: string; title: string; description: string | null }[] };
  const scenarioIntro = assignedScenarios?.[0] ?? null;
  const { data: scenarioMissions } = scenarioIntro
    ? await supabase.from("missions").select("id").eq("scenario_id", scenarioIntro.id).eq("status", "live")
    : { data: [] as { id: string }[] };
  const scenarioMissionIds = (scenarioMissions ?? []).map((mission) => mission.id);
  const { data: completedScenarioMissions } = scenarioMissionIds.length
    ? await supabase.from("user_mission_progress").select("mission_id").eq("user_id", user.id).eq("class_instance_id", classInstanceId).eq("status", "completed").in("mission_id", scenarioMissionIds)
    : { data: [] as { mission_id: string }[] };
  const { data: competencyProgress } = await supabase.from("user_competency_progress").select("*").eq("user_id", user.id).eq("class_instance_id", classInstanceId);
  const { data: allCompetencies } = await supabase.from("competencies").select("id, title");
  const progressByCompetency = new Map((competencyProgress ?? []).map((c) => [c.competency_id, c.level]));
  const competencyDisplay = (allCompetencies ?? []).map((c) => ({ id: c.id, title: c.title, level: progressByCompetency.get(c.id) ?? 1 }));
  const { data: currentProfile } = await supabase.from("user_profiles").select("display_name, username, avatar_seed, birth_year").eq("id", user.id).maybeSingle();
  const { data: recentInteractions } = await supabase.from("user_interactions").select("content_item_id, interaction_type").eq("user_id", user.id).eq("class_instance_id", classInstanceId).order("created_at", { ascending: false }).limit(200);
  const recentlySeenContentIds = (recentInteractions ?? []).filter((i) => i.interaction_type === "view").map((i) => i.content_item_id);
  const scenarioFilter = assignedScenarioIds.length > 0 ? `scenario_id.in.(${assignedScenarioIds.join(",")}),scenario_id.is.null` : "scenario_id.is.null";
  const { data: pool } = await supabase.from("content_items").select("*, creators(id, display_name, handle, avatar_url)").eq("status", "live").eq("type", "post").or(scenarioFilter).or(`class_instance_id.eq.${classInstanceId},class_instance_id.is.null`);
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
  const mappedPool: FeedItem[] = (pool ?? []).map((row: any) => ({ id: row.id, type: row.type, scenarioId: row.scenario_id, creatorId: row.creator_id, parentId: row.parent_id, title: row.title, body: row.body, mediaUrl: row.media_url, mediaType: row.media_type, manipulationTechniques: row.manipulation_techniques ?? [], targetCompetencies: row.target_competencies ?? [], difficulty: row.difficulty, ageRating: row.age_rating, sourceRefs: row.source_refs ?? [], status: row.status, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, reviewNotes: row.review_notes, extra: { ...(row.extra ?? {}), classLikeCount: likeCounts.get(row.id) ?? 0, classLikeUsers: socialByContent.get(row.id) ?? [], classCommentCount: commentCounts.get(row.id) ?? 0 }, createdAt: row.created_at, updatedAt: row.updated_at, creator: mapCreatorRow(row.creators) }));
  const ageRating: FeedContext["userAgeRating"] = currentProfile?.birth_year && new Date().getFullYear() - currentProfile.birth_year >= 16 ? "16_plus" : "12_plus";
  const progress = (competencyProgress ?? []).map((c) => ({ userId: c.user_id, competencyId: c.competency_id, evidence: c.evidence, level: c.level, updatedAt: c.updated_at }));
  const recentTechniques = mappedPool.filter((item) => recentlySeenContentIds.includes(item.id)).flatMap((item) => item.manipulationTechniques).slice(0, 12);
  const ctx: FeedContext = { userAgeRating: ageRating, competencyProgress: progress, recentlySeenContentIds, recentTechniques, assignedScenarioIds, signalRatio: computeAdaptiveSignalRatio(progress) };
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
        // All linked learning steps have been viewed. Do not silently replay
        // them through the generic feed; keep the end state explicit.
        learningSequenceItems = [];
      }
    }
  }

  const items = learningSequenceItems !== null
    ? learningSequenceItems
    : selectNextFeedItems(mappedPool, ctx, 20) as FeedItem[];
  const likedContentIds = new Set((recentInteractions ?? []).filter((i) => i.interaction_type === "like").map((i) => i.content_item_id));

}
