// apps/admin/app/missions/[scenarioId]/page.tsx

import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import {
  createMission,
  toggleMissionLive,
  saveMissionThumbnail,
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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8">
      <h1 className="text-lg font-semibold text-slate-900">{scenario?.title} — Missionen &amp; Arcs</h1>

      {/* ---------- MISSIONEN ---------- */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-3">Missionen</h2>
        <ul className="mb-6 grid gap-4">
          {missions?.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="relative min-h-32 overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-400">
                  {m.thumbnail_url ? <img src={m.thumbnail_url} alt={`Thumbnail: ${m.title}`} className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full min-h-32 flex-col items-center justify-center text-white"><span className="text-4xl">✦</span><span className="mt-2 text-[9px] font-bold tracking-[.25em]">DR1FT / MISSION</span></div>}
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${m.status === "live" ? "bg-emerald-100 text-emerald-700" : "bg-white/90 text-slate-600"}`}>{m.status === "live" ? "LIVE" : "ENTWURF"}</span>
                </div>
                <div className="min-w-0 p-4 md:p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0"><p className="font-semibold text-slate-950">{m.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{m.description || "Noch keine Beschreibung."}</p><p className="mt-2 text-xs text-slate-400">Trigger: {EVENT_LABELS[m.trigger_condition?.event] ?? m.trigger_condition?.event} × {m.trigger_condition?.count ?? 1}{m.trigger_condition?.technique_filter?.length ? ` · ${m.trigger_condition.technique_filter.join(", ")}` : ""}</p></div>
                    <form className="shrink-0"><button formAction={async () => { "use server"; await toggleMissionLive(m.id, scenarioId, m.status !== "live"); }} className={`rounded-xl px-3 py-2 text-xs font-semibold ${m.status === "live" ? "border border-slate-200 bg-white text-slate-600" : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/15"}`}>{m.status === "live" ? "Live deaktivieren" : "Live schalten"}</button></form>
                  </div>
                  <form action={saveMissionThumbnail.bind(null, m.id, scenarioId)} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
                    <label className="min-w-0 flex-1"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Mission-Thumbnail (URL)</span><input type="url" name="thumbnailUrl" defaultValue={m.thumbnail_url ?? ""} placeholder="https://…/mission-cover.webp" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs" /></label>
                    <button type="submit" className="self-end rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100">Thumbnail speichern</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <form
          action={createMission.bind(null, scenarioId)}
          className="bg-panel border border-border rounded-lg p-4 space-y-3"
        >
          <h3 className="font-semibold text-lg text-slate-950">Neue Mission</h3><p className="text-sm text-slate-500">Mission erstellen und ein Titelbild für die Kartenansicht hinterlegen.</p>
          <input name="title" placeholder="Titel" required className="border border-border rounded-md px-3 py-2 w-full text-sm" />
          <textarea name="description" placeholder="Beschreibung" className="border border-border rounded-md px-3 py-2 w-full text-sm" />
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Mission-Thumbnail URL (optional)</span><input type="url" name="thumbnailUrl" placeholder="https://…/mission-cover.webp" className="border border-border rounded-xl px-3 py-2 w-full text-sm" /></label>

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
