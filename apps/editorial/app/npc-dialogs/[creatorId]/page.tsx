// apps/admin/app/npc-dialogs/[creatorId]/page.tsx

import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createNpcMessage } from "../actions";
import { ReplyOptionsEditor } from "./ReplyOptionsEditor";
import { ConsequenceEditor } from "./ConsequenceEditor";
import { ContentStatusControl } from "../../scenarios/[scenarioId]/ContentStatusControl";

interface Props {
  params: { creatorId: string };
}

function bodyPreview(body: string, max = 40): string {
  return body.length > max ? body.slice(0, max) + "…" : body;
}

export default async function NpcDialogTreePage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { creatorId } = params;

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("id", creatorId)
    .single();

  const { data: messages } = await supabase
    .from("content_items")
    .select("*")
    .eq("creator_id", creatorId)
    .in("type", ["dm_message", "comment"])
    .order("created_at", { ascending: true });

  const allMessages = messages ?? [];
  const byId = new Map(allMessages.map((m) => [m.id, m]));

  // Wurzeln = Nachrichten, auf die keine andere Nachricht per replyOptions verweist
  const referenced = new Set<string>();
  allMessages.forEach((m) => {
    (m.extra?.replyOptions ?? []).forEach((opt: any) => referenced.add(opt.nextContentItemId));
  });
  const roots = allMessages.filter((m) => !referenced.has(m.id));

  function renderNode(msg: any, depth: number, visited: Set<string>) {
    if (visited.has(msg.id)) {
      return (
        <div key={msg.id + "-cycle"} className="text-xs text-status-rejected pl-4">
          ⚠️ Zyklus erkannt — verweist zurück auf bereits gezeigte Nachricht
        </div>
      );
    }
    const nextVisited = new Set(visited).add(msg.id);
    const options: any[] = msg.extra?.replyOptions ?? [];

    return (
      <div key={msg.id} style={{ marginLeft: depth * 16 }} className="mt-3">
        <div className="border border-border rounded-lg p-3 bg-panel">
          <p className="text-sm">{msg.body}</p>
          <div className="mt-2">
            <ContentStatusControl contentItemId={msg.id} status={msg.status} />
          </div>
          <ReplyOptionsEditor
            messageId={msg.id}
            creatorId={creatorId}
            initialOptions={options}
            availableMessages={allMessages
              .filter((m) => m.id !== msg.id)
              .map((m) => ({ id: m.id, bodyPreview: bodyPreview(m.body) }))}
          />
          {options.length === 0 && (
            <ConsequenceEditor
              messageId={msg.id}
              creatorId={creatorId}
              initialConsequence={msg.extra?.consequence ?? null}
              availableMessages={allMessages
                .filter((m) => m.id !== msg.id)
                .map((m) => ({ id: m.id, bodyPreview: bodyPreview(m.body) }))}
            />
          )}
        </div>
        {options
          .map((opt) => byId.get(opt.nextContentItemId))
          .filter(Boolean)
          .map((child) => renderNode(child, depth + 1, nextVisited))}
      </div>
    );
  }

  return (
    <div className="px-6 py-5 max-w-3xl">
      <h1 className="text-lg font-semibold text-slate-900 mb-1">{creator?.display_name}</h1>
      <p className="text-sm text-slate-500 mb-6">{creator?.handle} · Dialogbaum</p>

      {roots.length === 0 && (
        <p className="text-sm text-slate-500 mb-6">Noch keine Nachrichten angelegt.</p>
      )}

      {roots.map((root) => renderNode(root, 0, new Set()))}

      <section className="bg-panel border border-border rounded-lg p-4 mt-8 space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Neue Nachricht anlegen</h2>
        <form action={createNpcMessage.bind(null, creator?.scenario_id, creatorId)} className="space-y-2">
          <textarea
            name="body"
            required
            placeholder="Nachrichtentext"
            className="border border-border rounded-md px-3 py-2 w-full text-sm"
          />
          <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-xs px-3 py-2 rounded-md">
            Anlegen
          </button>
          <p className="text-xs2 text-slate-400">
            Wird zunächst unverknüpft angelegt. Danach bei der gewünschten
            Elternnachricht als Antwortoption verlinken.
          </p>
        </form>
      </section>
    </div>
  );
}
