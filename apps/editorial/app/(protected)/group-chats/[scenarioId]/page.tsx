import { supabaseServerClient } from "../../../../lib/supabaseServerClient";
// apps/admin/app/group-chats/[scenarioId]/page.tsx

import { createGroupChat, toggleGroupChatLive, addGroupChatMessage } from "../actions";
import { ContentStatusControl } from "../../scenarios/[scenarioId]/ContentStatusControl";

interface Props {
  params: { scenarioId: string };
}

export default async function GroupChatsPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { scenarioId } = params;

  const { data: scenario } = await supabase.from("scenarios").select("title").eq("id", scenarioId).single();
  const { data: creators } = await supabase
    .from("creators")
    .select("id, display_name")
    .or(`scenario_id.eq.${scenarioId},scenario_id.is.null`);
  const { data: chats } = await supabase
    .from("group_chats")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("created_at");

  const chatIds = (chats ?? []).map((c) => c.id);
  const { data: allMessages } = chatIds.length
    ? await supabase
        .from("content_items")
        .select("*")
        .in("group_chat_id", chatIds)
        .order("sequence_index")
    : { data: [] };

  const creatorsById = new Map((creators ?? []).map((c) => [c.id, c.display_name]));

  return (
    <div className="px-6 py-5 max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">{scenario?.title} — Gruppenchats</h1>

      {chats?.map((chat) => {
        const messages = (allMessages ?? []).filter((m) => m.group_chat_id === chat.id);
        return (
          <div key={chat.id} className="bg-panel border border-border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm text-slate-900">{chat.title}</p>
              <form>
                <button
                  formAction={async () => {
                    "use server";
                    await toggleGroupChatLive(chat.id, scenarioId, chat.status !== "live");
                  }}
                  className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas"
                >
                  {chat.status === "live" ? "live" : "Entwurf → live"}
                </button>
              </form>
            </div>

            <ol className="space-y-2">
              {messages.map((m) => (
                <li key={m.id} className="text-sm border-l-2 border-border pl-3">
                  <p className="text-xs2 text-slate-400">
                    {creatorsById.get(m.creator_id) ?? "?"}{" "}
                    {m.extra?.reactionCount ? `· {m.extra.reactionCount} Reaktionen` : ""}
                  </p>
                  <p>{m.body}</p>
                  <ContentStatusControl contentItemId={m.id} status={m.status} />
                </li>
              ))}
            </ol>

            <form
              action={addGroupChatMessage.bind(null, chat.id, scenarioId)}
              className="flex flex-wrap gap-2 items-start border-t border-border pt-3"
            >
              <select name="creatorId" required className="border border-border rounded-md px-2 py-1 text-xs">
                <option value="">Absender…</option>
                {chat.participant_creator_ids.map((id: string) => (
                  <option key={id} value={id}>
                    {creatorsById.get(id) ?? id}
                  </option>
                ))}
              </select>
              <input
                name="body"
                placeholder="Nachricht"
                required
                className="border border-border rounded-md px-2 py-1 text-xs flex-1 min-w-[160px]"
              />
              <input
                name="reactionCount"
                type="number"
                min={0}
                placeholder="Reaktionen (Anzahl)"
                className="border border-border rounded-md px-2 py-1 text-xs w-28"
              />
              <button type="submit" className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded-md">
                Hinzufügen
              </button>
            </form>
          </div>
        );
      })}

      <form action={createGroupChat.bind(null, scenarioId)} className="bg-panel border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Neuer Gruppenchat</h2>
        <input name="title" placeholder="Titel (z.B. 9b Chat)" required className="border border-border rounded-md px-3 py-2 w-full text-sm" />
        <div className="text-sm">
          <p className="mb-1 text-slate-500 text-xs2">Teilnehmer:innen:</p>
          {creators?.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-xs mb-1">
              <input type="checkbox" name="participants" value={c.id} />
              {c.display_name}
            </label>
          ))}
        </div>
        <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">
          Anlegen
        </button>
      </form>
    </div>
  );
}
