// apps/admin/app/npc-dialogs/page.tsx

import { MessagesSquare } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

export default async function NpcDialogsOverviewPage() {
  const supabase = supabaseServerClient();

  const { data: creators } = await supabase
    .from("creators")
    .select("id, display_name, handle, scenario_id, scenarios(title)")
    .eq("kind", "npc");

  const { data: messageCounts } = await supabase
    .from("content_items")
    .select("creator_id")
    .in("type", ["dm_message", "comment"]);

  const countByCreator = new Map<string, number>();
  (messageCounts ?? []).forEach((m) => {
    if (!m.creator_id) return;
    countByCreator.set(m.creator_id, (countByCreator.get(m.creator_id) ?? 0) + 1);
  });

  return (
    <div className="px-6 py-5 max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
        <MessagesSquare className="w-4 h-4 text-slate-400" /> NPC-Dialoge
      </h1>
      <ul className="space-y-2">
        {creators?.map((c: any) => (
          <li key={c.id} className="bg-panel border border-border rounded-lg px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-900">{c.display_name} <span className="text-slate-400 font-normal">{c.handle}</span></p>
              <p className="text-xs2 text-slate-400">
                {c.scenarios?.title} · {countByCreator.get(c.id) ?? 0} Nachrichten
              </p>
            </div>
            <a href={`/npc-dialogs/${c.id}`} className="text-sm text-accent hover:text-accent-hover">
              Dialog bearbeiten →
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs2 text-slate-400 mt-6">
        Neue NPC-Creator anlegen ist aktuell noch nicht über eine UI möglich
        — direkt in der <code>creators</code>-Tabelle anlegen.
      </p>
    </div>
  );
}
