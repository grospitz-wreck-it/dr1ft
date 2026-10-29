import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";
import { PrintReportButton } from "./PrintReportButton";
import { Activity, AlertCircle, ArrowRight, BookOpen, Brain, Check, CheckCircle2, Circle, ClipboardList, PencilLine, Scale, ShieldCheck, Sparkles, Target, Trophy, Users, Zap } from "lucide-react";

type AnyRow = Record<string, any>;

function avatarUrl(seed: string | null | undefined, size = 160) {
  const styles = ["voxel-art", "adventurer", "adventurer-neutral", "avataaars", "bottts", "fun-emoji", "lorelei", "micah", "miniavs", "personas", "pixel-art-neutral", "thumbs"];
  const value = seed || "dr1ft";
  const separator = value.indexOf("::");
  const candidate = separator > 0 ? value.slice(0, separator) : "";
  const style = styles.includes(candidate) ? candidate : "voxel-art";
  const avatarSeed = separator > 0 && styles.includes(candidate) ? value.slice(separator + 2) || "dr1ft" : value;
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}&size=${size}&animationVariant=medium&borderRadius=18`;
}

const competencyColors = [
  { icon: Sparkles, color: "violet", title: "Informationskompetenz" },
  { icon: Brain, color: "cyan", title: "Kritisches Denken" },
  { icon: ShieldCheck, color: "pink", title: "Selbstschutz" },
  { icon: Users, color: "orange", title: "Soziale Kompetenz" },
  { icon: Scale, color: "green", title: "Medienethik" },
];

function competencyStyle(index: number) {
  return competencyColors[index % competencyColors.length];
}

export default async function StudentReportPage({ params }: { params: { classId: string; studentId: string } }) {
  const supabase = supabaseServerClient();
  const { classId, studentId } = params;
  const [{ data: classInfo }, { data: profile }, { data: assignments }, { data: progressRows }] = await Promise.all([
    supabase.from("class_instances").select("name, school_year, grade_level").eq("id", classId).maybeSingle(),
    supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", studentId).maybeSingle(),
    supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classId),
    supabase.from("user_mission_progress").select("mission_id, status, completed_at").eq("user_id", studentId).eq("class_instance_id", classId),
  ]);

  const scenarioIds = Array.from(new Set((assignments ?? []).map((a: AnyRow) => a.scenario_id).filter(Boolean)));
  const completedMissionIds = Array.from(new Set((progressRows ?? []).map((p: AnyRow) => p.mission_id).filter(Boolean)));
  const [{ data: assignedMissions }, { data: historicalMissions }] = await Promise.all([
    scenarioIds.length
      ? supabase.from("missions").select("id, title, description, scenario_id, status, thumbnail_url").in("scenario_id", scenarioIds)
      : Promise.resolve({ data: [] as AnyRow[] }),
    completedMissionIds.length
      ? supabase.from("missions").select("id, title, description, scenario_id, status, thumbnail_url").in("id", completedMissionIds)
      : Promise.resolve({ data: [] as AnyRow[] }),
  ]);
  const missionMap = new Map<string, AnyRow>();
  [...(assignedMissions ?? []), ...(historicalMissions ?? [])].forEach((m: AnyRow) => missionMap.set(m.id, m));
  const missions = Array.from(missionMap.values()).map((mission: AnyRow) => {
    const progress = (progressRows ?? []).find((row: AnyRow) => row.mission_id === mission.id);
    return { ...mission, progressStatus: progress?.status ?? "not_started", completedAt: progress?.completed_at ?? null };
  }).sort((a: AnyRow, b: AnyRow) => {
    if (a.progressStatus === "completed" && b.progressStatus !== "completed") return -1;
    if (b.progressStatus === "completed" && a.progressStatus !== "completed") return 1;
    return String(a.title).localeCompare(String(b.title), "de");
  });

  const { data: session } = await supabase.auth.getSession();
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`, { method: "POST", headers: { Authorization: `Bearer ${session.session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ classId }), cache: "no-store" });
  const dashboard = await response.json();
  const competencies = (dashboard.studentCompetencyProgress ?? []).filter((r: AnyRow) => r.user_id === studentId && r.competency_id != null);
  const learningEvidence = (dashboard.studentLearningEvidence ?? []).find((r: AnyRow) => r.user_id === studentId) ?? null;
  const missionTotal = missions.length;
  const missionCompleted = missions.filter((m: AnyRow) => m.progressStatus === "completed").length;
  const average = competencies.length ? competencies.reduce((sum: number, row: AnyRow) => sum + Number(row.level ?? 0), 0) / competencies.length : null;
  const assessedRequirements = Number(learningEvidence?.assessed_requirements ?? 0);
  const reportStats = [
    { label: "Challenges beantwortet", value: learningEvidence?.challenge_responses_submitted ?? 0, icon: ClipboardList, tone: "violet" },
    { label: "Geprüfte Anforderungen", value: assessedRequirements > 0 ? assessedRequirements : "—", icon: CheckCircle2, tone: "green" },
    { label: "Erfolgreich erfüllt", value: assessedRequirements > 0 ? Number(learningEvidence?.successful_requirements ?? 0) : "—", icon: Trophy, tone: "orange" },
    { label: "Noch nicht erfüllt", value: assessedRequirements > 0 ? Number(learningEvidence?.not_yet_requirements ?? 0) : "—", icon: AlertCircle, tone: "pink" },
  ];
  const initials = (profile?.display_name || "D").trim().slice(0, 1).toUpperCase();

  return (
    <main className="drift-report min-h-screen px-4 py-6 md:px-8 lg:px-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><a href={`/classes/${classId}`} className="hover:text-violet-700">Klassen</a><span>›</span><span>{classInfo?.name || "Klasse"}</span><span>›</span><span>Schüler:innen</span><span>›</span><span className="font-medium text-slate-700">{profile?.display_name || "Schüler:in"}</span></div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-600">DR1FT / Lernreport</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Lernreport – {profile?.display_name || "Schüler:in"}</h1>
            <p className="mt-2 text-sm text-slate-500">{classInfo?.name || "Klasse"} · Jahrgang {classInfo?.grade_level ?? "—"} · Schuljahr {classInfo?.school_year || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2"><PrintReportButton /><a href={`/classes/${classId}`} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">Zur Klassenübersicht <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" /></a></div>
        </div>

        <section className="drift-profile-banner relative overflow-hidden rounded-[28px] border border-white/80 p-5 shadow-[0_18px_60px_rgba(80,80,170,0.12)] md:p-7">
          <div className="drift-orb drift-orb-one" /><div className="drift-orb drift-orb-two" /><div className="drift-orb drift-orb-three" />
          <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(260px,1.15fr)_repeat(3,minmax(150px,0.6fr))] xl:items-center">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0"><div className="rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 p-[4px] shadow-xl shadow-violet-500/20"><img src={avatarUrl(profile?.avatar_seed || studentId)} alt={`Profilbild von ${profile?.display_name || "Schüler:in"}`} className="h-24 w-24 rounded-full border-4 border-white object-cover md:h-28 md:w-28" /></div><span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-400" /></div>
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Dein Lernprofil</p><h2 className="mt-1 truncate text-3xl font-bold tracking-tight text-slate-950">{profile?.display_name || "Schüler:in"}</h2><p className="mt-1 text-sm font-medium text-slate-600">@{profile?.username || "—"} · {classInfo?.name || "Klasse"}</p><div className="mt-3 inline-flex max-w-xs items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm"><Sparkles aria-hidden="true" className="h-4 w-4 text-violet-600" /> Dein Lernweg entwickelt sich Schritt für Schritt.</div></div>
            </div>
            <div className="drift-stat-card"><span className="drift-stat-icon drift-violet"><Target aria-hidden="true" className="h-5 w-5" /></span><p className="text-xs font-medium text-slate-500">Abgeschlossene Missionen</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{missionCompleted} <span className="text-lg font-semibold text-slate-400">/ {missionTotal}</span></p><div className="drift-progress-track"><div className="drift-progress-fill drift-fill-violet" style={{ width: `${missionTotal ? Math.min(100, missionCompleted / missionTotal * 100) : 0}%` }} /></div></div>
            <div className="drift-stat-card"><span className="drift-stat-icon drift-cyan"><Zap aria-hidden="true" className="h-5 w-5" /></span><p className="text-xs font-medium text-slate-500">Kompetenzniveau</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{average === null ? "—" : average.toFixed(1)} <span className="text-lg font-semibold text-slate-400">/ 5</span></p><div className="drift-progress-track"><div className="drift-progress-fill drift-fill-cyan" style={{ width: `${average === null ? 0 : Math.min(100, average / 5 * 100)}%` }} /></div></div>
            <div className="drift-stat-card"><span className="drift-stat-icon drift-pink"><Activity aria-hidden="true" className="h-5 w-5" /></span><p className="text-xs font-medium text-slate-500">Gesamtbewertung</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{learningEvidence?.assessed_requirements ? Math.round(Number(learningEvidence.successful_requirements ?? 0) / Number(learningEvidence.assessed_requirements) * 100) : "—"}<span className="text-lg font-semibold text-slate-400">{learningEvidence?.assessed_requirements ? "%" : ""}</span></p><div className="drift-progress-track"><div className="drift-progress-fill drift-fill-pink" style={{ width: `${learningEvidence?.assessed_requirements ? Math.min(100, Number(learningEvidence.successful_requirements ?? 0) / Number(learningEvidence.assessed_requirements) * 100) : 0}%` }} /></div></div>
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-1 print:hidden">{["Übersicht", "Missionen", "Kompetenzen", "Challenge-Antworten", "Reflexion", "Verlauf"].map((tab, i) => <a key={tab} href={i === 1 ? "#missions" : i === 2 ? "#competencies" : i === 3 ? "#evidence" : i === 5 ? "#activity" : "#overview"} className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${i === 0 ? "border-transparent bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20" : "border-slate-200/80 bg-white/75 text-slate-600 hover:border-violet-200 hover:text-violet-700"}`}>{tab}</a>)}</nav>

        <div id="overview" className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.9fr)]">
          <div className="space-y-4">
            <section id="missions" className="drift-panel p-5 md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-slate-950">Missionsfortschritt</h2><p className="mt-1 text-sm text-slate-500">Status aller Missionen in dieser Klasseninstanz</p></div><div className="flex flex-wrap gap-3 text-xs text-slate-500"><span><i className="drift-dot bg-emerald-400" />Abgeschlossen</span><span><i className="drift-dot bg-violet-500" />Aktiv</span><span><i className="drift-dot bg-slate-300" />Nicht gestartet</span></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{missions.map((mission: AnyRow, index: number) => <div key={mission.id} className="drift-mission-card"><div className={`drift-mission-thumb drift-thumb-${index % 5}`}>{mission.thumbnail_url ? <img src={mission.thumbnail_url} alt={`Thumbnail: ${mission.title}`} className="h-full w-full object-cover" /> : <div className="drift-thumb-placeholder"><span>{[Sparkles, Target, BookOpen, Zap, ShieldCheck].map((Icon, iconIndex) => Icon && iconIndex === index % 5 ? <Icon key={iconIndex} aria-hidden="true" className="h-8 w-8" /> : null)}</span><small>DR1FT / MISSION</small></div>}<span className={`drift-mission-state ${mission.progressStatus === "completed" ? "state-done" : mission.progressStatus === "in_progress" ? "state-active" : "state-idle"}`}>{mission.progressStatus === "completed" ? <Check aria-hidden="true" className="h-4 w-4" /> : mission.progressStatus === "in_progress" ? <Activity aria-hidden="true" className="h-4 w-4" /> : <Circle aria-hidden="true" className="h-4 w-4" />}</span></div><div className="p-3"><p className="line-clamp-2 text-sm font-bold text-slate-900">{mission.title}</p><p className="mt-1 line-clamp-2 min-h-8 text-xs leading-5 text-slate-500">{mission.description || "Dein nächster Schritt im Lernabenteuer."}</p><div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold"><span className={mission.progressStatus === "completed" ? "text-emerald-600" : mission.progressStatus === "in_progress" ? "text-violet-600" : "text-slate-400"}>{mission.progressStatus === "completed" ? "Abgeschlossen" : mission.progressStatus === "in_progress" ? "In Bearbeitung" : "Noch nicht gestartet"}</span>{mission.completedAt && <span className="text-slate-400">{new Date(mission.completedAt).toLocaleDateString("de-DE")}</span>}</div><div className="drift-progress-track mt-2"><div className={`drift-progress-fill ${mission.progressStatus === "completed" ? "drift-fill-green" : "drift-fill-violet"}`} style={{ width: mission.progressStatus === "completed" ? "100%" : mission.progressStatus === "in_progress" ? "45%" : "0%" }} /></div></div></div>)}</div>
              {missions.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500">Für diese Klasseninstanz sind noch keine Missionen zugeordnet.</div>}
            </section>

            <section id="evidence" className="drift-panel p-5 md:p-6"><h2 className="text-xl font-bold tracking-tight text-slate-950">Challenge- und Lernnachweise</h2><p className="mt-1 text-sm text-slate-500">Antworten und geprüfte Lernanforderungen – transparent und getrennt ausgewiesen.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{reportStats.map((stat) => <div key={stat.label} className="drift-evidence-card"><span className={`drift-stat-icon drift-${stat.tone}`}>{<stat.icon aria-hidden="true" className="h-5 w-5" />}</span><p className="mt-3 text-xs leading-5 text-slate-500">{stat.label}</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{stat.value}</p><p className="mt-1 text-[11px] text-slate-400">ausgewertete Nachweise</p></div>)}</div>{assessedRequirements === 0 && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">Für diese:n Schüler:in liegen aktuell keine validierten Bewertungsereignisse vor. Erfolgs- und Misserfolgswerte sind deshalb nicht verfügbar; gespeicherte Missions- und Kompetenzfortschritte werden davon getrennt angezeigt.</p>}</section>

            <section id="activity" className="drift-panel p-5 md:p-6"><h2 className="text-xl font-bold tracking-tight text-slate-950">Letzte Aktivitäten</h2><p className="mt-1 text-sm text-slate-500">Dokumentierte Missionsabschlüsse in dieser Klasse</p><div className="mt-4 space-y-4">{missions.filter((m: AnyRow) => m.progressStatus === "completed").length ? missions.filter((m: AnyRow) => m.progressStatus === "completed").map((mission: AnyRow) => <div key={mission.id} className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{mission.title} abgeschlossen</p><p className="mt-1 text-xs text-slate-500">Missionsfortschritt gespeichert</p></div><time className="shrink-0 text-xs text-slate-400">{mission.completedAt ? new Date(mission.completedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : ""}</time></div>) : <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">Noch keine abgeschlossenen Missionen dokumentiert.</p>}</div></section>
          </div>

          <aside className="space-y-4">
            <section id="competencies" className="drift-panel p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold tracking-tight text-slate-950">Kompetenzentwicklung</h2><p className="mt-1 text-sm text-slate-500">Aktueller Lernstand</p></div><span className="text-sm font-semibold text-violet-600">Details ↗</span></div><div className="mt-5 space-y-4">{competencies.length ? competencies.map((row: AnyRow, index: number) => { const style = competencyStyle(index); return <div key={row.competency_id} className="flex items-center gap-3"><span className={`drift-competency-icon drift-${style.color}`}>{<style.icon aria-hidden="true" className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-800">{row.competency_title || style.title}</p><p className="shrink-0 text-xs font-semibold text-slate-500">{row.level ?? "—"} / 5</p></div><div className={`drift-progress-track drift-track-${style.color}`}><div className={`drift-progress-fill drift-fill-${style.color}`} style={{ width: `${Math.min(100, Math.max(0, Number(row.level ?? 0) / 5 * 100))}%` }} /></div></div></div>; }) : <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-400">Noch keine Kompetenzwerte gespeichert. Sie erscheinen, sobald bewertbare Lernnachweise vorliegen.</div>}</div></section>

            <section className="drift-panel p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-slate-950">Pädagogische Einschätzung</h2><p className="mt-1 text-sm text-slate-500">Raum für die professionelle Einordnung</p></div><span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><PencilLine aria-hidden="true" className="h-3.5 w-3.5" /> Bearbeiten</span></div><div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/70 p-4"><span className="text-2xl text-violet-500">“</span><p className="mt-1 text-sm leading-6 text-slate-600">Dieser Report zeigt dokumentierte Lernaktivitäten und fachliche Nachweise. Pädagogische Einschätzungen sollten auf beobachteten Leistungen und Gesprächen beruhen.</p></div><div className="mt-4 flex flex-wrap gap-2"><span className="drift-tag">Lernfortschritt</span><span className="drift-tag">Medienkompetenz</span><span className="drift-tag">Reflexion</span></div></section>
          </aside>
        </div>
        <footer className="px-1 pb-4 text-xs text-slate-400 print:hidden">DR1FT · Lernreport · Erstellt aus den verfügbaren Lern- und Kompetenzdaten. Der Report unterstützt pädagogische Reflexion und ersetzt keine individuelle Beurteilung.</footer>
      </div>
    </main>
  );
}
