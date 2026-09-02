// apps/player/app/group-chat/[groupChatId]/page.tsx

import { ChevronLeft } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { mapCreatorRow, type FeedItem } from "../../../lib/types";
import { GroupChatView } from "./GroupChatView";

interface Props {
  params: { groupChatId: string };
}

export default async function GroupChatPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { groupChatId } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-ash text-sm">Bitte einloggen.</p>
      </main>
    );
  }

  const { data: classInstanceId } = await supabase.rpc("get_current_class_instance_id");
  if (!classInstanceId) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-ash text-sm">Du bist aktuell keiner DR1FT-Klasse zugeordnet.</p>
      </main>
    );
  }

  // Resolve the active instance's assigned scenarios first. The group chat
  // itself remains global/scenario content; access is instance-scoped here
  // and additionally enforced by RLS.
  const { data: assignments } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classInstanceId);
  const scenarioIds = [...new Set((assignments ?? []).map((a) => a.scenario_id))];

  const { data: chat } = await supabase
    .from("group_chats")
    .select("id, title, scenario_id")
    .eq("id", groupChatId)
    .in("scenario_id", scenarioIds.length ? scenarioIds : ["00000000-0000-0000-0000-000000000000"])
    .single();

  if (!chat) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center px-4">
        <p className="text-ash text-sm text-center">Dieser Gruppenchat ist für deine Klasse nicht freigeschaltet.</p>
      </main>
    );
  }

  const { data: messages } = await supabase
    .from("content_items")
    .select("*, creators(id, display_name, handle, avatar_url)")
    .eq("group_chat_id", groupChatId)
    .eq("scenario_id", chat.scenario_id)
    .eq("status", "live")
    .order("sequence_index", { ascending: true });

  const mapped: FeedItem[] = (messages ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    scenarioId: row.scenario_id,
    creatorId: row.creator_id,
    parentId: row.parent_id,
    body: row.body,
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

  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3">
        <a href="/messages" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash mb-1">
          <ChevronLeft className="w-4 h-4" /> Nachrichten
        </a>
        <p className="font-display text-paper text-sm">{chat.title}</p>
      </header>

      <div className="max-w-md mx-auto px-3 py-4">
        <GroupChatView
          messages={mapped}
          userId={user.id}
          classInstanceId={classInstanceId}
        />
      </div>
    </main>
  );
}
