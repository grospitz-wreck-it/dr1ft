import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, FileText, Flag, Route, Sparkles, Users } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createContentItem, toggleScenarioActive, updateArcDraft, updateMissionDraft, updateScenarioBasics } from "../actions";
import { ContentStatusControl } from "./ContentStatusControl";

interface Props {
  params: { scenarioId: string };
}

const AGE_LABELS: Record<string, string> = {
  "12_13": "12–13",
  "14_15": "14–15",
  "16_17": "16–17",
  "18_plus": "18+",
};

const EVENT_LABELS: Record<string, string> = {
  PostViewed: "Post angesehen",
  CommentCreated: "Kommentar geschrieben",
  NpcReplySelected: "NPC-Antwort gewählt",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  live: "Aktiv",
  rejected: "Überarbeiten",
  archived: "Archiv",
};

const STATUS_ORDER = ["draft", "in_review", "approved", "live", "rejected", "archived"];

export default async function ScenarioDetailPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { scenarioId } = params;

  const { data: scenario } = await supabase.from("scenarios").select("*").eq("id", scenarioId).single();

  if (!scenario) {
    return <div className="px-6 py-6 text-sm text-slate-500">Szenario nicht gefunden.</div>;
  }

  const group = scenario.scenario_group || scenario.slug || scenario.id;
  const [
    { data: variants },
    { data: contentItems },
    { data: creators },
    { data: competencies },
    { data: possibleParents },
    { data: missions },
    { data: arcs },
  ] = await Promise.all([
    supabase.from("scenarios").select("id, title, age_band, age_rating, status, is_active").eq("scenario_group", group).order("age_band"),
    supabase.from("content_items").select("*").eq("scenario_id", scenarioId).order("created_at", { ascending: false }),
    supabase.from("creators").select("id, display_name, creator_role").or(`scenario_id.eq.${scenarioId},scenario_id.is.null`),
    supabase.from("competencies").select("id, title"),
    supabase.from("content_items").select("id, body, scenario_id").eq("type", "post").or(`scenario_id.eq.${scenarioId},scenario_id.is.null`),
    supabase.from("missions").select("*").eq("scenario_id", scenarioId).order("created_at"),
    supabase.from("story_arcs").select("*").eq("scenario_id", scenarioId).order("created_at"),
  ]);

  const arcIds = (arcs ?? []).map((arc) => arc.id);
  const { data: steps } = arcIds.length
    ? await supabase.from("story_arc_steps").select("*").in("arc_id", arcIds).order("order_index")
    : { data: [] };

  const missionById = new Map((missions ?? []).map((mission) => [mission.id, mission]));
  const activeArc = arcs?.[0] ?? null;
  const activeSteps = (steps ?? []).filter((step) => step.arc_id === activeArc?.id);
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (contentItems ?? []).filter((item) => item.status === status),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <a href="/scenarios" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" /> Zurück zu Szenarien
        </a>

        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                <Sparkles className="w-3.5 h-3.5" /> Szenario
                <span className="text-slate-300">·</span>
                {AGE_LABELS[scenario.age_band] ?? scenario.age_rating}
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 mt-2">{scenario.title}</h1>
              <p className="text-sm text-slate-500 mt-2 max-w-3xl">{scenario.description}</p>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-semibold text-accent">Szenario-Grundlage bearbeiten</summary>
                <form action={updateScenarioBasics.bind(null, scenarioId)} className="mt-3 grid gap-2 max-w-2xl">
                  <input name="title" defaultValue={scenario.title} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <textarea name="description" defaultValue={scenario.description ?? ""} rows={4} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <button className="justify-self-start rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-semibold">Änderungen speichern</button>
                </form>
              </details>
            </div>
            <form>
              <button
                formAction={async () => {
                  "use server";
                  await toggleScenarioActive(scenarioId, !scenario.is_active);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
              >
                {scenario.is_active ? "Aktiv" : "Als Entwurf belassen"}
              </button>
            </form>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            {(variants ?? []).map((variant) => (
              <a
                key={variant.id}
                href={`/scenarios/${variant.id}`}
                className={`rounded-xl border px-3 py-2 ${variant.id === scenarioId ? "border-accent bg-accent/5" : "border-slate-200 hover:border-accent"}`}
              >
                <div className="text-xs font-semibold text-slate-800">{AGE_LABELS[variant.age_band] ?? variant.age_rating}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{STATUS_LABELS[variant.status ?? "draft"] ?? "Entwurf"}</div>
              </a>
            ))}
          </div>
        </header>

        <section className="grid md:grid-cols-4 gap-3">
          <SummaryCard icon={<Route className="w-4 h-4" />} label="Ablauf" value={activeSteps.length ? `${activeSteps.length} Schritte` : "Noch leer"} />
          <SummaryCard icon={<Flag className="w-4 h-4" />} label="Missionen" value={`${missions?.length ?? 0}`} />
          <SummaryCard icon={<FileText className="w-4 h-4" />} label="Inhalte" value={`${contentItems?.length ?? 0}`} />
          <SummaryCard icon={<Users className="w-4 h-4" />} label="Status" value={scenario.is_active ? "Aktiv" : "Entwurf"} />
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <SectionHeader icon={<Route className="w-4 h-4" />} title="Ablauf" subtitle="Die Redaktion denkt in Lernschritten. Missionen und Story-Arc liegen technisch darunter." />
          {activeArc ? (
            <div className="mt-5">
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">{activeArc.title} bearbeiten</summary>
                <form action={updateArcDraft.bind(null, activeArc.id, scenarioId)} className="mt-3 grid gap-2 max-w-2xl">
                  <input name="title" defaultValue={activeArc.title} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <textarea name="description" defaultValue={activeArc.description ?? ""} rows={3} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <button className="justify-self-start rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-semibold">Ablauf speichern</button>
                </form>
              </details>
              {activeSteps.length ? (
                <ol className="space-y-2">
                  {activeSteps.map((step, index) => {
                    const mission = missionById.get(step.mission_id);
                    if (!mission) return null;
                    return (
                      <li key={step.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800">{mission.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{mission.description}</div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[11px] font-semibold text-accent">Bearbeiten</summary>
                            <form action={updateMissionDraft.bind(null, mission.id, scenarioId)} className="mt-2 grid gap-2">
                              <input name="title" defaultValue={mission.title} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                              <textarea name="description" defaultValue={mission.description ?? ""} rows={2} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                              <button className="justify-self-start rounded-lg bg-slate-900 text-white px-2.5 py-1.5 text-[11px] font-semibold">Speichern</button>
                            </form>
                          </details>
                        </div>
                        <span className="text-[11px] rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                          {EVENT_LABELS[mission.trigger_condition?.event] ?? "Lernaktion"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Noch keine Schritte. Ergänze den Ablauf direkt in diesem Szenario.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-7 text-center">
              <p className="text-sm font-medium text-slate-700">Noch kein Ablauf vorhanden</p>
              <p className="text-xs text-slate-500 mt-1">Bei einem KI-Entwurf wird der erste Ablauf automatisch angelegt.</p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Missionen und Ablauf bleiben als Entwurf bearbeitbar.</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              Redaktioneller Draft <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <SectionHeader icon={<FileText className="w-4 h-4" />} title="Inhalte" subtitle="Posts, Kommentare, DMs und Reflexionen für diese Altersvariante." />

          {grouped.length > 0 ? (
            <div className="mt-5 space-y-5">
              {grouped.map((group) => (
                <div key={group.status}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{STATUS_LABELS[group.status] ?? group.status} · {group.items.length}</div>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item.id} className="border border-slate-200 rounded-xl p-3">
                        <p className="text-sm text-slate-900">{item.body}</p>
                        <p className="text-xs text-slate-400 mt-1">{item.type} · {item.age_rating} · Schwierigkeit {item.difficulty}</p>
                        <div className="mt-2"><ContentStatusControl contentItemId={item.id} status={item.status} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">
              Noch keine Inhalte. Du kannst sie jetzt Schritt für Schritt ergänzen.
            </div>
          )}
        </section>

        <details className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-slate-700">Inhalt manuell hinzufügen</summary>
          <form action={createContentItem.bind(null, scenarioId)} encType="multipart/form-data" className="px-6 pb-6 pt-2 space-y-3">
            <select name="type" className="border border-slate-200 rounded-xl px-3 py-2 w-full text-sm">
              <option value="post">Post</option>
              <option value="comment">Kommentar</option>
              <option value="dm_message">DM-Nachricht</option>
              <option value="reflection_prompt">Reflexions-Prompt</option>
            </select>
            <textarea name="body" placeholder="Inhalt" required className="border border-slate-200 rounded-xl px-3 py-3 w-full text-sm" />
            <div>
              <label className="text-xs text-slate-500 block mb-1">Bild/Video (optional)</label>
              <input name="media" type="file" accept="image/*,video/*" className="border border-slate-200 rounded-xl px-3 py-2 w-full text-sm" />
            </div>
            <select name="creatorId" className="border border-slate-200 rounded-xl px-3 py-2 w-full text-sm">
              <option value="">Kein Creator</option>
              {creators?.map((creator) => <option key={creator.id} value={creator.id}>{creator.display_name} {creator.creator_role ? `(${creator.creator_role})` : ""}</option>)}
            </select>
            <select name="parentContentId" className="border border-slate-200 rounded-xl px-3 py-2 w-full text-sm">
              <option value="">Kein Bezug</option>
              {possibleParents?.map((parent) => <option key={parent.id} value={parent.id}>Kommentar zu: {parent.body.slice(0, 60)}…</option>)}
            </select>
            <div className="flex gap-3">
              <input name="baseEngagement" type="number" min={0} placeholder="Basis-Likes" className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1" />
              <input name="baseCommentCount" type="number" min={0} placeholder="Basis-Kommentare" className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1" />
            </div>
            <input name="manipulationTechniques" placeholder="Manipulationstechniken, kommagetrennt" className="border border-slate-200 rounded-xl px-3 py-2 w-full text-sm" />
            <div>
              <p className="mb-2 text-xs text-slate-500">Ziel-Kompetenzen</p>
              <div className="grid md:grid-cols-2 gap-1">
                {competencies?.map((competency) => (
                  <label key={competency.id} className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" name="targetCompetencies" value={competency.id} />{competency.title}</label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <select name="difficulty" className="border border-slate-200 rounded-xl px-3 py-2 text-sm"><option value="1">Schwierigkeit 1</option><option value="2">Schwierigkeit 2</option><option value="3">Schwierigkeit 3</option><option value="4">Schwierigkeit 4</option><option value="5">Schwierigkeit 5</option></select>
              <select name="ageRating" className="border border-slate-200 rounded-xl px-3 py-2 text-sm"><option value="all_ages">Alle Altersgruppen</option><option value="12_plus">12+</option><option value="16_plus">16+</option></select>
            </div>
            <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-xl">Als Entwurf anlegen</button>
          </form>
        </details>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div>
      <div className="text-lg font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">{icon}</div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
