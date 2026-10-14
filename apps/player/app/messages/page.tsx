// apps/player/app/messages/page.tsx
// Bisher fehlender Einstiegspunkt: NPC-Dialoge existierten als Engine,
// waren aber im Feed nirgends erreichbar. Diese Seite listet alle
// ansprechbaren NPCs + aktive Gruppenchats der freigeschalteten Szenarien.

import MessagesWorkspace from "./MessagesWorkspace";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function MessagesInboxPage() {
  const supabase = supabaseServerClient();

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
        <p className="text-ash text-sm">Keine aktive Klasseninstanz.</p>
      </main>
    );
  }

  const { data: receivedShares } = await supabase
    .from("user_interactions")
    .select("id, user_id, content_item_id, created_at, metadata")
    .eq("class_instance_id", classInstanceId)
    .eq("interaction_type", "share")
    .filter("metadata->>recipient_user_id", "eq", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const sharedContentIds = Array.from(new Set((receivedShares ?? []).map((share) => share.content_item_id)));
  const sharedSenderIds = Array.from(new Set((receivedShares ?? []).map((share) => share.user_id)));
  const [{ data: sharedPosts }, { data: sharedSenders }] = await Promise.all([
    sharedContentIds.length
      ? supabase.from("content_items").select("id, body, title, media_url, media_type").in("id", sharedContentIds)
      : Promise.resolve({ data: [] as { id: string; body: string | null; title: string | null; media_url: string | null; media_type: string | null }[] }),
    sharedSenderIds.length
      ? supabase.from("user_profiles").select("id, display_name, username, avatar_seed").in("id", sharedSenderIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null; username: string | null; avatar_seed: string | null }[] }),
  ]);
  const sharedPostById = new Map((sharedPosts ?? []).map((post) => [post.id, post]));
  const sharedSenderById = new Map((sharedSenders ?? []).map((sender) => [sender.id, sender]));

  const { data: assignments } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classInstanceId);
  const scenarioIds = Array.from(new Set((assignments ?? []).map((a) => a.scenario_id)));

  const { data: npcCreators } = await supabase
    .from("creators")
    .select("id, display_name, handle")
    .eq("kind", "npc")
    .in("scenario_id", scenarioIds.length ? scenarioIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: groupChats } = await supabase
    .from("group_chats")
    .select("id, title")
    .eq("status", "live")
    .in("scenario_id", scenarioIds.length ? scenarioIds : ["00000000-0000-0000-0000-000000000000"]);

  // Anstehende/fällige Konsequenzen für ein "neu"-Signal
  const { data: pending } = await supabase
    .from("user_npc_conversations")
    .select("creator_id, pending_resume_at")
    .eq("user_id", user.id)
    .eq("class_instance_id", classInstanceId);
  const pendingByCreator = new Map(
    (pending ?? []).map((p) => [p.creator_id, p.pending_resume_at])
  );

  const contacts = (npcCreators ?? []).map((creator) => {
    const resumeAt = pendingByCreator.get(creator.id);
    return {
      id: creator.id,
      display_name: creator.display_name,
      handle: creator.handle,
      isDue: Boolean(resumeAt && new Date(resumeAt) <= new Date()),
    };
  });

  const { data: deliveries } = await supabase
    .from("scenario_message_deliveries")
    .select("id, content_item_id, delivered_at")
    .eq("class_instance_id", classInstanceId)
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: false })
    .limit(50);
  const deliveryIds = (deliveries ?? []).map((delivery) => delivery.id);
  const scenarioContentIds = Array.from(new Set((deliveries ?? []).map((delivery) => delivery.content_item_id)));
  const { data: scenarioReads } = deliveryIds.length
    ? await supabase.from("scenario_message_reads").select("delivery_id").eq("user_id", user.id).in("delivery_id", deliveryIds)
    : { data: [] as { delivery_id: string }[] };
  const { data: scenarioContent } = scenarioContentIds.length
    ? await supabase.from("content_items").select("id, title, body, creator_id").in("id", scenarioContentIds)
    : { data: [] as { id: string; title: string | null; body: string | null; creator_id: string | null }[] };
  const scenarioCreatorIds = Array.from(new Set((scenarioContent ?? []).map((item) => item.creator_id).filter(Boolean))) as string[];
  const { data: scenarioCreators } = scenarioCreatorIds.length
    ? await supabase.from("creators").select("id, display_name").in("id", scenarioCreatorIds)
    : { data: [] as { id: string; display_name: string }[] };
  const scenarioContentById = new Map((scenarioContent ?? []).map((item) => [item.id, item]));
  const scenarioCreatorById = new Map((scenarioCreators ?? []).map((creator) => [creator.id, creator]));
  const readDeliveryIds = new Set((scenarioReads ?? []).map((read) => read.delivery_id));
  const scenarioMessages = (deliveries ?? []).flatMap((delivery) => {
    const item = scenarioContentById.get(delivery.content_item_id);
    if (!item) return [];
    const creator = item.creator_id ? scenarioCreatorById.get(item.creator_id) : null;
    return [{ id: delivery.id, senderName: creator?.display_name || "DR1FT Szenario", title: item.title || "Neue Nachricht", preview: item.body || "Öffne die Nachricht, um sie zu lesen.", deliveredAt: delivery.delivered_at || "", isRead: readDeliveryIds.has(delivery.id) }];
  });
  const shares = (receivedShares ?? []).flatMap((share) => {
    const post = sharedPostById.get(share.content_item_id);
    if (!post) return [];
    const sender = sharedSenderById.get(share.user_id);
    return [{
      id: share.id,
      created_at: share.created_at,
      senderName: sender?.display_name || sender?.username || "Ein Klassenkamerad",
      senderSeed: sender?.avatar_seed ?? null,
      text: post.body || post.title || "Geteilter Beitrag",
      mediaUrl: post.media_url && post.media_type === "image" ? post.media_url : null,
      postId: post.id,
    }];
  });

  return <MessagesWorkspace contacts={contacts} groupChats={groupChats ?? []} shares={shares} scenarioMessages={scenarioMessages} />;
}
