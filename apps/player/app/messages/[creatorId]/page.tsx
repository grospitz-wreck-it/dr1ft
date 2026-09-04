// apps/player/app/messages/[creatorId]/page.tsx

import { ChevronLeft } from "lucide-react";
import { getActiveNpcMessage } from "@dr1ft/engine-core";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { NpcDialog } from "../../../components/NpcDialog";

interface Props { params: { creatorId: string }; searchParams: { classInstanceId?: string } }

export default async function DmPage({ params, searchParams }: Props) {
  const supabase = supabaseServerClient();
  const { creatorId } = params;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Bitte einloggen.</p></main>;

  const { data: activeInstanceId } = await supabase.rpc("get_current_class_instance_id");
  const classInstanceId = activeInstanceId as string | null;
  if (!classInstanceId || (searchParams.classInstanceId && searchParams.classInstanceId !== classInstanceId)) {
    return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Ungültige Klasseninstanz.</p></main>;
  }

  const { data: assignment } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classInstanceId);
  const scenarioIds = [...new Set((assignment ?? []).map((a) => a.scenario_id))];

  const { data: creator } = await supabase
    .from("creators")
    .select("id, display_name, scenario_id")
    .eq("id", creatorId)
    .single();
  if (!creator || !scenarioIds.includes(creator.scenario_id)) return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Kein Gespräch verfügbar.</p></main>;

  const { data: messages } = await supabase
    .from("content_items")
    .select("id, extra")
    .eq("creator_id", creatorId)
    .eq("type", "dm_message")
    .is("group_chat_id", null)
    .eq("scenario_id", creator.scenario_id)
    .eq("status", "live")
    .order("created_at", { ascending: true });

  const referenced = new Set<string>();
  (messages ?? []).forEach((m: any) => (m.extra?.replyOptions ?? []).forEach((opt: any) => referenced.add(opt.nextContentItemId)));
  const rootMessage = (messages ?? []).find((m) => !referenced.has(m.id));
  if (!rootMessage) return <main className="min-h-screen bg-ink flex items-center justify-center"><p className="text-ash text-sm">Kein Gespräch verfügbar.</p></main>;

  const activeMessage = await getActiveNpcMessage(supabase, { userId: user.id, creatorId, rootMessageId: rootMessage.id, classInstanceId });
  return <main className="min-h-screen bg-ink"><header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3"><a href="/messages" className="touch-target inline-flex items-center gap-1 font-mono text-xs text-ash"><ChevronLeft className="w-4 h-4" /> Nachrichten</a></header><div className="max-w-md mx-auto px-3 py-4">{activeMessage ? <NpcDialog initialMessage={activeMessage} creatorId={creatorId} creatorName={creator.display_name} userId={user.id} classInstanceId={classInstanceId} /> : <p className="text-ash text-sm">Diese Nachricht ist nicht mehr verfügbar.</p>}</div></main>;
}
