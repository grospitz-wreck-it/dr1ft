import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";
import { PrintReportButton } from "./PrintReportButton";
import { ScenarioReportFilter } from "./ScenarioReportFilter";
import {
  ArrowUpRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  MessageCircle,
  Shield,
  Sparkles,
  Target,
  ThumbsUp,
  Users,
  XCircle,
} from "lucide-react";

type ScenarioAnswer = {
  response_id: string;
  scenario_id: string;
  scenario_title: string;
  card_id: string;
  card_title: string;
  card_prompt: string | null;
  objective_id: string | null;
  objective_title: string | null;
  selected_option_id: string;
  selected_option_label: string;
  selected_option_feedback: string | null;
  recommended_option_label: string | null;
  outcome: "success" | "partial" | "not_yet";
  occurred_at: string;
};
type ScenarioReport = { id: string; title: string; answers: ScenarioAnswer[] };
type ScenarioMeta = { id: string; title: string; cover_image_url: string | null; learning_cards: any[] | null };
type EvidenceGroup = { key: string; title: string; answers: ScenarioAnswer[]; good: number; needsWork: number; rate: number };
type SocialWeek = { week_start: string; likes_sent: number; comments_sent: number; shares_sent: number; direct_messages_sent: number };
type ActivityTimeRecord = { activity_type: "feed" | "other" | "learning_cards"; scenario_id: string | null; duration_seconds: number };
const SOCIAL_SERIES = [
  { key: "likes_sent", label: "Likes", color: "bg-fuchsia-500", hex: "#d946ef", icon: "♥" },
  { key: "comments_sent", label: "Kommentare", color: "bg-violet-500", hex: "#8b5cf6", icon: "▤" },
  { key: "shares_sent", label: "Geteilt", color: "bg-cyan-500", hex: "#06b6d4", icon: "↗" },
  { key: "direct_messages_sent", label: "Nachrichten", color: "bg-amber-400", hex: "#fbbf24", icon: "✉" },
] as const;

// The assessment pipeline stores partial answers as 0.5 evidence; reflect that
// authored scoring here instead of treating every non-success answer as zero.
function outcomeScore(outcome: ScenarioAnswer["outcome"]) {
  return outcome === "success" ? 1 : outcome === "partial" ? 0.5 : 0;
}

