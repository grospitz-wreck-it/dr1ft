// apps/admin/app/scenarios/[scenarioId]/page.tsx

import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createContentItem, toggleScenarioActive } from "../actions";
import { ContentStatusControl } from "./ContentStatusControl";

interface Props {
  params: { scenarioId: string };
}

const STATUS_ORDER = ["draft", "in_review", "approved", "live", "rejected", "archived"];

export default async function ScenarioDetailPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { scenarioId } = params;

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", scenarioId)
    .single();

  const { data: contentItems } = await supabase
    .from("content_items")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("created_at", { ascending: false });

  const { data: creators } = await supabase
    .from("creators")
    .select("id, display_name, creator_role")
    .or(`scenario_id.eq.${scenarioId},scenario_id.is.null`);

  const { data: competencies } = await supabase.from("competencies").select("id, title");

  const { data: possibleParents } = await supabase
    .from("content_items")
    .select("id, body, scenario_id")
    .eq("type", "post")
    .or(`scenario_id.eq.${scenarioId},scenario_id.is.null`);

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (contentItems ?? []).filter((c) => c.status === status),
  }));

  return (
    <div className="px-6 py-5 max-w-3xl space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{scenario?.title}</h1>
          <p className="text-sm text-slate-500">{scenario?.description}</p>
        </div>
        <form>
          <button
            formAction={async () => {
              "use server";
              await toggleScenarioActive(scenarioId, !scenario?.is_active);
            }}
            className="text-sm border border-border rounded-md px-3 py-2 hover:bg-canvas"
          >
            {scenario?.is_active ? "Deaktivieren" : "Aktivieren"}
          </button>
        </form>
      </div>

      {grouped.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.status}>
              <h2 className="text-sm font-medium text-slate-500 mb-2 capitalize">
                {group.status} ({group.items.length})
              </h2>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.id} className="bg-panel border border-border rounded-lg p-3 space-y-2">
                    <p className="text-sm text-slate-900">{item.body}</p>
                    <p className="text-xs2 text-slate-400">
                      {item.type} · Techniken: {(item.manipulation_techniques ?? []).join(", ") || "—"} ·
                      Schwierigkeit {item.difficulty} · {item.age_rating}
                    </p>
                    <ContentStatusControl contentItemId={item.id} status={item.status} />
                  </li>
                ))}
              </ul>
            </section>
          )
      )}

      <section className="bg-panel border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Neues Content-Item</h2>
        <form action={createContentItem.bind(null, scenarioId)} encType="multipart/form-data" className="space-y-3">
          <select name="type" className="border border-border rounded-md px-3 py-2 w-full text-sm">
            <option value="post">Post</option>
            <option value="comment">Kommentar</option>
            <option value="dm_message">DM-Nachricht</option>
            <option value="reflection_prompt">Reflexions-Prompt</option>
          </select>

          <textarea
            name="body"
            placeholder="Inhalt"
            required
            className="border border-border rounded-md px-3 py-2 w-full text-sm"
          />

          <div>
            <label className="text-xs2 text-slate-500 block mb-1">
              Bild/Video (optional)
            </label>
            <input
              name="media"
              type="file"
              accept="image/*,video/*"
              className="border border-border rounded-md px-3 py-2 w-full text-sm"
            />
          </div>

          <select name="creatorId" className="border border-border rounded-md px-3 py-2 w-full text-sm">
            <option value="">Kein Creator (z.B. Reflexions-Prompt)</option>
            {creators?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name} {c.creator_role ? `(${c.creator_role})` : ""}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs2 text-slate-500 border border-border rounded-md px-3 py-2">
            <input type="checkbox" name="isAmbient" />
            Ambient-Content (kein Szenario-Bezug — landet im globalen
            Füllmaterial-Pool, in jedem Feed wiederverwendbar. Darf keine
            Manipulationstechniken tragen.)
          </label>

          <select name="parentContentId" className="border border-border rounded-md px-3 py-2 w-full text-sm">
            <option value="">Kein Bezug (eigenständiger Post)</option>
            {possibleParents?.map((p) => (
              <option key={p.id} value={p.id}>
                Kommentar zu: {p.body.slice(0, 50)}…
              </option>
            ))}
          </select>
          <p className="text-xs2 text-slate-400 -mt-2">
            Nur relevant bei Typ "Kommentar" — ordnet ihn einem Post zu,
            unter dem er im Feed aufklappbar erscheint.
          </p>

          <div className="flex gap-3">
            <input
              name="baseEngagement"
              type="number"
              min={0}
              placeholder="Basis-Likes (z.B. 47)"
              className="border border-border rounded-md px-3 py-2 text-sm flex-1"
            />
            <input
              name="baseCommentCount"
              type="number"
              min={0}
              placeholder="Basis-Kommentaranzahl"
              className="border border-border rounded-md px-3 py-2 text-sm flex-1"
            />
          </div>
          <p className="text-xs2 text-slate-400 -mt-2">
            Sorgt dafür, dass Posts nicht mit 0 Likes/Kommentaren wirken,
            als hätte sie noch nie jemand gesehen — rein kosmetisch,
            beeinflusst keine Engine-Logik.
          </p>

          <input
            name="manipulationTechniques"
            placeholder="Manipulationstechniken, kommagetrennt (z.B. false_authority, urgency)"
            className="border border-border rounded-md px-3 py-2 w-full text-sm"
          />

          <div className="text-sm">
            <p className="mb-1 text-slate-500 text-xs2">Ziel-Kompetenzen:</p>
            {competencies?.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs mb-1">
                <input type="checkbox" name="targetCompetencies" value={c.id} />
                {c.title}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <select name="difficulty" className="border border-border rounded-md px-3 py-2 text-sm">
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  Schwierigkeit {d}
                </option>
              ))}
            </select>
            <select name="ageRating" className="border border-border rounded-md px-3 py-2 text-sm">
              <option value="all_ages">Alle Altersgruppen</option>
              <option value="12_plus">12+</option>
              <option value="16_plus">16+</option>
            </select>
          </div>

          <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">
            Als Entwurf anlegen
          </button>
        </form>
      </section>
    </div>
  );
}
