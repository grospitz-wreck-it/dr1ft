import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, Clock3, FileText, Flag, GraduationCap, Info, Layers3, Pencil, Play, Route, School, Sparkles, Users } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createContentItem, generateScenarioContent, optimizeScenarioBasics, toggleScenarioActive, updateContentItemBody, updateScenarioBasics, updateScenarioAmbientDensity } from "../actions";
import { ContentStatusControl } from "./ContentStatusControl";
import { ScenarioCoverEditor } from "../ScenarioCoverEditor";
import { AiGenerationButton } from "../../components/AiGenerationButton";
import { LearningDesignStudio } from "./LearningDesignStudio";
import { ScenarioWizard } from "./ScenarioWizard";
import { LearningStepEditor } from "./LearningStepEditor";
import { ContentComposer } from "./ContentComposer";
import { PostEditForm } from "./PostEditForm";
import { ContentAttachmentEditor } from "./ContentAttachmentEditor";
import { ContentLearningTaskEditor } from "./ContentLearningTaskEditor";
import { regenerateLearningImage, rejectLearningImage } from "../learning-content-actions";

interface Props {
  params: { scenarioId: string };
  searchParams?: { ai?: string; aiError?: string };
}

const AGE_LABELS: Record<string, string> = {
  "12_13": "12–13",
  "14_15": "14–15",
  "16_17": "16–17",
  "18_plus": "18+",
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

function displayScenarioStatus(scenario: any) {
  if (scenario.is_active) return "Aktiv";
  return STATUS_LABELS[scenario.status ?? "draft"] ?? "Entwurf";
}

export default async function ScenarioDetailPage({ params, searchParams = {} }: Props) {
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
    { data: latestLearningDesign },
  ] = await Promise.all([
    supabase.from("scenarios").select("id, title, age_band, age_rating, status, is_active").eq("scenario_group", group).order("age_band"),
    supabase.from("content_items").select("*").eq("scenario_id", scenarioId).order("created_at", { ascending: false }),
    supabase.from("creators").select("id, display_name, creator_role").or(`scenario_id.eq.${scenarioId},scenario_id.is.null`),
    supabase.from("competencies").select("id, title"),
    supabase.from("content_items").select("id, body, scenario_id").eq("type", "post").or(`scenario_id.eq.${scenarioId},scenario_id.is.null`),
    supabase.from("missions").select("*").eq("scenario_id", scenarioId).order("created_at"),
    supabase.from("story_arcs").select("*").eq("scenario_id", scenarioId).order("created_at"),
    supabase.from("learning_designs").select("id,version,status,title,description,primary_learning_model,bloom_target,pedagogical_warnings").eq("scenario_id", scenarioId).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const [{ data: scenarioAssignments }, { data: activeClasses }, { data: missionProgress }] = await Promise.all([
    supabase.from("class_scenario_assignments").select("class_id").eq("scenario_id", scenarioId),
    supabase.from("classes").select("id, school_id, is_active"),
    supabase.from("user_mission_progress").select("mission_id, user_id, status").eq("status", "completed"),
  ]);
  const activeClassById = new Map((activeClasses ?? []).map((item: any) => [item.id, item]));
  const assignedClasses = new Set(
    (scenarioAssignments ?? [])
      .filter((assignment: any) => (activeClassById.get(assignment.class_id) as any)?.is_active !== false)
      .map((assignment: any) => assignment.class_id)
  );
  const schoolsInUse = new Set(
    Array.from(assignedClasses)
      .map((classId) => (activeClassById.get(classId) as any)?.school_id)
      .filter(Boolean)
  ).size;
  const classesInUse = assignedClasses.size;
  const missionIds = new Set((missions ?? []).map((mission: any) => mission.id));
  const learnersReached = new Set(
    (missionProgress ?? [])
      .filter((item: any) => missionIds.has(item.mission_id))
      .map((item: any) => item.user_id)
      .filter(Boolean)
  ).size;
  const latestUpdatedAt = [scenario.updated_at, scenario.created_at, ...(missions ?? []).map((item: any) => item.updated_at ?? item.created_at), ...(contentItems ?? []).map((item: any) => item.updated_at ?? item.created_at)].filter(Boolean).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const learningDesignId = latestLearningDesign?.id ?? null;
  const [{ data: learningSteps }, { data: frameworkMappings }, { data: learningObjectives }] = learningDesignId
    ? await Promise.all([
        supabase.from("learning_steps").select("*").eq("learning_design_id", learningDesignId).order("step_index"),
        supabase.from("framework_mappings").select("id,framework,dimension_label,rationale,source_title,source_url").eq("learning_design_id", learningDesignId).order("framework"),
        supabase.from("learning_objectives").select("id,title").eq("learning_design_id", learningDesignId).order("priority"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const learningStepIds = (learningSteps ?? []).map((step) => step.id);
  const [{ data: learningStepObjectiveMappings }, { data: learningStepCompetencyMappings }, { data: learningStepMissionMappings }, { data: learningEvidenceIndicators }, { data: learningStepContentMappings }] = learningStepIds.length
    ? await Promise.all([
        supabase.from("learning_step_objectives").select("learning_step_id,learning_objective_id").in("learning_step_id", learningStepIds),
        supabase.from("learning_step_competencies").select("learning_step_id,competency_id").in("learning_step_id", learningStepIds),
        supabase.from("learning_step_missions").select("learning_step_id,mission_id").in("learning_step_id", learningStepIds),
        supabase.from("evidence_indicators").select("*").in("learning_step_id", learningStepIds).order("created_at"),
        supabase.from("learning_step_content").select("learning_step_id,content_item_id,role,sort_order").in("learning_step_id", learningStepIds).order("sort_order"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const learningStepCompetencyIds = Array.from(
    new Set(
      (learningSteps ?? []).reduce<string[]>((ids, step) => {
        if (Array.isArray(step.competency_ids)) ids.push(...step.competency_ids);
        return ids;
      }, [])
    )
  );
  const { data: learningStepCompetencies } = learningStepCompetencyIds.length
    ? await supabase.from("competencies").select("id,title").in("id", learningStepCompetencyIds)
    : { data: [] };
  const learningObjectiveLabels = Object.fromEntries((learningObjectives ?? []).map((objective) => [objective.id, objective.title]));
  const learningCompetencyLabels = Object.fromEntries((learningStepCompetencies ?? []).map((competency) => [competency.id, competency.title]));

  const arcIds = (arcs ?? []).map((arc) => arc.id);
  const { data: steps } = arcIds.length
    ? await supabase.from("story_arc_steps").select("*").in("arc_id", arcIds).order("order_index")
    : { data: [] };

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

        <ScenarioWizard
          steps={[
            { title: "Thema & Ziel", description: "Grundlage des Szenarios", complete: true },
            { title: "Lernplan", description: "Lernziel und Lernschritte", complete: Boolean(latestLearningDesign && (learningSteps?.length ?? 0) > 0) },
            { title: "Posts erstellen", description: "Beiträge für den Feed", complete: (contentItems ?? []).some((item) => item.type === "post") && (missions ?? []).length > 0 },
            { title: "Prüfen & freigeben", description: "Abschluss und Aktivierung", complete: Boolean(scenario.is_active) },
          ]}
        >
          <div className="space-y-5">
                    <header id="workflow-basics" className="scroll-mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="space-y-4">
  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><a href="/scenarios" className="hover:text-violet-700">Szenarien</a><span className="text-slate-300">›</span><span className="truncate">{scenario.title}</span></div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{scenario.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800"><Users className="h-4 w-4" />{AGE_LABELS[scenario.age_band] ?? scenario.age_rating}<span className="text-xs font-normal text-violet-600">Altersgruppe</span></span>
        <span className={"inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold " + (scenario.is_active ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700")}><span className={"h-2 w-2 rounded-full " + (scenario.is_active ? "bg-emerald-500" : "bg-amber-500")} />{displayScenarioStatus(scenario)}</span>
      </div>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <a href="#workflow-posts" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-lg"><Play className="h-4 w-4" />Szenario öffnen</a>
      <details className="relative"><summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:text-violet-700"><ChevronDown className="h-4 w-4" /><span className="sr-only">Weitere Aktionen</span></summary><div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><a href="#workflow-basics" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-violet-50"><Pencil className="h-4 w-4 text-violet-600" />Grundlage bearbeiten</a><a href="#workflow-posts" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-violet-50"><BookOpen className="h-4 w-4 text-violet-600" />Missionen & Inhalte</a><a href="#workflow-review" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-violet-50"><CheckCircle2 className="h-4 w-4 text-violet-600" />Prüfen & freigeben</a></div></details>
    </div>
  </div>
  <ScenarioCoverEditor scenarioId={scenarioId} title={scenario.title} coverImageUrl={scenario.cover_image_url ?? null} />
  <section aria-label="Szenario-Kennzahlen" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
    <DetailKpi icon={<BookOpen className="h-5 w-5" />} tint="violet" label="Inhalte (Missionen)" value={String((missions?.length ?? 0) + (contentItems?.length ?? 0))} />
    <DetailKpi icon={<School className="h-5 w-5" />} tint="blue" label="Schulen im Einsatz" value={String(schoolsInUse)} />
    <DetailKpi icon={<GraduationCap className="h-5 w-5" />} tint="emerald" label="Aktive Klassen" value={String(classesInUse)} />
    <DetailKpi icon={<Users className="h-5 w-5" />} tint="rose" label="Lernende erreicht" value={String(learnersReached)} />
  </section>
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.8fr)]">
    <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/70 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><FileText className="h-4 w-4" /></span><h2 className="text-base font-bold text-slate-950">Szenario-Beschreibung</h2></div>
      <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{scenario.description || "Noch keine Beschreibung hinterlegt."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2"><details><summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"><Pencil className="h-3.5 w-3.5" />Beschreibung bearbeiten</summary><form action={updateScenarioBasics.bind(null, scenarioId)} className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3"><label className="text-xs font-semibold text-slate-600">Titel<input name="title" defaultValue={scenario.title} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Beschreibung<textarea name="description" defaultValue={scenario.description ?? ""} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><button className="justify-self-start rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Änderungen speichern</button></form></details>
        <form action={optimizeScenarioBasics.bind(null, scenarioId)}><AiGenerationButton idleLabel="Mit KI verbessern" pendingLabel="Grundlage wird verbessert …" className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100" pendingSteps={["Grundlage analysieren …", "Titel und Beschreibung schärfen …", "Entwurf speichern …"]} /></form>
      </div>
    </section>
    <aside className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Info className="h-4 w-4" /></span><h2 className="text-base font-bold text-slate-950">Schnelle Infos</h2></div><a href="#workflow-basics" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"><Pencil className="h-3.5 w-3.5" />Bearbeiten</a></div>
      <div className="mt-3 divide-y divide-slate-100">
        <QuickInfo icon={<Users className="h-4 w-4" />} label="Altersgruppe" value={(AGE_LABELS[scenario.age_band] ?? scenario.age_rating) + " Jahre"} tint="violet" />
        <QuickInfo icon={<CheckCircle2 className="h-4 w-4" />} label="Status" value={displayScenarioStatus(scenario)} tint={scenario.is_active ? "emerald" : "amber"} />
        <QuickInfo icon={<Layers3 className="h-4 w-4" />} label="Varianten" value={(variants?.length ?? 1) + " insgesamt"} tint="blue" />
        <QuickInfo icon={<BookOpen className="h-4 w-4" />} label="Missionen" value={(missions?.length ?? 0) + " Missionen"} tint="violet" />
        <QuickInfo icon={<Clock3 className="h-4 w-4" />} label="Letzte Änderung" value={latestUpdatedAt ? new Date(latestUpdatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "Keine Angabe"} tint="slate" />
      </div>
    </aside>
  </div>
</div>
                      <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Feed & Ambient-Content</h3>
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Steuere, wie viele neutrale Alltagsbeiträge zwischen den szenariorelevanten Posts auftauchen. Diese Einstellung lässt sich jederzeit ändern – auch bei bereits angelegten Szenen.</p>
                          </div>
                          <form action={updateScenarioAmbientDensity.bind(null, scenarioId)} className="flex w-full flex-col gap-2 sm:w-72">
                            <label htmlFor="ambientDensity" className="text-xs font-semibold text-slate-700">Ambient-Dichte</label>
                            <select id="ambientDensity" name="ambientDensity" defaultValue={scenario.ambient_density ?? "medium"} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                              <option value="off">Aus – keine globalen Ambient-Posts</option>
                              <option value="low">Niedrig – seltene Alltagsbeiträge</option>
                              <option value="medium">Mittel – ausgewogener Feed</option>
                              <option value="high">Hoch – viele Alltagsbeiträge</option>
                            </select>
                            <p className="text-[11px] leading-4 text-slate-500">
                              Erwartete Lesedauer: {({ off: "ca. 7–9 Minuten", low: "ca. 9–12 Minuten", medium: "ca. 12–16 Minuten", high: "ca. 17–22 Minuten" } as Record<string, string>)[scenario.ambient_density ?? "medium"] ?? "ca. 12–16 Minuten"}. Grundlage: geschätzte Lesezeit pro Beitrag; tatsächliche Dauer hängt von Lesetempo und Interaktionen ab.
                            </p>
                            <button className="self-start rounded-xl bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800">Feed-Einstellung speichern</button>
                          </form>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                        {(variants ?? []).map((variant) => (
                          <a
                            key={variant.id}
                            href={`/scenarios/${variant.id}`}
                            className={`rounded-xl border px-3 py-2 ${variant.id === scenarioId ? "border-accent bg-accent/5" : "border-slate-200 hover:border-accent"}`}
                          >
                            <div className="text-xs font-semibold text-slate-800">{AGE_LABELS[variant.age_band] ?? variant.age_rating}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{displayScenarioStatus(variant)}</div>
                          </a>
                        ))}
                      </div>
                    </header>
                    {(searchParams.ai || searchParams.aiError) && (
                      <section className={`rounded-2xl border px-5 py-4 ${searchParams.aiError ? "border-red-200 bg-red-50" : "border-accent/20 bg-accent/5"}`}>
                        <div className={`text-xs font-semibold uppercase tracking-wider ${searchParams.aiError ? "text-red-700" : "text-accent"}`}>
                          {searchParams.aiError ? "KI-Assistent" : "KI-Assistent abgeschlossen"}
                        </div>
                        <div className={`mt-1 text-sm ${searchParams.aiError ? "text-red-800" : "text-slate-700"} break-words`}>
                          {searchParams.aiError ?? searchParams.ai}
                        </div>
                      </section>
                    )}
          </div>
          <div className="space-y-5">

          </div>
          <div className="space-y-5">
                    <section className="grid md:grid-cols-4 gap-3">
                      <SummaryCard icon={<Route className="w-4 h-4" />} label="Didaktische Struktur" value={learningSteps?.length ? `${learningSteps.length} intern` : "Optional"} />
                      <SummaryCard icon={<Flag className="w-4 h-4" />} label="Missionen" value={`${missions?.length ?? 0}`} />
                      <SummaryCard icon={<FileText className="w-4 h-4" />} label="Inhalte" value={`${contentItems?.length ?? 0}`} />
                      <SummaryCard icon={<Users className="w-4 h-4" />} label="Status" value={scenario.is_active ? "Aktiv" : "Entwurf"} />
                    </section>
            
                            <details id="workflow-plan" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white">
                      <summary className="cursor-pointer list-none p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Optional · für komplexe Szenarien</div>
                            <h2 className="mt-1 text-base font-semibold text-slate-900">Didaktische Struktur und Lernziele</h2>
                            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Du kannst Content-Pieces direkt erstellen. Diese zusätzliche Struktur ist nur nötig, wenn du Lernschritte, Missionen und Evidenz gezielt planen oder bestehende Lernpläne weiterbearbeiten möchtest.</p>
                          </div>
                          <span className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{latestLearningDesign ? `Lernplan v${latestLearningDesign.version}` : "Noch nicht angelegt"}</span>
                        </div>
                      </summary>
                      <div className="space-y-5 border-t border-slate-100 p-4 sm:p-5">
                        <LearningDesignStudio scenarioId={scenarioId} latestDesign={latestLearningDesign} />
                        {latestLearningDesign && (
                          <LearningStepEditor
                            scenarioId={scenarioId}
                            designId={latestLearningDesign.id}
                            steps={learningSteps ?? []}
                            mappings={frameworkMappings ?? []}
                            competencyLabels={learningCompetencyLabels}
                            objectiveLabels={learningObjectiveLabels}
                            availableObjectives={learningObjectives ?? []}
                            availableCompetencies={competencies ?? []}
                            availableMissions={missions ?? []}
                            objectiveMappings={learningStepObjectiveMappings ?? []}
                            competencyMappings={learningStepCompetencyMappings ?? []}
                            missionMappings={learningStepMissionMappings ?? []}
                            evidenceIndicators={learningEvidenceIndicators ?? []}
                            contentMappings={learningStepContentMappings ?? []}
                            contentItems={contentItems ?? []}
                          />
                        )}
                      </div>
                    </details>

                    <section id="workflow-posts" className="scroll-mt-6 relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/70 p-4 shadow-sm sm:p-6">
                      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-violet-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <SectionHeader icon={<FileText className="w-4 h-4" />} title="Lernerlebnisse & Content-Pieces" subtitle="Gestalte direkt die Erlebnisse im Feed: Posts, Kommentare, Chats, Entscheidungen und Reflexionsimpulse. Die didaktische Struktur ist optional." />
                        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-semibold text-violet-800">✦ Content-Atelier</span>
                      </div>
                      <ContentComposer scenarioId={scenarioId} creators={creators ?? []} />
            
                      {grouped.length > 0 ? (
                        <div className="mt-5 space-y-5">
                          {grouped.map((group) => (
                            <div key={group.status}>
                              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{STATUS_LABELS[group.status] ?? group.status} · {group.items.length}</div>
                              <ul className="space-y-2">
                                {group.items.map((item) => (
                                  <li key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                    {item.media_url && item.media_type === "image" && (
                                      <div className="bg-slate-100">
                                        <img src={item.media_url} alt="" className="mx-auto block h-auto w-auto max-h-[560px] max-w-full object-contain" />
                                      </div>
                                    )}
                                    {item.media_url && item.media_type === "video" && videoEmbedUrl(item.media_url) ? (
                                      <div className="aspect-video bg-slate-100">
                                        <iframe src={videoEmbedUrl(item.media_url)!} title="Video" className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                                      </div>
                                    ) : item.media_url && item.media_type === "video" ? (
                                      <div className="bg-black">
                                        <video src={item.media_url} controls playsInline preload="metadata" className="w-full max-h-[420px]" />
                                      </div>
                                    ) : null}
                                    {item.extra?.embed?.url && (
                                      <div className="aspect-video bg-slate-100">
                                        <iframe src={item.extra.embed.url} title="Eingebettetes Video" className="w-full h-full" allowFullScreen />
                                      </div>
                                    )}
                                    <div className="p-3">
                                      <PostEditForm
                                        title={item.title ?? null}
                                        body={item.body ?? ""}
                                        action={updateContentItemBody.bind(null, item.id, scenarioId)}
                                      />
                                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{item.body}</p>
                                      <p className="text-xs text-slate-400 mt-1">{item.type} · {item.age_rating} · Schwierigkeit {item.difficulty}{item.creator_id && creators?.find((creator) => creator.id === item.creator_id) ? " · Figur: " + creators.find((creator) => creator.id === item.creator_id)?.display_name : ""}</p>
            
                                      {item.media_url && item.media_type === "image" && (
                                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
                                          <div className="flex items-center justify-between gap-3">
                                            <div>
                                              <div className="text-xs font-semibold text-slate-700">Bildredaktion</div>
                                              <div className="text-[11px] text-slate-500 mt-0.5">
                                                {item.extra?.imageGeneration?.editorialReview === "rejected"
                                                  ? "Bild abgelehnt · Neugenerierung möglich"
                                                  : "Bild wartet auf redaktionelle Prüfung"}
                                                {item.extra?.imageGeneration?.generationCount
                                                  ? " · Generation " + item.extra.imageGeneration.generationCount
                                                  : ""}
                                              </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                              {item.extra?.imageGeneration?.provider ?? "AI"}
                                            </div>
                                          </div>
            
                                          <form action={regenerateLearningImage.bind(null, item.id, scenarioId)} className="mt-3 flex flex-col sm:flex-row gap-2">
                                            <input
                                              name="feedback"
                                              placeholder="Optional: Was soll beim neuen Bild anders sein?"
                                              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px]"
                                            />
                                            <button type="submit" className="rounded-lg bg-slate-900 text-white px-3 py-2 text-[11px] font-semibold">
                                              Bild neu generieren
                                            </button>
                                          </form>
            
                                          <form action={rejectLearningImage.bind(null, item.id, scenarioId)} className="mt-2">
                                            <input
                                              name="editorialFeedback"
                                              placeholder="Bei Ablehnung Feedback eintragen"
                                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px]"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">
                                              Die Ablehnung wird gespeichert; anschließend kann das Bild mit neuem Feedback erzeugt werden.
                                            </p>
                                          </form>
                                        </div>
                                      )}
            
                                      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70">
                                        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-slate-700">
                                          Lernwirkung & Verknüpfungen <span className="font-normal text-slate-400">· optional</span>
                                        </summary>
                                        <div className="space-y-3 border-t border-slate-200 p-3">
                                          <p className="text-[11px] leading-4 text-slate-500">Nur öffnen, wenn dieser Inhalt eine konkrete Lernaufgabe, einen Nachweis oder eine besondere Verknüpfung braucht.</p>
                                          <ContentLearningTaskEditor scenarioId={scenarioId} contentItemId={item.id} initialTask={item.extra?.learningTask ?? null} />
                                          <ContentAttachmentEditor scenarioId={scenarioId} contentItemId={item.id} />
                                        </div>
                                      </details>
                                      <div className="mt-2"><ContentStatusControl contentItemId={item.id} status={item.status} /></div>
                                    </div>
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
            
                    <details id="workflow-plan" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white">
                      <summary className="cursor-pointer list-none p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Optional · für komplexe Szenarien</div>
                            <h2 className="mt-1 text-base font-semibold text-slate-900">Didaktische Struktur und Lernziele</h2>
                            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Du kannst Content-Pieces direkt erstellen. Diese zusätzliche Struktur ist nur nötig, wenn du Lernschritte, Missionen und Evidenz gezielt planen oder bestehende Lernpläne weiterbearbeiten möchtest.</p>
                          </div>
                          <span className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{latestLearningDesign ? `Lernplan v${latestLearningDesign.version}` : "Noch nicht angelegt"}</span>
                        </div>
                      </summary>
                      <div className="space-y-5 border-t border-slate-100 p-4 sm:p-5">
                        <LearningDesignStudio scenarioId={scenarioId} latestDesign={latestLearningDesign} />
                        {latestLearningDesign && (
                          <LearningStepEditor
                            scenarioId={scenarioId}
                            designId={latestLearningDesign.id}
                            steps={learningSteps ?? []}
                            mappings={frameworkMappings ?? []}
                            competencyLabels={learningCompetencyLabels}
                            objectiveLabels={learningObjectiveLabels}
                            availableObjectives={learningObjectives ?? []}
                            availableCompetencies={competencies ?? []}
                            availableMissions={missions ?? []}
                            objectiveMappings={learningStepObjectiveMappings ?? []}
                            competencyMappings={learningStepCompetencyMappings ?? []}
                            missionMappings={learningStepMissionMappings ?? []}
                            evidenceIndicators={learningEvidenceIndicators ?? []}
                            contentMappings={learningStepContentMappings ?? []}
                            contentItems={contentItems ?? []}
                          />
                        )}
                      </div>
                    </details>

                    <details className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-slate-700">Erweiterte manuelle Anlage (optional)</summary>
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
          <div className="space-y-5">
                    <section id="workflow-review" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Letzter Schritt</div>
                          <h2 className="mt-1 text-lg font-semibold text-slate-900">Prüfen und freigeben</h2>
                          <p className="mt-1 max-w-2xl text-sm text-slate-500">Kontrolliere, ob Lernplan, Missionen und Posts vorhanden sind. Die Aktivierung bleibt eine bewusste redaktionelle Entscheidung.</p>
                        </div>
                        <form>
                          <button
                            formAction={async () => {
                              "use server";
                              await toggleScenarioActive(scenarioId, !scenario.is_active);
                            }}
                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${scenario.is_active ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "bg-accent text-white hover:bg-accent-hover"}`}
                          >
                            {scenario.is_active ? "Szenario deaktivieren" : "Szenario aktivieren"}
                          </button>
                        </form>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "Thema angelegt", ok: true },
                          { label: "Lernplan vorhanden", ok: Boolean(latestLearningDesign && (learningSteps?.length ?? 0) > 0) },
                          { label: "Mindestens ein Post", ok: (contentItems ?? []).some((item) => item.type === "post") },
                          { label: "Mindestens eine Mission", ok: (missions ?? []).length > 0 },
                        ].map((check) => (
                          <div key={check.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${check.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                            <span className="font-bold">{check.ok ? "✓" : "!"}</span>
                            <span>{check.label}</span>
                          </div>
                        ))}
                      </div>
                      {!scenario.is_active && (
                        <p className="mt-3 text-xs text-slate-500">Das Szenario bleibt ein Entwurf, bis du es aktivierst. Fehlende Punkte lassen sich über die Schritte oben ergänzen.</p>
                      )}
                    </section>
          </div>
        </ScenarioWizard>
      </div>
    </div>
  );
}

function videoEmbedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") {
      const id = parts[0];
      return id ? "https://www.youtube.com/embed/" + id : null;
    }

    if (host.includes("youtube.com")) {
      if (parts[0] === "embed" && parts[1]) return "https://www.youtube.com/embed/" + parts[1];
      if (parts[0] === "shorts" && parts[1]) return "https://www.youtube.com/embed/" + parts[1];
      const id = url.searchParams.get("v");
      return id ? "https://www.youtube.com/embed/" + id : null;
    }

    if (host.includes("vimeo.com")) {
      if (host === "player.vimeo.com" && parts[0] === "video" && parts[1]) {
        return "https://player.vimeo.com/video/" + parts[1];
      }
      const id = parts.pop();
      return id && /^\d+$/.test(id) ? "https://player.vimeo.com/video/" + id : null;
    }

    return null;
  } catch {
    return null;
  }
}

function DetailKpi({ icon, tint, label, value, hint }: { icon: ReactNode; tint: "violet" | "blue" | "emerald" | "rose"; label: string; value: string; hint?: string }) {
  const tones = { violet: "bg-violet-100 text-violet-700", blue: "bg-sky-100 text-sky-700", emerald: "bg-emerald-100 text-emerald-700", rose: "bg-rose-100 text-rose-700" };
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.025)] sm:p-4"><span className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl " + tones[tint]}>{icon}</span><span className="min-w-0"><span className="block text-xl font-bold tracking-tight text-slate-950">{value}</span><span className="mt-0.5 block text-xs leading-4 text-slate-500">{label}</span>{hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}</span></div>;
}

function QuickInfo({ icon, label, value, tint }: { icon: ReactNode; label: string; value: string; tint: "violet" | "emerald" | "amber" | "blue" | "slate" }) {
  const tones = { violet: "bg-violet-100 text-violet-700", emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", blue: "bg-sky-100 text-sky-700", slate: "bg-slate-100 text-slate-600" };
  return <div className="flex items-center gap-3 py-2.5"><span className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg " + tones[tint]}>{icon}</span><span className="min-w-0 flex-1 text-xs text-slate-500">{label}</span><span className="max-w-[58%] text-right text-xs font-semibold text-slate-800">{value}</span></div>;
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