function avatarUrl(seed: string | null | undefined, size = 160) {
  const styles = ["voxel-art", "adventurer", "adventurer-neutral", "avataaars", "bottts", "fun-emoji", "lorelei", "micah", "miniavs", "personas", "pixel-art-neutral", "thumbs"];
  const value = seed || "dr1ft";
  const separator = value.indexOf("::");
  const candidate = separator > 0 ? value.slice(0, separator) : "";
  const style = styles.includes(candidate) ? candidate : "voxel-art";
  const avatarSeed = separator > 0 && styles.includes(candidate) ? value.slice(separator + 2) || "dr1ft" : value;
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}&size=${size}&borderRadius=18`;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function outcomeLabel(outcome: ScenarioAnswer["outcome"]) {
  if (outcome === "success") return "Richtig";
  if (outcome === "partial") return "Teilweise richtig";
  return "Noch nicht erreicht";
}

function outcomeTone(outcome: ScenarioAnswer["outcome"]) {
  if (outcome === "success") return "bg-emerald-100 text-emerald-800";
  if (outcome === "partial") return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-800";
}

function objectiveIcon(title: string) {
  const value = title.toLocaleLowerCase("de");
  if (/grenz|schutz|sicher|recht/.test(value)) return Shield;
  if (/reaktion|kommun|antwort|dialog/.test(value)) return MessageCircle;
  if (/folge|perspekt|betroffen|sozial/.test(value)) return Users;
  return Target;
}

function groupEvidence(answers: ScenarioAnswer[]): EvidenceGroup[] {
  const groups = new Map<string, { title: string; answers: ScenarioAnswer[] }>();
  answers.forEach((answer) => {
    const key = answer.objective_id || answer.objective_title || answer.card_id;
    const item = groups.get(key) ?? { title: answer.objective_title || answer.card_title, answers: [] };
    item.answers.push(answer);
    groups.set(key, item);
  });
  return Array.from(groups, ([key, group]) => {
    const good = group.answers.filter((answer) => answer.outcome === "success").length;
    const rate = group.answers.length
      ? Math.round(group.answers.reduce((sum, answer) => sum + outcomeScore(answer.outcome), 0) / group.answers.length * 100)
      : 0;
    return { key, ...group, good, needsWork: group.answers.length - good, rate };
  }).sort((a, b) => b.needsWork - a.needsWork || b.answers.length - a.answers.length);
}

function ProgressRing({ value }: { value: number }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative grid h-28 w-28 shrink-0 place-items-center sm:h-32 sm:w-32" role="img" aria-label={`${value}% Zielerreichung aus den gespeicherten Antworten`}>
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="8" />
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#20d69a" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
    </svg>
    <div className="text-center text-white"><span className="block text-3xl font-black leading-none">{value}%</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.12em] text-white/60">Zielerreichung</span></div>
  </div>;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return seconds > 0 ? "unter 1 Min." : "0 Min.";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours) return remainder ? `${hours} Std. ${remainder} Min.` : `${hours} Std.`;
  return `${minutes} Min.`;
}

function ActiveTimeOverview({
  seconds,
  scenarioSeconds,
  hasScenario,
  unavailable,
}: {
  seconds: { feed: number; other: number; learning_cards: number };
  scenarioSeconds: number;
  hasScenario: boolean;
  unavailable: boolean;
}) {
  const total = seconds.feed + seconds.other + seconds.learning_cards;
  const categories = [
    { key: "feed", label: "Feed", value: seconds.feed, color: "#22d3ee", text: "text-cyan-700" },
    { key: "other", label: "Abseits des Feeds", value: seconds.other, color: "#e879f9", text: "text-fuchsia-700" },
    { key: "learning_cards", label: "Lernkarten", value: seconds.learning_cards, color: "#fbbf24", text: "text-amber-700" },
  ];
  const rings = [
    { radius: 52, stroke: 8, value: seconds.feed, color: "#22d3ee" },
    { radius: 40, stroke: 7, value: seconds.other, color: "#e879f9" },
    { radius: 29, stroke: 6, value: seconds.learning_cards, color: "#fbbf24" },
  ];

  if (unavailable) return <p className="py-2 text-xs text-slate-500">Zeitübersicht nach dem Datenbank-Update verfügbar.</p>;

  return <section aria-label="Aktive Zeit in DR1FT" className="min-w-0">
    <div className="flex items-center gap-3">
      <div className="relative h-[100px] w-[100px] shrink-0" role="img" aria-label={`Aktive Zeit insgesamt ${formatDuration(total)}: ${categories.map((category) => `${category.label} ${Math.round(total ? category.value / total * 100 : 0)} Prozent`).join(", ")}`}>
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
          {rings.map((ring) => {
            const circumference = 2 * Math.PI * ring.radius;
            const share = total ? Math.min(1, ring.value / total) : 0;
            return <g key={ring.radius}><circle cx="60" cy="60" r={ring.radius} fill="none" stroke="rgba(71,85,105,.14)" strokeWidth={ring.stroke} /><circle cx="60" cy="60" r={ring.radius} fill="none" stroke={ring.color} strokeWidth={ring.stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - share)} /></g>;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center"><strong className="text-[10px] font-black leading-4 text-slate-800">{formatDuration(total)}</strong><span className="mt-0.5 text-[6px] font-bold uppercase tracking-[.12em] text-slate-500">Aktiv gesamt</span></div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2"><h3 className="text-sm font-black text-slate-800">Zeit in DR1FT</h3><span className="text-[9px] text-slate-500">Anteil</span></div>
        <ul className="space-y-1.5">
          {categories.map((category) => {
            const share = total ? Math.round(category.value / total * 100) : 0;
            return <li key={category.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-[10px]">
              <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-slate-600"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />{category.label}</span>
              <span className="text-slate-500 tabular-nums">{formatDuration(category.value)}</span>
              <strong className={`${category.text} tabular-nums`}>{share}%</strong>
            </li>;
          })}
        </ul>
      </div>
    </div>
    {hasScenario && scenarioSeconds > 0 && <p className="mt-1 text-[9px] text-slate-500">Davon diesem Szenario zugeordnet: {formatDuration(scenarioSeconds)}</p>}
  </section>;
}

export default async function StudentReportPage({
  params,
  searchParams = {},
}: {
  params: { classId: string; studentId: string };
  searchParams?: { scenario?: string };
}) {
  const supabase = supabaseServerClient();
  const { classId, studentId } = params;
  const [{ data: { user } }, { data: classInfo }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("class_instances").select("name, school_year, grade_level, school_id").eq("id", classId).maybeSingle(),
    supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", studentId).maybeSingle(),
  ]);

  if (!user) throw new Error("Bitte melde dich erneut an.");
  const { data: schoolMembership } = classInfo?.school_id
    ? await supabase.from("school_memberships").select("role")
        .eq("school_id", classInfo.school_id).eq("user_id", user.id).eq("active", true).maybeSingle()
    : { data: null };
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  const isReportAdmin = Boolean(isPlatformAdmin) || schoolMembership?.role === "school_admin" || schoolMembership?.role === "school_lead";
  if (!isReportAdmin) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-3xl border border-violet-100 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Einzelreports sind nicht freigegeben</h1>
          <p className="mt-2 text-sm text-slate-600">Individuelle Schülerberichte sind ausschließlich für Schuladmins, Schulleitung und Plattformadmins verfügbar.</p>
          <a href={`/classes/${classId}`} className="mt-5 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Zur Klasse</a>
        </section>
      </main>
    );
  }

  const { data: assignedModules, error: assignmentsError } = await supabase
    .from("class_instance_scenario_assignments")
    .select("scenario_id")
    .eq("class_instance_id", classId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (assignmentsError) throw new Error("Die aktiven Szenariozuweisungen konnten nicht geladen werden.");
  const assignedScenarioIds = Array.from(new Set((assignedModules ?? []).map((row: any) => row.scenario_id)));
  const { data: scenarioRows } = assignedScenarioIds.length
    ? await supabase.from("scenarios").select("id, title, cover_image_url, learning_cards").in("id", assignedScenarioIds)
    : { data: [] as ScenarioMeta[] };

  const assignedScenarios = (scenarioRows ?? []) as ScenarioMeta[];
  const requestedScenario = searchParams.scenario || "";
  const selectedScenario = assignedScenarios.find((item) => item.id === requestedScenario) ?? assignedScenarios[0] ?? null;

  if (!selectedScenario) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-10">
        <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
          <div className="bg-[linear-gradient(110deg,#f5f0ff,#effaff)] px-6 py-7">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">DR1FT / LEHRKRAFT</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Keine aktiven DR1FT-Module</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Für diese Klasse sind aktuell keine aktiven Szenarien für die Einzelauswertung vorhanden.</p>
          </div>
          <div className="p-6"><a href={`/classes/${classId}`} className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Zur Klasse</a></div>
        </section>
      </main>
    );
  }

  const [reportResult] = await Promise.all([
    supabase.rpc("get_teacher_student_scenario_report_scoped_v1", {
      p_class_id: classId,
      p_student_id: studentId,
      p_scenario_id: selectedScenario.id,
    }),
  ]);

  const answers = (reportResult.data ?? []) as ScenarioAnswer[];
  const socialWeeks: SocialWeek[] = [];
  const activityTimeRecords: ActivityTimeRecord[] = [];
  const socialResult = { error: true };
  const activityTimeResult = { error: true };
  const scenarioMeta = new Map(assignedScenarios.map((scenario) => [scenario.id, scenario]));
  const reports: ScenarioReport[] = assignedScenarios.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    answers: scenario.id === selectedScenario.id ? answers : [],
  }));
  const selectedReport = reports.find((report) => report.id === selectedScenario.id) ?? null;
  const studentName = profile?.display_name || "Schüler:in";
  const selectedAnswers = selectedReport?.answers ?? [];
  const overallGroups = groupEvidence(selectedAnswers);
  const objectiveGroups = groupEvidence(selectedAnswers);
  const allSuccess = selectedAnswers.filter((answer) => answer.outcome === "success").length;
  const allPartial = selectedAnswers.filter((answer) => answer.outcome === "partial").length;
  const allNeedsWork = selectedAnswers.filter((answer) => answer.outcome === "not_yet").length;
  const successCount = allSuccess;
  const partialCount = allPartial;
  const notYetCount = allNeedsWork;
  const evidencedStrengths = objectiveGroups.filter((group) => group.answers.length >= 2 && group.needsWork === 0);
  const learningFocus = objectiveGroups.filter((group) => group.needsWork > 0).slice(0, 3);
  const latestFocusAnswer = learningFocus[0]?.answers.find((answer) => answer.outcome !== "success");
  const journeyError = reportResult.error?.message ?? null;
  const scenarioTitle = selectedReport?.title || selectedScenario.title;
  const socialTotals = { likes_sent: 0, comments_sent: 0, shares_sent: 0, direct_messages_sent: 0 };
  const socialTotal = 0;
  const socialWeekMax = 1;
  const socialDonutStops = "";
  const activitySeconds = { feed: 0, other: 0, learning_cards: 0 };
  const selectedScenarioSeconds = 0;


  return <main className="student-report-page min-h-screen bg-[radial-gradient(ellipse_at_12%_0%,#f1eaff_0%,transparent_30%),radial-gradient(ellipse_at_92%_20%,#e6f7ff_0%,transparent_25%),linear-gradient(135deg,#f7f7fc_0%,#f0f1fb_52%,#fbf5ff_100%)] px-3 py-4 text-slate-900 sm:px-5 sm:py-5 md:px-8 print:bg-white print:px-0 print:py-0">
    <div className="student-report-print-root mx-auto max-w-[1380px] space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400"><a href={`/classes/${classId}`} className="hover:text-violet-700">Klassen</a><span>›</span><span>{classInfo?.name || "Klasse"}</span><span>›</span><span>Schüler:innen</span><span>›</span><span className="font-medium text-slate-700">{studentName}</span></div>
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-violet-600">✦ DR1FT / Learning Intelligence</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-.045em] text-slate-950 sm:text-4xl">Lernreport <span className="text-violet-600">— {studentName}</span></h1>
          <p className="mt-1 text-sm text-slate-500">{classInfo?.name || "Klasse"} · Jahrgang {classInfo?.grade_level ?? "—"} · Schuljahr {classInfo?.school_year || "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-violet-100 bg-white/85 p-1.5 shadow-sm sm:gap-2">
          <nav aria-label="Reportbereiche" className="flex rounded-xl bg-violet-50/80 p-0.5 text-[10px] font-bold sm:text-[11px]">
            <a href="#gesamtfortschritt" className="rounded-lg px-2.5 py-2 text-slate-500 transition hover:bg-white hover:text-violet-700">Überblick</a>
            <a href="#drift-reports" className="rounded-lg bg-violet-600 px-2.5 py-2 text-white shadow-sm">Szenario</a>
          </nav>
          <ScenarioReportFilter action={`/classes/${classId}/reports/${studentId}`} selectedScenario={selectedReport?.id ?? ""} reports={reports.map(({ id, title }) => ({ id, title }))} />
          <span className="hidden h-6 w-px bg-slate-200 sm:block" />
          <PrintReportButton />
          <a href={`/classes/${classId}`} aria-label="Zur Klassenübersicht" title="Zur Klassenübersicht" className="rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] font-bold text-white transition hover:bg-slate-800 sm:text-[11px]">Klasse ↗</a>
        </div>
      </header>

      <div className="student-report-print-content space-y-4">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-[#171d35] text-white shadow-[0_18px_50px_rgba(82,45,150,.22)] ring-1 ring-white/80 print:rounded-none print:shadow-none">
        {selectedReport && scenarioMeta.get(selectedReport.id)?.cover_image_url && <img src={scenarioMeta.get(selectedReport.id)?.cover_image_url ?? ""} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35" />}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_45%_46%,rgba(217,70,239,.48),transparent_37%),radial-gradient(ellipse_at_75%_5%,rgba(99,102,241,.32),transparent_31%),linear-gradient(100deg,rgba(34,24,65,.88)_0%,rgba(28,28,62,.84)_46%,rgba(15,39,62,.90)_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[46%] top-5 -z-0 hidden h-12 w-12 rotate-[-9deg] place-items-center rounded-2xl border border-white/20 bg-fuchsia-400/20 text-2xl shadow-[0_0_35px_rgba(232,121,249,.35)] lg:grid">💬</div>
        <div aria-hidden="true" className="pointer-events-none absolute left-[51%] top-[4.5rem] -z-0 hidden rotate-[8deg] rounded-xl border border-white/20 bg-violet-300/20 px-3 py-2 text-lg shadow-lg lg:block">✦</div>
        <div className="absolute -right-16 -top-44 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div className="absolute right-20 -top-28 -z-10 h-[27rem] w-[27rem] rounded-full border border-white/10" />
        <div className="relative z-10 grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(230px,.88fr)_minmax(280px,1.2fr)_auto_minmax(170px,.7fr)] lg:items-center lg:gap-5 lg:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <img src={avatarUrl(profile?.avatar_seed || studentId)} alt="" className="h-[76px] w-[76px] shrink-0 rounded-[22px] border-4 border-white/25 bg-violet-200 object-cover shadow-lg sm:h-[88px] sm:w-[88px]" />
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.23em] text-violet-300">Dein Lernprofil</p><h2 className="mt-1 truncate text-2xl font-black sm:text-3xl">{studentName}</h2><p className="mt-1 text-xs text-white/60">@{profile?.username || "—"} · {classInfo?.name || "Klasse"}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200"><CheckCircle2 className="h-3 w-3" />{answers.length ? "Antworten ausgewertet" : "Noch keine Antworten"}</span></div>
          </div>
          <div className="min-w-0 border-y border-white/10 py-5 lg:border-y-0 lg:border-l lg:py-2 lg:pl-7">
            <p className="text-[9px] font-black uppercase tracking-[.25em] text-violet-300">DR1FT / Szenario</p>
            <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight sm:text-[27px]">{scenarioTitle}</h2>
            <p className="mt-2 max-w-lg text-xs leading-5 text-white/60">{selectedReport ? "Deine Antworten, Lernziele und nächste Übungsschritte in dieser DR1FT." : "Sobald du Aufgaben bearbeitest, erscheint hier dein persönlicher Szenario-Report."}</p>
          </div>
          <div className="flex justify-center"><div className="rounded-full bg-fuchsia-400/10 p-1 shadow-[0_0_36px_rgba(217,70,239,.18)]"><ProgressRing value={Math.round(selectedAnswers.reduce((sum, answer) => sum + outcomeScore(answer.outcome), 0) / Math.max(1, selectedAnswers.length) * 100)} /></div></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4 lg:border-l lg:border-white/10 lg:pl-6">
            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Ausgewertete Aufgaben</p><p className="mt-1 text-2xl font-black">{selectedAnswers.length}</p><p className="text-[10px] text-white/55">zuletzt {selectedAnswers[0] ? dateLabel(selectedAnswers[0].occurred_at) : "noch keine Antwort"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Noch zu üben</p><p className="mt-1 text-2xl font-black text-amber-200">{partialCount + notYetCount}</p><p className="text-[10px] text-white/55">teilweise oder noch nicht erreicht</p></div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-white/[.025] px-4 py-3 sm:px-6"><div className="mb-2 flex items-center justify-between gap-2 text-[10px]"><span className="font-bold text-white/80">Deine Antwortverteilung</span><span className="text-white/45">{selectedAnswers.length} Antworten</span></div><div className="flex h-2 overflow-hidden rounded-full bg-white/10"><span className="bg-emerald-400" style={{ width: `${percent(successCount, selectedAnswers.length)}%` }} /><span className="bg-amber-300" style={{ width: `${percent(partialCount, selectedAnswers.length)}%` }} /><span className="bg-rose-400" style={{ width: `${percent(notYetCount, selectedAnswers.length)}%` }} /></div><div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[9px] text-white/60"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />{successCount} vollständig</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-300" />{partialCount} teilweise</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-400" />{notYetCount} noch nicht erreicht</span></div></div>
      </section>

      <section id="drift-reports" className="scroll-mt-5 overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_12px_38px_rgba(56,65,120,.08)] print:shadow-none">
        <div className="bg-[linear-gradient(110deg,#f1edff_0%,#eef4ff_58%,#f7f0ff_100%)] px-5 py-3 text-slate-900 sm:px-6 lg:px-7">
          <p className="text-[9px] font-black uppercase tracking-[.25em] text-violet-700">DR1FT / Szenario-Report</p>
          <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.82fr)] lg:items-center">
            <div className="min-w-0">
              <p className="mb-2 text-[10px] text-slate-500">{selectedAnswers.length} ausgewertete Aufgaben{selectedAnswers[0] ? ` · zuletzt bearbeitet ${dateLabel(selectedAnswers[0].occurred_at)}` : ""}</p>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5"><p className="text-lg font-black leading-5 text-emerald-700">{successCount}</p><p className="text-[9px] font-semibold text-emerald-800/75">Vollständig</p></div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5"><p className="text-lg font-black leading-5 text-amber-700">{partialCount}</p><p className="text-[9px] font-semibold text-amber-800/75">Teilweise</p></div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5"><p className="text-lg font-black leading-5 text-rose-700">{notYetCount}</p><p className="text-[9px] font-semibold text-rose-800/75">Noch nicht erreicht</p></div>
              </div>
            </div>
            <ActiveTimeOverview seconds={activitySeconds} scenarioSeconds={selectedScenarioSeconds} hasScenario={Boolean(selectedReport)} unavailable={true} />
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.32fr)_minmax(310px,.78fr)]">
          <div className="space-y-5 p-4 sm:p-5 lg:p-6">
            <section aria-labelledby="learning-goals-heading">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Target className="h-6 w-6" /></span><div><h3 id="learning-goals-heading" className="text-xl font-black tracking-tight sm:text-2xl">Deine Lernziele in dieser DR1FT</h3><p className="mt-0.5 text-xs text-slate-500">Was du schon sicher kannst – und woran du weiterarbeiten kannst.</p></div></div>
              {objectiveGroups.length ? <div className="space-y-2.5">{objectiveGroups.map((group) => {
                const Icon = objectiveIcon(group.title);
                return <details key={group.key} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white open:border-violet-200 open:shadow-[0_8px_24px_rgba(82,62,150,.08)]">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2.5 p-3 sm:p-3.5 [&::-webkit-details-marker]:hidden">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm ${group.needsWork ? "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700" : "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700"}`}>{group.needsWork ? <CircleHelp className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-sm"><Icon className="h-5 w-5" /></span>
                    <span className="min-w-[130px] flex-1"><strong className="block text-sm text-slate-900">{group.title}</strong><small className="text-[10px] text-slate-400">{group.answers.length} zugehörige Aufgabe{group.answers.length === 1 ? "" : "n"}</small></span>
                    <span className="w-[110px] shrink-0"><span className="block text-right text-sm font-black text-slate-800">{group.rate}%</span><span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${group.needsWork ? "bg-gradient-to-r from-amber-400 to-yellow-300" : "bg-gradient-to-r from-emerald-500 to-teal-400"}`} style={{ width: `${group.rate}%` }} /></span><span className="mt-1 block text-right text-[10px] text-slate-500">{group.good} / {group.answers.length} vollständig</span></span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-4 border-t border-amber-100 bg-gradient-to-r from-amber-50/80 to-orange-50/70 p-4 sm:grid-cols-2 sm:p-5">
                    <div><p className="flex items-center gap-2 text-xs font-black text-amber-900"><XCircle className="h-4 w-4" />Hier lohnt sich noch Übung</p><ul className="mt-2 space-y-2 text-xs leading-5 text-amber-950">{group.answers.filter((answer) => answer.outcome !== "success").map((answer) => <li key={answer.response_id} className="flex gap-2"><span className="text-amber-600">•</span><span>{answer.selected_option_feedback || `Deine Antwort „${answer.selected_option_label}“ wurde teilweise gewertet.`}</span></li>)}{!group.needsWork && <li>Für dieses Lernziel sind alle gespeicherten Antworten vollständig.</li>}</ul></div>
                    <div className="border-t border-amber-200 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><p className="flex items-center gap-2 text-xs font-black text-emerald-800"><Check className="h-4 w-4" />So kommst du weiter</p><ul className="mt-2 space-y-2 text-xs leading-5 text-emerald-950">{group.answers.filter((answer) => answer.outcome !== "success").map((answer) => <li key={answer.response_id} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /><span>{answer.recommended_option_label || "Für diese Aufgabe ist noch keine vollständige Musterantwort hinterlegt."}</span></li>)}{!group.needsWork && <li>Alle dokumentierten Antworten erfüllen dieses Lernziel.</li>}</ul></div>
                  </div>
                </details>;
              })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center"><p className="text-sm font-semibold text-slate-700">Noch keine ausgewerteten Lernziele</p><p className="mt-1 text-xs text-slate-500">Sobald Antworten gespeichert sind, erscheinen sie hier.</p></div>}
            </section>

            <section aria-labelledby="answered-tasks-heading" className="border-t border-slate-100 pt-6">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><BookOpenCheck className="h-6 w-6" /></span><div><h3 id="answered-tasks-heading" className="text-xl font-black tracking-tight sm:text-2xl">Deine bearbeiteten Aufgaben</h3><p className="mt-0.5 text-xs text-slate-500">Deine Antwort und die dazu hinterlegten Lernhinweise.</p></div></div>
              {selectedAnswers.length ? <div className={`grid gap-3 ${selectedAnswers.length === 1 ? "grid-cols-1" : "lg:grid-cols-2"}`}>{selectedAnswers.map((answer) => {
                const Icon = objectiveIcon(answer.objective_title || answer.card_title);
                return <article key={answer.response_id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_5px_18px_rgba(34,30,80,.035)] sm:p-5">
                  <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span><div className="min-w-0"><h4 className="font-black leading-5 text-slate-900">{answer.card_title}</h4>{answer.objective_title && <p className="mt-1 text-[9px] font-black uppercase tracking-[.17em] text-violet-600">{answer.objective_title}</p>}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${outcomeTone(answer.outcome)}`}>{outcomeLabel(answer.outcome)}</span></div>
                  {answer.card_prompt && <p className="mt-4 text-sm leading-6 text-slate-600">{answer.card_prompt}</p>}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3.5"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Deine gewählte Antwort</p><p className="mt-1.5 text-sm font-semibold leading-5 text-slate-900">{answer.selected_option_label}</p></div>
                  {answer.outcome !== "success" && <div className="mt-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5"><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-amber-800"><ArrowUpRight className="h-4 w-4" />Was dir noch gefehlt hat</p>{answer.selected_option_feedback ? <p className="mt-2 text-sm leading-6 text-amber-950">{answer.selected_option_feedback}</p> : <p className="mt-2 text-xs leading-5 text-amber-950">Für diese Antwort liegt keine zusätzliche redaktionelle Erklärung vor.</p>}{answer.recommended_option_label && <p className="mt-2 border-t border-amber-200 pt-2 text-xs font-semibold leading-5 text-amber-950">Für die volle Punktzahl: {answer.recommended_option_label}</p>}</div>}
                  <p className="mt-3 text-[10px] text-slate-400">Bearbeitet am {dateLabel(answer.occurred_at)}</p>
                </article>;
              })}</div> : <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">In dieser DR1FT wurden noch keine Antworten gespeichert.</p>}
            </section>
          </div>

          <aside className="space-y-3 border-t border-violet-100 bg-[linear-gradient(165deg,#fbfaff,#f7f7ff)] p-4 sm:p-5 xl:border-l xl:border-t-0 xl:p-5">
            <section className="rounded-2xl border border-indigo-100 bg-[#f6f8ff] p-4 sm:p-5"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 shrink-0 text-indigo-600" /><h3 className="text-base font-black text-slate-900">Kurzfazit</h3></div><p className="mt-3 text-sm leading-6 text-slate-700">{selectedAnswers.length ? `${studentName} hat in dieser DR1FT ${selectedAnswers.length} Aufgabe${selectedAnswers.length === 1 ? "" : "n"} beantwortet. ${successCount} Antwort${successCount === 1 ? "" : "en"} war${successCount === 1 ? "" : "en"} vollständig, ${partialCount + notYetCount} ${partialCount + notYetCount === 1 ? "braucht" : "brauchen"} noch Übung.` : "Für diese DR1FT liegen noch keine ausgewerteten Antworten vor."}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">Das Fazit fasst gespeicherte Antworten zusammen. Es ersetzt keine pädagogische Beurteilung.</p></section>

            <section className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><ThumbsUp className="h-5 w-5 shrink-0 text-emerald-700" /><h3 className="text-base font-black text-slate-900">Deine Stärken</h3></div>{evidencedStrengths.length ? <ul className="mt-3 space-y-2.5 text-sm leading-5 text-slate-700">{evidencedStrengths.map((group) => <li key={group.key} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>{group.title}</strong><span className="block text-xs text-slate-500">{group.answers.length} Antworten – alle vollständig</span></span></li>)}</ul> : <p className="mt-3 text-xs leading-5 text-slate-500">Noch keine mehrfach bestätigte Stärke. Dafür braucht es mindestens zwei vollständig bewertete Antworten zum selben Lernziel.</p>}</section>

            <section className="rounded-2xl border border-amber-200 bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><Target className="h-5 w-5 shrink-0 text-amber-700" /><h3 className="text-base font-black text-slate-900">Lernfelder mit Übungsbedarf</h3></div>{learningFocus.length ? <ul className="mt-3 space-y-3 text-sm leading-5 text-slate-700">{learningFocus.map((group) => <li key={group.key}><strong>{group.title}</strong><span className="block text-xs text-slate-500">{group.needsWork} von {group.answers.length} Antworten noch nicht vollständig</span></li>)}</ul> : <p className="mt-3 text-xs leading-5 text-slate-500">In den bisher gespeicherten Antworten ist kein offenes Lernfeld markiert.</p>}</section>

            <section className="rounded-2xl border border-violet-200 bg-[linear-gradient(140deg,#f5efff,#fff_70%)] p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Target className="h-5 w-5" /></span><h3 className="text-base font-black text-slate-900">Dein nächster Lernschritt</h3></div>{latestFocusAnswer ? <div className="mt-3 rounded-xl border border-violet-100 bg-white/80 p-3.5"><p className="text-sm font-bold text-violet-900">{learningFocus[0].title}</p><p className="mt-1 text-xs leading-5 text-slate-600">Greif die Aufgabe „{latestFocusAnswer.card_title}“ noch einmal auf. {latestFocusAnswer.recommended_option_label ? `Bei der vollständigen Antwort hilft: ${latestFocusAnswer.recommended_option_label}` : "Vergleiche deine Antwort mit den redaktionellen Hinweisen in der Aufgabe."}</p></div> : selectedAnswers.length ? <p className="mt-3 text-xs leading-5 text-slate-600">Alle bisher ausgewerteten Antworten sind vollständig. Weitere Aufgaben können zeigen, ob du die Erkenntnisse auch in neuen Situationen anwendest.</p> : <p className="mt-3 text-xs leading-5 text-slate-600">Mit der ersten bearbeiteten Aufgabe erscheinen hier passende nächste Schritte.</p>}</section>
          </aside>
        </div>
        {journeyError && <p className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 sm:m-7">Der Report konnte nicht geladen werden. Bitte die zugehörige Supabase-Migration prüfen. Technischer Hinweis: {journeyError}</p>}
      </section>
      </div>

      <section hidden aria-labelledby="social-pulse-heading" className="overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-[0_12px_38px_rgba(56,65,120,.07)] print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[linear-gradient(105deg,#f5efff,#f1faff_62%,#fff8e7)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-xl shadow-sm">💬</span><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Dein DR1FT-Moment</p><h2 id="social-pulse-heading" className="text-lg font-black text-slate-950 sm:text-xl">So warst du im Feed dabei</h2></div></div>
          <span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-slate-500">Letzte 6 Wochen</span>
        </div>
        {true ? <p className="p-5 text-sm text-slate-500">Feed-Aktivität ist nicht Bestandteil dieses modulbezogenen Reports.</p> : <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SOCIAL_SERIES.map((item) => <div key={item.key} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${item.color} text-sm font-black text-white shadow-sm`}>{item.icon}</span><span><strong className="block text-lg font-black leading-5 text-slate-900">{socialTotals[item.key]}</strong><span className="text-[10px] font-medium text-slate-500">{item.label}</span></span></div>)}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(230px,.65fr)]">
            <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black text-slate-800">Deine Aktivitäten pro Woche</h3><span className="text-[9px] text-slate-400">Anzahl</span></div>
              <div className="flex h-[92px] items-end gap-2 border-b border-slate-100 pb-1 sm:gap-3" role="img" aria-label="Gestapelte Balken: Likes, Kommentare, geteilte Beiträge und gesendete Nachrichten je Woche">
                {socialWeeks.map((week) => {
                  const weekTotal = SOCIAL_SERIES.reduce((sum, { key }) => sum + Number(week[key] ?? 0), 0);
                  const weekLabel = new Date(`${week.week_start}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                  return <div key={week.week_start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><div className="flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-t-md" style={{ height: weekTotal ? `${Math.max(7, weekTotal / socialWeekMax * 66)}px` : "3px" }} title={`${weekLabel}: ${weekTotal} Aktionen`}>{SOCIAL_SERIES.map(({ key, color }) => Number(week[key] ?? 0) > 0 && <span key={key} className={`${color} min-h-[2px] shrink-0`} style={{ height: `${Number(week[key]) / weekTotal * 100}%` }} />)}</div><span className="text-[9px] tabular-nums text-slate-400">{weekLabel}</span></div>;
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{SOCIAL_SERIES.map((item) => <span key={item.key} className="inline-flex items-center gap-1 text-[9px] text-slate-500"><i className={`h-2 w-2 rounded-full ${item.color}`} />{item.label}</span>)}</div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#fbfaff] p-3.5 sm:p-4">
              <div className="relative grid h-[104px] w-[104px] shrink-0 place-items-center rounded-full" style={{ background: socialTotal ? `conic-gradient(${socialDonutStops})` : "conic-gradient(#e9e7f1 0% 100%)" }} role="img" aria-label={`Verteilung von ${socialTotal} gespeicherten Feed-Aktionen und Nachrichten`}><div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-center shadow-inner"><span><strong className="block text-xl font-black leading-5 text-slate-900">{socialTotal}</strong><small className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Aktionen</small></span></div></div>
              <div className="min-w-0 flex-1"><h3 className="mb-2 text-xs font-black text-slate-800">Dein Interaktionsmix</h3><ul className="space-y-1.5">{SOCIAL_SERIES.map((item) => <li key={item.key} className="flex items-center justify-between gap-2 text-[10px]"><span className="inline-flex min-w-0 items-center gap-1.5 text-slate-500"><i className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />{item.label}</span><strong className="text-slate-800">{socialTotals[item.key]}</strong></li>)}</ul></div>
            </div>
          </div>
          <p className="mt-3 text-[9px] leading-4 text-slate-400">Feed-Aktivität ist keine Lernbewertung. Bei Direktnachrichten wird nur die Anzahl gezählt – keine Inhalte.</p>
        </div>}
      </section>

      <section id="gesamtfortschritt" className="scroll-mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 print:hidden">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><BookOpenCheck className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-indigo-600">Überblick</p><h2 className="text-xl font-black text-slate-900 sm:text-2xl">Deine Antworten über alle DR1FTs</h2></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black text-slate-900">{reports.length}</p><p className="mt-1 text-xs font-medium text-slate-600">Szenarien bearbeitet</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-2xl font-black text-emerald-800">{allSuccess}</p><p className="mt-1 text-xs font-medium text-emerald-800">Antworten vollständig</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-2xl font-black text-amber-800">{allPartial}</p><p className="mt-1 text-xs font-medium text-amber-800">Antworten teilweise richtig</p></div><div className="rounded-xl bg-rose-50 p-4"><p className="text-2xl font-black text-rose-800">{allNeedsWork}</p><p className="mt-1 text-xs font-medium text-rose-800">Antworten noch nicht erreicht</p></div></div>
        <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-black text-slate-900">Lernziele mit mehreren Nachweisen</h3>{overallGroups.some((group) => group.answers.length >= 2) ? <div className="mt-3 space-y-3">{overallGroups.filter((group) => group.answers.length >= 2).map((group) => <div key={group.key} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-semibold text-slate-800">{group.title}</p><p className="text-xs text-slate-500">{group.answers.length} Antworten · {group.good} vollständig · {group.needsWork} mit Übungsbedarf</p></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 sm:w-40"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${group.rate}%` }} /></div></div>)}</div> : <p className="mt-2 text-xs leading-5 text-slate-500">Für einen belastbaren Lernverlauf fehlen noch wiederholte Antworten zu denselben Lernzielen. Deshalb zeigen wir keine Kompetenzkurve.</p>}</div>
      </section>

      <footer className="pb-4 text-center text-[10px] tracking-wide text-slate-400 print:hidden">DR1FT · Learning Intelligence · Beruht auf gespeicherten Antworten und redaktionell hinterlegten Hinweisen. Keine geschätzten Punktwerte oder Klassenvergleiche.</footer>
    </div>
  </main>;
}
