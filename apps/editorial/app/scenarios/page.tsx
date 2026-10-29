import type { ReactNode } from "react";
import { BookOpen, Users, Building2, CheckCircle2, Sparkles, GraduationCap, School, Flag, Layers3, ArrowUpRight } from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { ScenarioCoverEditor } from "./ScenarioCoverEditor";

const AGE_BANDS = [
  ["9_11", "9–11", "Kinder / frühe Lernende"],
  ["12_13", "12–13", "Frühe Teenager"],
  ["14_15", "14–15", "Mittlere Teenager"],
  ["16_17", "16–17", "Ältere Jugendliche"],
  ["18_plus", "18+", "Erwachsene / ältere Lernende"],
] as const;

const STATUS: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  live: "Aktiv",
  rejected: "Überarbeiten",
  archived: "Archiv",
};

function displayScenarioStatus(scenario: any) {
  // is_active controls availability; status is the editorial workflow state.
  if (scenario.is_active) return "Aktiv";
  return STATUS[scenario.status ?? "draft"] ?? "Entwurf";
}

function groupKey(scenario: any) {
  return scenario.scenario_group || scenario.slug || scenario.id;
}

export default async function ScenariosPage() {
  const supabase = supabaseServerClient();
  const [
    { data: scenarios },
    { data: missions },
    { data: contentItems },
    { data: assignments },
    { data: classes },
    { data: progress },
  ] = await Promise.all([
    supabase.from("scenarios").select("*").order("created_at", { ascending: false }),
    supabase.from("missions").select("id, scenario_id, status"),
    supabase.from("content_items").select("id, scenario_id"),
    supabase.from("class_scenario_assignments").select("scenario_id, class_id"),
    supabase.from("classes").select("id, school_id, is_active"),
    supabase.from("user_mission_progress").select("mission_id, user_id, status, completed_at"),
  ]);

  const rows = scenarios ?? [];
  const grouped = new Map<string, any[]>();
  for (const scenario of rows) {
    const key = groupKey(scenario);
    const list = grouped.get(key) ?? [];
    list.push(scenario);
    grouped.set(key, list);
  }

  const classById = new Map((classes ?? []).map((item: any) => [item.id, item]));
  const families = Array.from(grouped.entries()).map(([key, variants]) => {
    const first = variants[0];
    const scenarioIds = new Set(variants.map((variant) => variant.id));
    const familyMissions = (missions ?? []).filter((mission: any) => scenarioIds.has(mission.scenario_id));
    const missionIds = new Set(familyMissions.map((mission: any) => mission.id));
    const familyContent = (contentItems ?? []).filter((item: any) => scenarioIds.has(item.scenario_id));
    const activeScenarioIds = new Set(variants.filter((variant) => variant.is_active).map((variant) => variant.id));
    const familyAssignments = (assignments ?? []).filter((item: any) => {
      const klass: any = classById.get(item.class_id);
      return scenarioIds.has(item.scenario_id) && activeScenarioIds.has(item.scenario_id) && klass?.is_active !== false;
    });
    const activeAssignedClasses = new Set(familyAssignments.map((item: any) => item.class_id));
    const schoolIds = new Set(familyAssignments.map((item: any) => {
      const klass: any = classById.get(item.class_id);
      return klass?.school_id;
    }).filter(Boolean));
    const completedProgress = (progress ?? []).filter((item: any) => missionIds.has(item.mission_id) && item.status === "completed");
    const completedMissions = completedProgress.length;
    const learnersReached = new Set(completedProgress.map((item: any) => item.user_id).filter(Boolean)).size;

    return {
      key,
      title: first.title?.replace(/\s*[–-]\s*(9–11|12–13|14–15|16–17|18\+).*$/i, "") || first.title,
      description: first.description?.split("\n\nLernziele")[0] || "",
      variants,
      coverImageUrl: first.cover_image_url ?? null,
      missionCount: familyMissions.length,
      contentCount: familyContent.length,
      activeVariants: variants.filter((variant) => variant.is_active).length,
      activeClasses: activeAssignedClasses.size,
      schoolsInUse: schoolIds.size,
      completedMissions,
      learnersReached,
    };
  });

  const totalActive = rows.filter((scenario: any) => scenario.is_active).length;
  const activeScenarioIds = new Set(rows.filter((scenario: any) => scenario.is_active).map((scenario: any) => scenario.id));
  const activeAssignments = (assignments ?? []).filter((item: any) => {
    const klass: any = classById.get(item.class_id);
    return activeScenarioIds.has(item.scenario_id) && klass?.is_active !== false;
  });
  const totalAssignedClasses = new Set(activeAssignments.map((item: any) => item.class_id)).size;
  const totalSchools = new Set(activeAssignments.map((item: any) => {
    const klass: any = classById.get(item.class_id);
    return klass?.school_id;
  }).filter(Boolean)).size;
  const totalCompletions = (progress ?? []).filter((item: any) => item.status === "completed").length;

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
              <BookOpen className="h-4 w-4" /> Lernfälle
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">Szenario-Studio</h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
              Bestehende Szenarien verwalten, Einsatz und Lernfortschritt überblicken oder einen neuen Lernfall entwickeln.
            </p>
          </div>
          <a href="/scenarios/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover hover:shadow-md">
            <Sparkles className="h-4 w-4" /> Neues Szenario anlegen
          </a>
        </header>

        <section aria-label="Szenario-Kennzahlen" className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:gap-3">
          <Kpi icon={<BookOpen className="h-4 w-4" />} label="Szenario-Themen" value={String(families.length)} detail="Thematische Familien" />
          <Kpi icon={<Users className="h-4 w-4" />} label="Aktive Varianten" value={String(totalActive)} detail={`${rows.length} Varianten insgesamt`} />
          <Kpi icon={<Building2 className="h-4 w-4" />} label="Schulen im Einsatz" value={String(totalSchools)} detail={`${totalAssignedClasses} aktive Klassen mit Zuweisung`} />
          <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Abgeschlossene Missionen" value={String(totalCompletions)} detail="Abschlüsse über alle Szenarien" />
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-950">Szenario-Bibliothek</h2>
              <p className="mt-1 text-sm text-slate-500">Einsatz, Umfang und Status pro Szenario-Familie.</p>
            </div>
            <p className="text-xs text-slate-400">Die Einsatz-KPIs basieren auf Klassenzuweisungen und gespeicherten Missionsabschlüssen.</p>
          </div>

          <div className="space-y-3">
            {families.map((family) => (
              <article key={family.key} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_18px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold tracking-tight text-slate-950">{family.title}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{family.activeVariants} aktive Varianten</span>
                    </div>
                    {family.description && <p className="mt-1.5 max-w-5xl text-sm leading-5 text-slate-500">{family.description}</p>}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="min-w-0">
                    <ScenarioCoverEditor scenarioId={family.variants[0].id} title={family.title} coverImageUrl={family.coverImageUrl} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    <a href={`/scenarios/${family.variants[0].id}`} className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/25 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">
                      <Sparkles className="h-4 w-4" /> Bearbeiten <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <MiniKpi icon={<School className="h-4 w-4" />} tint="violet" label="Schulen" value={String(family.schoolsInUse)} />
                      <MiniKpi icon={<Users className="h-4 w-4" />} tint="blue" label="Aktive Klassen" value={String(family.activeClasses)} />
                      <MiniKpi icon={<GraduationCap className="h-4 w-4" />} tint="cyan" label="Lernende erreicht" value={String(family.learnersReached)} />
                      <MiniKpi icon={<Flag className="h-4 w-4" />} tint="amber" label="Missionen" value={String(family.missionCount)} />
                      <MiniKpi icon={<CheckCircle2 className="h-4 w-4" />} tint="emerald" label="Abschlüsse" value={String(family.completedMissions)} />
                      <MiniKpi icon={<Layers3 className="h-4 w-4" />} tint="violet" label="Altersvarianten" value={String(family.variants.length)} />
                    </div>
                    <p className="px-1 text-xs text-slate-400">{family.contentCount} Inhalte im Szenario</p>
                  </div>
                </div>
              </article>
            ))}
            {families.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <BookOpen className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">Noch kein Szenario vorhanden</p>
                <p className="mt-1 text-xs text-slate-500">Lege dein erstes Szenario über den Button oben an.</p>
              </div>
            )}
          </div>
        </section>


      </div>
    </div>
  );
}

function Kpi({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_18px_rgba(15,23,42,0.025)]">
    <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">{label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">{icon}</span></div>
    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </div>;
}

function MiniKpi({ icon, tint, label, value }: { icon: ReactNode; tint: "violet" | "blue" | "cyan" | "amber" | "emerald"; label: string; value: string }) {
  const tones = {
    violet: "bg-violet-100 text-violet-700",
    blue: "bg-blue-100 text-blue-700",
    cyan: "bg-cyan-100 text-cyan-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.025)] transition hover:border-slate-300">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium leading-4 text-slate-500">{label}</span>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tones[tint]}`}>{icon}</span>
    </div>
    <div className="mt-1 text-xl font-bold tracking-tight text-slate-950">{value}</div>
  </div>;
}
