import type { ReactNode } from "react";
import { BookOpen, ChevronRight, Users, Building2, CheckCircle2, Sparkles } from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

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
    supabase.from("user_mission_progress").select("mission_id, status, completed_at"),
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
    const familyAssignments = (assignments ?? []).filter((item: any) => scenarioIds.has(item.scenario_id));
    const activeAssignedClasses = new Set(familyAssignments.filter((item: any) => {
      const klass: any = classById.get(item.class_id);
      return klass?.is_active !== false;
    }).map((item: any) => item.class_id));
    const schoolIds = new Set(familyAssignments.map((item: any) => {
      const klass: any = classById.get(item.class_id);
      return klass?.school_id;
    }).filter(Boolean));
    const completedMissions = (progress ?? []).filter((item: any) => missionIds.has(item.mission_id) && item.status === "completed").length;

    return {
      key,
      title: first.title?.replace(/\s*[–-]\s*(9–11|12–13|14–15|16–17|18\+).*$/i, "") || first.title,
      description: first.description?.split("\n\nLernziele")[0] || "",
      variants,
      missionCount: familyMissions.length,
      contentCount: familyContent.length,
      activeVariants: variants.filter((variant) => variant.is_active).length,
      activeClasses: activeAssignedClasses.size,
      schoolsInUse: schoolIds.size,
      completedMissions,
    };
  });

  const totalActive = rows.filter((scenario: any) => scenario.is_active).length;
  const totalAssignedClasses = new Set((assignments ?? []).filter((item: any) => {
    const klass: any = classById.get(item.class_id);
    return klass?.is_active !== false;
  }).map((item: any) => item.class_id)).size;
  const totalSchools = new Set((assignments ?? []).map((item: any) => {
    const klass: any = classById.get(item.class_id);
    return klass?.school_id;
  }).filter(Boolean)).size;
  const totalCompletions = (progress ?? []).filter((item: any) => item.status === "completed").length;

  return (
    <div className="space-y-8">
      <div className="max-w-[1440px] space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
              <BookOpen className="h-4 w-4" /> Lernfälle
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">Szenario-Studio</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Bestehende Szenarien verwalten, Einsatz und Lernfortschritt überblicken oder einen neuen Lernfall entwickeln.
            </p>
          </div>
          <a href="/scenarios/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover hover:shadow-md">
            <Sparkles className="h-4 w-4" /> Neues Szenario anlegen
          </a>
        </header>

        <section aria-label="Szenario-Kennzahlen" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={<BookOpen className="h-4 w-4" />} label="Szenario-Themen" value={String(families.length)} detail="Thematische Familien" />
          <Kpi icon={<Users className="h-4 w-4" />} label="Aktive Varianten" value={String(totalActive)} detail={`${rows.length} Varianten insgesamt`} />
          <Kpi icon={<Building2 className="h-4 w-4" />} label="Schulen im Einsatz" value={String(totalSchools)} detail={`${totalAssignedClasses} aktive Klassen mit Zuweisung`} />
          <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Abgeschlossene Missionen" value={String(totalCompletions)} detail="Abschlüsse über alle Szenarien" />
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Szenario-Bibliothek</h2>
              <p className="mt-1 text-sm text-slate-500">Einsatz, Umfang und Status pro Szenario-Familie.</p>
            </div>
            <p className="text-xs text-slate-400">Die Einsatz-KPIs basieren auf Klassenzuweisungen und gespeicherten Missionsabschlüssen.</p>
          </div>

          <div className="space-y-3">
            {families.map((family) => (
              <article key={family.key} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_18px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{family.title}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{family.activeVariants} aktive Varianten</span>
                    </div>
                    {family.description && <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-500">{family.description}</p>}
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MiniKpi label="Schulen" value={String(family.schoolsInUse)} />
                      <MiniKpi label="Aktive Klassen" value={String(family.activeClasses)} />
                      <MiniKpi label="Missionen" value={String(family.missionCount)} />
                      <MiniKpi label="Abschlüsse" value={String(family.completedMissions)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{family.variants.length} Altersvarianten</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{family.contentCount} Inhalte</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:max-w-[440px]">
                    {family.variants.map((variant) => (
                      <a key={variant.id} href={`/scenarios/${variant.id}`} className="group min-w-[112px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-violet-300 hover:bg-violet-50/70">
                        <div className="text-xs font-semibold text-slate-800">{AGE_BANDS.find(([value]) => value === variant.age_band)?.[1] ?? variant.age_rating}</div>
                        <div className="mt-1 text-[11px] text-slate-500">{STATUS[variant.status ?? "draft"] ?? "Entwurf"}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-accent">Bearbeiten <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></div>
                      </a>
                    ))}
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
  return <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_18px_rgba(15,23,42,0.025)]">
    <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">{label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">{icon}</span></div>
    <div className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </div>;
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
    <div className="text-[11px] text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
  </div>;
}
