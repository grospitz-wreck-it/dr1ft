// apps/admin/app/group-chats/page.tsx
// Fehlte bisher komplett — Gruppenchats waren nur über eine direkte
// /group-chats/[scenarioId]-URL erreichbar, ohne Einstiegspunkt.

import { MessageSquare } from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function GroupChatsScenarioPickerPage() {
  const supabase = supabaseServerClient();
  const { data: scenarios } = await supabase.from("scenarios").select("*").order("title");

  return (
    <div className="px-6 py-5 max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-slate-400" /> Gruppenchats
      </h1>
      <p className="text-sm text-slate-500 mb-4">Szenario auswählen:</p>
      <ul className="space-y-2">
        {scenarios?.map((s) => (
          <li key={s.id} className="bg-panel border border-border rounded-lg px-4 py-3">
            <a href={`/group-chats/${s.id}`} className="text-sm text-accent hover:text-accent-hover">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
