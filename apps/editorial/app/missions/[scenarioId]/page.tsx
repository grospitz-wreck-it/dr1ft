// apps/admin/app/missions/[scenarioId]/page.tsx

import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import {
  createMission,
  toggleMissionLive,
  createArc,
  toggleArcLive,
  addArcStep,
  removeArcStep,
  swapArcSteps,
} from "./actions";

interface Props {
  params: { scenarioId: string };
}

const EVENT_LABELS: Record<string, string> = {
  PostViewed: "Post angesehen",
  CommentCreated: "Kommentar geschrieben",
  NpcReplySelected: "NPC-Antwort gewählt",
};

export default async function MissionsAndArcsPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { scenarioId } = params;

  const { data: scenario } = await supabase.from("scenarios").select("*").eq("id", scenarioId).single();
  const { data: missions } = await supabase
    .from("missions")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("created_at");
  const { data: competencies } = await supabase.from("competencies").select("id, title");
  const { data: reflectionPrompts } = await supabase
    .from("content_items")
    .select("id, body")
    .eq("scenario_id", scenarioId)
    .eq("type", "reflection_prompt");
  const { data: arcs } = await supabase
    .from("story_arcs")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("created_at");

  const missionsById = new Map((missions ?? []).map((m) => [m.id, m]));

  // Schritte für alle Arcs auf einmal laden
  const arcIds = (arcs ?? []).map((a) => a.id);
  const { data: allSteps } = arcIds.length
    ? await supabase
        .from("story_arc_steps")
        .select("*")
        .in("arc_id", arcIds)
        .order("order_index")
    : { data: [] };

  return (
    <div className="px-6 py-5 max-w-3xl space-y-8">
      <h1 className="text-lg font-semibold text-slate-900">{scenario?.title} — Missionen &amp; Arcs</h1>

      {/* ---------- MISSIONEN ---------- */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-3">Missionen</h2>
        <ul className="space-y-2 mb-6">
          {missions?.map((m) => (
            <li key={m.id} className="bg-panel border border-border rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-slate-900">{m.title}</p>
                  <p className="text-xs2 text-slate-400">
                    Trigger: {EVENT_LABELS[m.trigger_condition?.event] ?? m.trigger_condition?.event}{" "}
                    × {m.trigger_condition?.count ?? 1}
                    {m.trigger_condition?.technique_filter?.length
                      ? ` (nur: ${m.trigger_condition.technique_filter.join(", ")})`
                      : ""}
                  </p>
                </div>
                <form>
                  <button
                    formAction={async () => {
                      "use server";
                      await toggleMissionLive(m.id, scenarioId, m.status !== "live");
                    }}
                    className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas"
                  >
                    {m.status === "live" ? "live → deaktivieren" : "Entwurf → live schalten"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <form
          action={createMission.bind(null, scenarioId)}
          className="bg-panel border border-border rounded-lg p-4 space-y-3"
        >
          <h3 className="font-medium text-sm text-slate-900">Neue Mission</h3>
          <input name="title" placeholder="Titel" required className="border border-border rounded-md px-3 py-2 w-full text-sm" />
          <textarea name="description" placeholder="Beschreibung" className="border border-border rounded-md px-3 py-2 w-full text-sm" />

          <div className="flex gap-3">
            <select name="triggerEvent" className="border border-border rounded-md px-3 py-2 text-sm">
              <option value="PostViewed">Post angesehen</option>
              <option value="CommentCreated">Kommentar geschrieben</option>
              <option value="NpcReplySelected">NPC-Antwort gewählt</option>
            </select>
            <input
              name="triggerCount"
              type="number"
              min={1}
              defaultValue={1}
              className="border border-border rounded-md px-3 py-2 text-sm w-24"
            />
          </div>
          <input
            name="techniqueFilter"
            placeholder="Nur diese Techniken zählen (kommagetrennt, optional)"
            className="border border-border rounded-md px-3 py-2 w-full text-sm"
          />

          <select name="reflectionContentId" className="border border-border rounded-md px-3 py-2 w-full text-sm">
            <option value="">Keine Reflexion verknüpft</option>
            {reflectionPrompts?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.body.slice(0, 60)}…
              </option>
            ))}
          </select>

          <div className="text-sm">
            <p className="mb-1 text-slate-500 text-xs2">Ziel-Kompetenzen:</p>
            {competencies?.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs mb-1">
                <input type="checkbox" name="targetCompetencies" value={c.id} />
                {c.title}
              </label>
            ))}
          </div>

          <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">
            Anlegen
          </button>
        </form>
      </section>

      {/* ---------- STORY ARCS ---------- */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-3">Story-Arcs</h2>

        {arcs?.map((arc) => {
          const steps = (allSteps ?? []).filter((s) => s.arc_id === arc.id);
          return (
            <div key={arc.id} className="bg-panel border border-border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm text-slate-900">{arc.title}</p>
                  <p className="text-xs2 text-slate-400">{arc.description}</p>
                </div>
                <form>
                  <button
                    formAction={async () => {
                      "use server";
                      await toggleArcLive(arc.id, scenarioId, arc.status !== "live");
                    }}
                    className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas"
                  >
                    {arc.status === "live" ? "live" : "Entwurf → live"}
                  </button>
                </form>
              </div>

              <ol className="space-y-1 mb-3">
                {steps.map((step, i) => (
                  <li key={step.id} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs2 text-slate-400">{step.order_index}.</span>
                    <span className="flex-1">{missionsById.get(step.mission_id)?.title}</span>
                    {step.unlock_delay_hours > 0 && (
                      <span className="text-xs2 text-slate-400">
                        +{step.unlock_delay_hours}h
                      </span>
                    )}
                    {i > 0 && (
                      <form>
                        <button
                          formAction={async () => {
                            "use server";
                            await swapArcSteps(scenarioId, step, steps[i - 1]);
                          }}
                          className="text-xs"
                        >
                          ↑
                        </button>
                      </form>
                    )}
                    {i < steps.length - 1 && (
                      <form>
                        <button
                          formAction={async () => {
                            "use server";
                            await swapArcSteps(scenarioId, step, steps[i + 1]);
                          }}
                          className="text-xs"
                        >
                          ↓
                        </button>
                      </form>
                    )}
                    <form>
                      <button
                        formAction={async () => {
                          "use server";
                          await removeArcStep(step.id, scenarioId);
                        }}
                        className="text-xs text-status-rejected"
                      >
                        entfernen
                      </button>
                    </form>
                  </li>
                ))}
              </ol>

              <form className="flex gap-2">
                <select name="missionId" className="border border-border rounded-md px-2 py-1 text-xs flex-1">
                  {missions
                    ?.filter((m) => !steps.some((s) => s.mission_id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
                <input
                  name="delayHours"
                  type="number"
                  min={0}
                  defaultValue={0}
                  title="Verzögerung in Stunden (nur bei Pacing-Modus 'verteilt' wirksam)"
                  className="border border-border rounded-md px-2 py-1 text-xs w-20"
                  placeholder="+Std."
                />
                <button
                  formAction={async (formData: FormData) => {
                    "use server";
                    await addArcStep(
                      arc.id,
                      scenarioId,
                      String(formData.get("missionId")),
                      Number(formData.get("delayHours") ?? 0)
                    );
                  }}
                  className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas"
                >
                  + Schritt hinzufügen
                </button>
              </form>
              <p className="text-xs2 text-slate-400 mt-1">
                "+Std." wirkt nur, wenn die Lehrkraft den Pacing-Modus
                "Verteilt (mehrere Tage)" wählt — im "Kompakt"-Modus wird
                trotzdem sofort freigeschaltet.
              </p>
            </div>
          );
        })}

        <form action={createArc.bind(null, scenarioId)} className="bg-panel border border-border rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm text-slate-900">Neue Story-Arc</h3>
          <input name="title" placeholder="Titel" required className="border border-border rounded-md px-3 py-2 w-full text-sm" />
          <textarea name="description" placeholder="Beschreibung" className="border border-border rounded-md px-3 py-2 w-full text-sm" />
          <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">
            Anlegen
          </button>
        </form>
      </section>
    </div>
  );
}
