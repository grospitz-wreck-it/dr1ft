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
    return { key, ...group, good, needsWork: group.answers.length - good, rate: percent(good, group.answers.length) };
  }).sort((a, b) => b.needsWork - a.needsWork || b.answers.length - a.answers.length);
}

function ProgressRing({ value }: { value: number }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative grid h-32 w-32 shrink-0 place-items-center" role="img" aria-label={`${value}% der ausgewerteten Antworten vollständig` }>
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="8" />
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#20d69a" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
    </svg>
    <div className="text-center text-white"><span className="block text-3xl font-black leading-none">{value}%</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.12em] text-white/60">Ziel erreicht</span></div>
  </div>;
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
  const [{ data: classInfo }, { data: profile }, reportResult] = await Promise.all([
    supabase.from("class_instances").select("name, school_year, grade_level").eq("id", classId).maybeSingle(),
    supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", studentId).maybeSingle(),
    supabase.rpc("get_teacher_student_scenario_report_v1", { p_class_id: classId, p_student_id: studentId }),
  ]);

  const answers = (reportResult.data ?? []) as ScenarioAnswer[];
  const scenarioIds = Array.from(new Set(answers.map((answer) => answer.scenario_id)));
  let scenarioRows: ScenarioMeta[] = [];
  if (scenarioIds.length) {
    const result = await supabase.from("scenarios").select("id, title, cover_image_url, learning_cards").in("id", scenarioIds);
    scenarioRows = (result.data ?? []) as ScenarioMeta[];
  }
  const scenarioMeta = new Map(scenarioRows.map((scenario) => [scenario.id, scenario]));
  const grouped = new Map<string, ScenarioReport>();
  for (const answer of answers) {
    const report = grouped.get(answer.scenario_id) ?? { id: answer.scenario_id, title: answer.scenario_title, answers: [] };
    report.answers.push(answer);
    grouped.set(answer.scenario_id, report);
  }
  const reports = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.answers[0].occurred_at).getTime() - new Date(a.answers[0].occurred_at).getTime(),
  );
  const requestedScenario = searchParams.scenario || "";
  const selectedReport = reports.find((report) => report.id === requestedScenario) ?? reports[0] ?? null;
  const studentName = profile?.display_name || "Schüler:in";
  const selectedAnswers = selectedReport?.answers ?? [];
  const overallGroups = groupEvidence(answers);
  const objectiveGroups = groupEvidence(selectedAnswers);
  const allSuccess = answers.filter((answer) => answer.outcome === "success").length;
  const allPartial = answers.filter((answer) => answer.outcome === "partial").length;
  const allNeedsWork = answers.filter((answer) => answer.outcome === "not_yet").length;
  const successCount = selectedAnswers.filter((answer) => answer.outcome === "success").length;
  const partialCount = selectedAnswers.filter((answer) => answer.outcome === "partial").length;
  const notYetCount = selectedAnswers.filter((answer) => answer.outcome === "not_yet").length;
  const successRate = percent(successCount, selectedAnswers.length);
  const evidencedStrengths = objectiveGroups.filter((group) => group.answers.length >= 2 && group.needsWork === 0);
  const learningFocus = objectiveGroups.filter((group) => group.needsWork > 0).slice(0, 3);
  const latestFocusAnswer = learningFocus[0]?.answers.find((answer) => answer.outcome !== "success");
  const journeyError = reportResult.error?.message ?? null;
  const scenarioTitle = selectedReport?.title || "Dein Lernweg beginnt hier";

  return <main className="min-h-screen bg-[linear-gradient(135deg,#f6f7fc_0%,#f0f1fb_52%,#f8f4fc_100%)] px-3 py-4 text-slate-900 sm:px-5 sm:py-6 md:px-8 print:bg-white print:px-0 print:py-0">
    <div className="mx-auto max-w-[1440px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400"><a href={`/classes/${classId}`} className="hover:text-violet-700">Klassen</a><span>›</span><span>{classInfo?.name || "Klasse"}</span><span>›</span><span>Schüler:innen</span><span>›</span><span className="font-medium text-slate-700">{studentName}</span></div>
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-violet-600">DR1FT / Learning Intelligence</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-.045em] text-slate-950 sm:text-4xl">Lernreport <span className="text-violet-600">— {studentName}</span></h1>
          <p className="mt-1 text-sm text-slate-500">{classInfo?.name || "Klasse"} · Jahrgang {classInfo?.grade_level ?? "—"} · Schuljahr {classInfo?.school_year || "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Reportbereiche" className="flex rounded-full border border-violet-200 bg-white p-1 text-xs font-bold shadow-sm">
            <a href="#gesamtfortschritt" className="rounded-full px-3 py-2 text-slate-600 transition hover:bg-violet-50">Gesamtfortschritt</a>
            <a href="#drift-reports" className="rounded-full bg-violet-600 px-4 py-2 text-white shadow-sm">DR1FT-Report</a>
          </nav>
          <ScenarioReportFilter action={`/classes/${classId}/reports/${studentId}`} selectedScenario={selectedReport?.id ?? ""} reports={reports.map(({ id, title }) => ({ id, title }))} />
          <PrintReportButton />
          <a href={`/classes/${classId}`} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800">Klassenübersicht ↗</a>
        </div>
      </header>

      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#171d35] text-white shadow-[0_18px_50px_rgba(35,29,78,.20)] print:rounded-none print:shadow-none">
        {selectedReport && scenarioMeta.get(selectedReport.id)?.cover_image_url && <img src={scenarioMeta.get(selectedReport.id)?.cover_image_url ?? ""} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35" />}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_47%_45%,rgba(168,85,247,.42),transparent_34%),linear-gradient(100deg,#211d45_0%,rgba(27,27,58,.96)_44%,rgba(19,37,59,.92)_100%)]" />
        <div className="absolute -right-16 -top-44 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div className="absolute right-20 -top-28 -z-10 h-[27rem] w-[27rem] rounded-full border border-white/10" />
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(250px,.9fr)_minmax(300px,1.2fr)_auto_minmax(190px,.75fr)] lg:items-center lg:gap-7 lg:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <img src={avatarUrl(profile?.avatar_seed || studentId)} alt="" className="h-[76px] w-[76px] shrink-0 rounded-[22px] border-4 border-white/25 bg-violet-200 object-cover shadow-lg sm:h-[88px] sm:w-[88px]" />
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.23em] text-violet-300">Dein Lernprofil</p><h2 className="mt-1 truncate text-2xl font-black sm:text-3xl">{studentName}</h2><p className="mt-1 text-xs text-white/60">@{profile?.username || "—"} · {classInfo?.name || "Klasse"}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200"><CheckCircle2 className="h-3 w-3" />{answers.length ? "Antworten ausgewertet" : "Noch keine Antworten"}</span></div>
          </div>
          <div className="min-w-0 border-y border-white/10 py-5 lg:border-y-0 lg:border-l lg:py-2 lg:pl-7">
            <p className="text-[9px] font-black uppercase tracking-[.25em] text-violet-300">DR1FT / Szenario</p>
            <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight sm:text-[27px]">{scenarioTitle}</h2>
            <p className="mt-2 max-w-lg text-xs leading-5 text-white/60">{selectedReport ? "Deine Antworten, Lernziele und nächste Übungsschritte in dieser DR1FT." : "Sobald du Aufgaben bearbeitest, erscheint hier dein persönlicher Szenario-Report."}</p>
          </div>
          <div className="flex justify-center"><ProgressRing value={successRate} /></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4 lg:border-l lg:border-white/10 lg:pl-6">
            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Ausgewertete Aufgaben</p><p className="mt-1 text-2xl font-black">{selectedAnswers.length}</p><p className="text-[10px] text-white/55">zuletzt {selectedAnswers[0] ? dateLabel(selectedAnswers[0].occurred_at) : "noch keine Antwort"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Noch zu üben</p><p className="mt-1 text-2xl font-black text-amber-200">{partialCount + notYetCount}</p><p className="text-[10px] text-white/55">teilweise oder noch nicht erreicht</p></div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-4 sm:px-7 lg:px-8"><div className="mb-2 flex items-center justify-between gap-2 text-[11px]"><span className="font-bold text-white/80">Deine Antwortverteilung</span><span className="text-white/45">{selectedAnswers.length} Antworten</span></div><div className="flex h-2.5 overflow-hidden rounded-full bg-white/10"><span className="bg-emerald-400" style={{ width: `${percent(successCount, selectedAnswers.length)}%` }} /><span className="bg-amber-300" style={{ width: `${percent(partialCount, selectedAnswers.length)}%` }} /><span className="bg-rose-400" style={{ width: `${percent(notYetCount, selectedAnswers.length)}%` }} /></div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-white/60"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />{successCount} vollständig</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-300" />{partialCount} teilweise</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-400" />{notYetCount} noch nicht erreicht</span></div></div>
      </section>

      <section id="drift-reports" className="scroll-mt-5 overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_12px_38px_rgba(56,65,120,.08)] print:shadow-none">
        <div className="bg-[#20243d] px-5 py-5 text-white sm:px-7 lg:px-8">
          <p className="text-[9px] font-black uppercase tracking-[.25em] text-violet-300">DR1FT / Szenario-Report</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-black leading-tight sm:text-3xl">{scenarioTitle}</h2><p className="mt-2 text-xs text-white/55">{selectedAnswers.length} ausgewertete Aufgaben{selectedAnswers[0] ? ` · zuletzt bearbeitet ${dateLabel(selectedAnswers[0].occurred_at)}` : ""}</p></div><div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-400/15 text-violet-200"><Target className="h-5 w-5" /></span><span><strong className="block text-sm">{learningFocus.length ? `${learningFocus.length} Lernziel${learningFocus.length > 1 ? "e" : ""} zum Üben` : selectedAnswers.length ? "Alle Lernziele erreicht" : "Noch keine Auswertung"}</strong><span className="mt-0.5 block text-[10px] text-white/55">{learningFocus.length ? "Hier kannst du weiterarbeiten" : "basierend auf gespeicherten Antworten"}</span></span></div></div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"><div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-3"><p className="text-2xl font-black text-emerald-300">{successCount}</p><p className="text-[10px] font-semibold text-white/65">Vollständig</p></div><div className="rounded-xl border border-amber-300/15 bg-amber-300/10 p-3"><p className="text-2xl font-black text-amber-200">{partialCount}</p><p className="text-[10px] font-semibold text-white/65">Teilweise</p></div><div className="rounded-xl border border-rose-300/15 bg-rose-400/10 p-3"><p className="text-2xl font-black text-rose-200">{notYetCount}</p><p className="text-[10px] font-semibold text-white/65">Noch nicht erreicht</p></div></div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.32fr)_minmax(310px,.78fr)]">
          <div className="space-y-7 p-5 sm:p-7 lg:p-8">
            <section aria-labelledby="learning-goals-heading">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Target className="h-6 w-6" /></span><div><h3 id="learning-goals-heading" className="text-xl font-black tracking-tight sm:text-2xl">Deine Lernziele in dieser DR1FT</h3><p className="mt-0.5 text-xs text-slate-500">Was du schon sicher kannst – und woran du weiterarbeiten kannst.</p></div></div>
              {objectiveGroups.length ? <div className="space-y-2.5">{objectiveGroups.map((group) => {
                const Icon = objectiveIcon(group.title);
                return <details key={group.key} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white open:border-violet-200 open:shadow-[0_8px_24px_rgba(82,62,150,.08)]">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-3.5 sm:p-4 [&::-webkit-details-marker]:hidden">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${group.needsWork ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{group.needsWork ? <CircleHelp className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span>
                    <span className="min-w-[130px] flex-1"><strong className="block text-sm text-slate-900">{group.title}</strong><small className="text-[10px] text-slate-400">{group.answers.length} zugehörige Aufgabe{group.answers.length === 1 ? "" : "n"}</small></span>
                    <span className="w-[110px] shrink-0"><span className="block text-right text-sm font-black text-slate-800">{group.needsWork ? `${group.rate}%` : "100%"}</span><span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${group.needsWork ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${group.rate}%` }} /></span><span className="mt-1 block text-right text-[10px] text-slate-500">{group.good} / {group.answers.length} vollständig</span></span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-4 border-t border-amber-100 bg-gradient-to-r from-amber-50/80 to-orange-50/70 p-4 sm:grid-cols-2 sm:p-5">
                    <div><p className="flex items-center gap-2 text-xs font-black text-amber-900"><XCircle className="h-4 w-4" />Hier hast du Punkte liegen lassen</p><ul className="mt-2 space-y-2 text-xs leading-5 text-amber-950">{group.answers.filter((answer) => answer.outcome !== "success").map((answer) => <li key={answer.response_id} className="flex gap-2"><span className="text-amber-600">•</span><span>{answer.selected_option_feedback || `Deine Antwort „${answer.selected_option_label}“ wurde teilweise gewertet.`}</span></li>)}{!group.needsWork && <li>Für dieses Lernziel sind alle gespeicherten Antworten vollständig.</li>}</ul></div>
                    <div className="border-t border-amber-200 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><p className="flex items-center gap-2 text-xs font-black text-emerald-800"><Check className="h-4 w-4" />So erreichst du die volle Punktzahl</p><ul className="mt-2 space-y-2 text-xs leading-5 text-emerald-950">{group.answers.filter((answer) => answer.outcome !== "success").map((answer) => <li key={answer.response_id} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /><span>{answer.recommended_option_label || "Für diese Aufgabe ist noch keine vollständige Musterantwort hinterlegt."}</span></li>)}{!group.needsWork && <li>Alle dokumentierten Antworten erfüllen dieses Lernziel.</li>}</ul></div>
                  </div>
                </details>;
              })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center"><p className="text-sm font-semibold text-slate-700">Noch keine ausgewerteten Lernziele</p><p className="mt-1 text-xs text-slate-500">Sobald Antworten gespeichert sind, erscheinen sie hier.</p></div>}
            </section>

            <section aria-labelledby="answered-tasks-heading" className="border-t border-slate-100 pt-6">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><BookOpenCheck className="h-6 w-6" /></span><div><h3 id="answered-tasks-heading" className="text-xl font-black tracking-tight sm:text-2xl">Deine bearbeiteten Aufgaben</h3><p className="mt-0.5 text-xs text-slate-500">Deine Antwort und die dazu hinterlegten Lernhinweise.</p></div></div>
              {selectedAnswers.length ? <div className="grid gap-3 lg:grid-cols-2">{selectedAnswers.map((answer) => {
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

          <aside className="space-y-4 border-t border-slate-100 bg-[#fafaff] p-5 sm:p-7 xl:border-l xl:border-t-0 xl:p-6">
            <section className="rounded-2xl border border-indigo-100 bg-[#f6f8ff] p-4 sm:p-5"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 shrink-0 text-indigo-600" /><h3 className="text-base font-black text-slate-900">Kurzfazit</h3></div><p className="mt-3 text-sm leading-6 text-slate-700">{selectedAnswers.length ? `${studentName} hat in dieser DR1FT ${selectedAnswers.length} Aufgabe${selectedAnswers.length === 1 ? "" : "n"} beantwortet. ${successCount} Antwort${successCount === 1 ? "" : "en"} war${successCount === 1 ? "" : "en"} vollständig, ${partialCount + notYetCount} ${partialCount + notYetCount === 1 ? "braucht" : "brauchen"} noch Übung.` : "Für diese DR1FT liegen noch keine ausgewerteten Antworten vor."}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">Das Fazit fasst gespeicherte Antworten zusammen. Es ersetzt keine pädagogische Beurteilung.</p></section>

            <section className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><ThumbsUp className="h-5 w-5 shrink-0 text-emerald-700" /><h3 className="text-base font-black text-slate-900">Deine Stärken</h3></div>{evidencedStrengths.length ? <ul className="mt-3 space-y-2.5 text-sm leading-5 text-slate-700">{evidencedStrengths.map((group) => <li key={group.key} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>{group.title}</strong><span className="block text-xs text-slate-500">{group.answers.length} Antworten – alle vollständig</span></span></li>)}</ul> : <p className="mt-3 text-xs leading-5 text-slate-500">Noch keine mehrfach bestätigte Stärke. Dafür braucht es mindestens zwei vollständig bewertete Antworten zum selben Lernziel.</p>}</section>

            <section className="rounded-2xl border border-amber-200 bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><Target className="h-5 w-5 shrink-0 text-amber-700" /><h3 className="text-base font-black text-slate-900">Lernfelder mit Übungsbedarf</h3></div>{learningFocus.length ? <ul className="mt-3 space-y-3 text-sm leading-5 text-slate-700">{learningFocus.map((group) => <li key={group.key}><strong>{group.title}</strong><span className="block text-xs text-slate-500">{group.needsWork} von {group.answers.length} Antworten noch nicht vollständig</span></li>)}</ul> : <p className="mt-3 text-xs leading-5 text-slate-500">In den bisher gespeicherten Antworten ist kein offenes Lernfeld markiert.</p>}</section>

            <section className="rounded-2xl border border-violet-200 bg-[linear-gradient(140deg,#f5efff,#fff_70%)] p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Target className="h-5 w-5" /></span><h3 className="text-base font-black text-slate-900">Dein nächster Lernschritt</h3></div>{latestFocusAnswer ? <div className="mt-3 rounded-xl border border-violet-100 bg-white/80 p-3.5"><p className="text-sm font-bold text-violet-900">{learningFocus[0].title}</p><p className="mt-1 text-xs leading-5 text-slate-600">Greif die Aufgabe „{latestFocusAnswer.card_title}“ noch einmal auf. {latestFocusAnswer.recommended_option_label ? `Bei der vollständigen Antwort hilft: ${latestFocusAnswer.recommended_option_label}` : "Vergleiche deine Antwort mit den redaktionellen Hinweisen in der Aufgabe."}</p></div> : selectedAnswers.length ? <p className="mt-3 text-xs leading-5 text-slate-600">Alle bisher ausgewerteten Antworten sind vollständig. Weitere Aufgaben können zeigen, ob du die Erkenntnisse auch in neuen Situationen anwendest.</p> : <p className="mt-3 text-xs leading-5 text-slate-600">Mit der ersten bearbeiteten Aufgabe erscheinen hier passende nächste Schritte.</p>}</section>
          </aside>
        </div>
        {journeyError && <p className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 sm:m-7">Der Report konnte nicht geladen werden. Bitte die zugehörige Supabase-Migration prüfen. Technischer Hinweis: {journeyError}</p>}
      </section>

      <section id="gesamtfortschritt" className="scroll-mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><BookOpenCheck className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-indigo-600">Überblick</p><h2 className="text-xl font-black text-slate-900 sm:text-2xl">Deine Antworten über alle DR1FTs</h2></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black text-slate-900">{reports.length}</p><p className="mt-1 text-xs font-medium text-slate-600">Szenarien bearbeitet</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-2xl font-black text-emerald-800">{allSuccess}</p><p className="mt-1 text-xs font-medium text-emerald-800">Antworten vollständig</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-2xl font-black text-amber-800">{allPartial}</p><p className="mt-1 text-xs font-medium text-amber-800">Antworten teilweise richtig</p></div><div className="rounded-xl bg-rose-50 p-4"><p className="text-2xl font-black text-rose-800">{allNeedsWork}</p><p className="mt-1 text-xs font-medium text-rose-800">Antworten noch nicht erreicht</p></div></div>
        <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-black text-slate-900">Lernziele mit mehreren Nachweisen</h3>{overallGroups.some((group) => group.answers.length >= 2) ? <div className="mt-3 space-y-3">{overallGroups.filter((group) => group.answers.length >= 2).map((group) => <div key={group.key} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-semibold text-slate-800">{group.title}</p><p className="text-xs text-slate-500">{group.answers.length} Antworten · {group.good} vollständig · {group.needsWork} mit Übungsbedarf</p></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 sm:w-40"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${group.rate}%` }} /></div></div>)}</div> : <p className="mt-2 text-xs leading-5 text-slate-500">Für einen belastbaren Lernverlauf fehlen noch wiederholte Antworten zu denselben Lernzielen. Deshalb zeigen wir keine Kompetenzkurve.</p>}</div>
      </section>

      <footer className="pb-4 text-center text-[10px] tracking-wide text-slate-400 print:hidden">DR1FT · Learning Intelligence · Beruht auf gespeicherten Antworten und redaktionell hinterlegten Hinweisen. Keine geschätzten Punktwerte oder Klassenvergleiche.</footer>
    </div>
  </main>;
}
