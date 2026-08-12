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

  const { data: chat } = await supabase
    .from("group_chats")
    .select("title")
    .eq("id", groupChatId)
    .single();

  const { data: messages } = await supabase
    .from("content_items")
    .select("*, creators(id, display_name, handle, avatar_url)")
    .eq("group_chat_id", groupChatId)
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

  if (!user) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-ash text-sm">Bitte einloggen.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3">
        <a href="/messages" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash mb-1">
          <ChevronLeft className="w-4 h-4" /> Nachrichten
        </a>
        <p className="font-display text-paper text-sm">{chat?.title}</p>
      </header>

      <div className="max-w-md mx-auto px-3 py-4">
        <GroupChatView messages={mapped} userId={user.id} />
      </div>
    </main>
  );
}
