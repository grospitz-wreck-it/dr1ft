// apps/admin/app/ambient-content/page.tsx

import { Sparkles } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { generateAmbientDrafts } from "./actions";
import { ContentStatusControl } from "../scenarios/[scenarioId]/ContentStatusControl";

const STATUS_ORDER = ["draft", "in_review", "approved", "live", "rejected", "archived"];

export default async function AmbientContentPage() {
  const supabase = supabaseServerClient();

  const { data: ambientCreators } = await supabase
    .from("creators")
    .select("id, display_name")
    .eq("creator_role", "ambient");

  const { data: items } = await supabase
    .from("content_items")
    .select("*")
    .is("scenario_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (items ?? []).filter((c) => c.status === status),
  }));

  return (
    <div className="px-6 py-5 max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-slate-400" /> Ambient-Content-Generator
        </h1>
        <p className="text-sm text-slate-500">
          KI-generierte Entwürfe landen immer als "draft" — nichts geht ohne
          redaktionelle Prüfung live.
        </p>
      </div>

      <form action={generateAmbientDrafts} className="bg-panel border border-border rounded-lg p-4 space-y-3">
        <input
          name="theme"
          placeholder="Thema (z.B. Musik, Schule, Serien, Wetter)"
          required
          className="border border-border rounded-md px-3 py-2 w-full text-sm"
        />
        <select name="creatorId" className="border border-border rounded-md px-3 py-2 w-full text-sm">
          <option value="">Kein bestimmter Creator</option>
          {ambientCreators?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
        <select name="count" className="border border-border rounded-md px-3 py-2 w-full text-sm">
          {[3, 5, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n} Posts generieren
            </option>
          ))}
        </select>
        <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">
          Generieren
        </button>
      </form>

      {grouped.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.status}>
              <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">
                {group.status} ({group.items.length})
              </h2>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.id} className="bg-panel border border-border rounded-lg p-3 space-y-2">
                    <p className="text-sm text-slate-900">{item.body}</p>
                    {item.extra?.generatedBy === "ai" && (
                      <p className="text-xs2 text-slate-400">
                        KI-generiert · Thema: {item.extra?.theme}
                      </p>
                    )}
                    <ContentStatusControl contentItemId={item.id} status={item.status} />
                  </li>
                ))}
              </ul>
            </section>
          )
      )}
    </div>
  );
}
