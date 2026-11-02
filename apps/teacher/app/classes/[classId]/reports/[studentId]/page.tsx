import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";
import { PrintReportButton } from "./PrintReportButton";

type AnyRow = Record<string, any>;
type JourneyRow = {
  event_id: string;
  source_type: "interaction" | "learning_card" | "assessment" | "mission" | string;
  event_label: string;
  content_id: string | null;
  scenario_id: string | null;
  title: string | null;
  description: string | null;
  scenario_title: string | null;
  outcome: "success" | "partial" | "not_yet" | "not_assessable" | null;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
};

function avatarUrl(seed: string | null | undefined, size = 160) {
  const styles = ["voxel-art", "adventurer", "adventurer-neutral", "avataaars", "bottts", "fun-emoji", "lorelei", "micah", "miniavs", "personas", "pixel-art-neutral", "thumbs"];
  const value = seed || "dr1ft";
  const separator = value.indexOf("::");
  const candidate = separator > 0 ? value.slice(0, separator) : "";
  const style = styles.includes(candidate) ? candidate : "voxel-art";
  const avatarSeed = separator > 0 && styles.includes(candidate) ? value.slice(separator + 2) || "dr1ft" : value;
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}&size=${size}&animationVariant=medium&borderRadius=18`;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function outcomeLabel(outcome: string | null) {
  if (outcome === "success") return "Ziel erreicht";
  if (outcome === "partial") return "Teilweise erreicht";
  if (outcome === "not_yet") return "Weiterer Übungsbedarf";
  if (outcome === "not_assessable") return "Noch nicht bewertbar";
  return "Aktivität";
}

function outcomeTone(outcome: string | null) {
  if (outcome === "success") return "bg-emerald-50 text-emerald-700";
  if (outcome === "partial") return "bg-amber-50 text-amber-700";
  if (outcome === "not_yet") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

export default async function StudentReportPage({ params }: { params: { classId: string; studentId: string } }) {
  const supabase = supabaseServerClient();
  const { classId, studentId } = params;

  const [
    { data: classInfo },
    { data: profile },
    { data: assignments },
    { data: progressRows },
    journeyResult,
  ] = await Promise.all([
    supabase.from("class_instances").select("name, school_year, grade_level").eq("id", classId).maybeSingle(),
    supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", studentId).maybeSingle(),
    supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classId).eq("is_active", true).is("archived_at", null),
    supabase.from("user_mission_progress").select("mission_id, status, completed_at").eq("user_id", studentId).eq("class_instance_id", classId),
    supabase.rpc("get_teacher_student_learning_journey_v1", { p_class_id: classId, p_student_id: studentId }),
  ]);

  const journey = ((journeyResult.data ?? []) as JourneyRow[]).slice().sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );
  const journeyError = journeyResult.error?.message ?? null;

  const scenarioIds = Array.from(new Set((assignments ?? []).map((a: AnyRow) => a.scenario_id).filter(Boolean)));
  const completedMissionIds = Array.from(new Set((progressRows ?? []).map((p: AnyRow) => p.mission_id).filter(Boolean)));
  const [{ data: assignedMissions }, { data: historicalMissions }] = await Promise.all([
    scenarioIds.length
      ? supabase.from("missions").select("id, title, scenario_id").in("scenario_id", scenarioIds)
      : Promise.resolve({ data: [] as AnyRow[] }),
    completedMissionIds.length
      ? supabase.from("missions").select("id, title, scenario_id").in("id", completedMissionIds)
      : Promise.resolve({ data: [] as AnyRow[] }),
  ]);
  const missionMap = new Map<string, AnyRow>();
  [...(assignedMissions ?? []), ...(historicalMissions ?? [])].forEach((m: AnyRow) => missionMap.set(m.id, m));
  const missions = Array.from(missionMap.values()).map((mission: AnyRow) => {
    const progress = (progressRows ?? []).find((row: AnyRow) => row.mission_id === mission.id);
    return { ...mission, progressStatus: progress?.status ?? "not_started" };
  });
  const missionCompleted = missions.filter((m: AnyRow) => m.progressStatus === "completed").length;

  const { data: session } = await supabase.auth.getSession();
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.session?.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ classId }),
    cache: "no-store",
  });
  const dashboard = response.ok ? await response.json() : {};
  const competencies = (dashboard.studentCompetencyProgress ?? []).filter((r: AnyRow) => r.user_id === studentId && r.competency_id != null);
  const learningEvidence = (dashboard.studentLearningEvidence ?? []).find((r: AnyRow) => r.user_id === studentId) ?? null;
  const average = competencies.length
    ? competencies.reduce((sum: number, row: AnyRow) => sum + Number(row.level ?? 0), 0) / competencies.length
    : null;

  const interactions = journey.filter((row) => row.source_type === "interaction");
  const assessments = journey.filter((row) => row.source_type === "learning_card" || row.source_type === "assessment");
  const scored = assessments.filter((row) => ["success", "partial", "not_yet"].includes(row.outcome ?? ""));
  const successCount = scored.filter((row) => row.outcome === "success").length;
  const partialCount = scored.filter((row) => row.outcome === "partial").length;
  const notYetCount = scored.filter((row) => row.outcome === "not_yet").length;
  const sourceChecks = interactions.filter((row) => ["inspect_source", "inspect_media", "inspect_context", "compare_information"].includes(String(row.metadata?.interaction_type)));
  const reflections = interactions.filter((row) => row.metadata?.interaction_type === "learning_task_response");
  const topics = Array.from(new Set(journey.map((row) => row.scenario_title).filter(Boolean))) as string[];
  const touchedContent = journey.filter((row) => row.title && row.source_type !== "mission");
  const recentEvents = journey.slice(0, 10);
  const studentName = profile?.display_name || "Schüler:in";
  const totalInteractions = interactions.length + assessments.length + journey.filter((row) => row.source_type === "mission").length;
  const hasLearningSignals = scored.length > 0 || sourceChecks.length > 0 || reflections.length > 0;
  const successRate = scored.length ? Math.round(successCount / scored.length * 100) : null;

  const summaryParts: string[] = [];
  if (scored.length) summaryParts.push(`${scored.length} bewertbare Lernantworten liegen vor: ${successCount} davon mit dem Ergebnis „Ziel erreicht“, ${partialCount} teilweise und ${notYetCount} mit weiterem Übungsbedarf.`);
  if (sourceChecks.length) summaryParts.push(`${sourceChecks.length} dokumentierte Prüfhandlungen zu Quellen, Medien oder Kontext sind erfasst.`);
  if (reflections.length) summaryParts.push(`${reflections.length} schriftliche Aufgabenreflexion(en) wurden gespeichert.`);
  if (!summaryParts.length && journey.length) summaryParts.push(`Es sind ${journey.length} Aktivitäten dokumentiert. Für eine belastbare inhaltliche Einschätzung fehlen bislang bewertbare Lernantworten oder konkrete Prüf- und Reflexionshandlungen.`);
  if (!journey.length) summaryParts.push("Für diesen Schüler liegen in dieser Klasseninstanz noch keine auswertbaren Interaktionen oder Lernnachweise vor.");

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_#f2eaff_0%,_#f7f8ff_42%,_#f4f7ff_100%)] px-4 py-6 md:px-8 lg:px-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><a href={`/classes/${classId}`} className="hover:text-violet-700">Klassen</a><span>›</span><span>{classInfo?.name || "Klasse"}</span><span>›</span><span>Schüler:innen</span><span>›</span><span className="font-medium text-slate-700">{studentName}</span></div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-600">DR1FT / Lernreport</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Lernreport – {studentName}</h1>
            <p className="mt-2 text-sm text-slate-500">{classInfo?.name || "Klasse"} · Jahrgang {classInfo?.grade_level ?? "—"} · Schuljahr {classInfo?.school_year || "—"} · Gesamter verfügbarer Verlauf</p>
          </div>
          <div className="flex flex-wrap gap-2"><PrintReportButton /><a href={`/classes/${classId}`} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">Zur Klassenübersicht <span aria-hidden="true">→</span></a></div>
        </div>

        <section className="relative overflow-hidden rounded-[28px] border border-white/90 bg-[linear-gradient(110deg,#f6e9ff_0%,#eef0ff_54%,#e9f7ff_100%)] p-5 shadow-[0_18px_60px_rgba(80,80,170,0.12)] md:p-7">
          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border border-white/80" />
          <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(250px,1.1fr)_minmax(260px,1fr)_repeat(3,minmax(115px,.45fr))] xl:items-center">
            <div className="flex items-center gap-5">
              <img src={avatarUrl(profile?.avatar_seed || studentId)} alt="" className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-xl md:h-28 md:w-28" />
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Dein Lernprofil</p><h2 className="mt-1 truncate text-3xl font-bold tracking-tight text-slate-950">{studentName}</h2><p className="mt-1 text-sm font-medium text-slate-600">@{profile?.username || "—"} · {classInfo?.name || "Klasse"}</p></div>
            </div>
            <div className="rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">DR1FT Lernanalyse</p><p className="mt-2 text-sm leading-6 text-slate-700">{hasLearningSignals ? "Deine dokumentierten Lernhandlungen und Antworten bilden die Grundlage dieser Auswertung." : "Deine Lernanalyse wächst mit den Inhalten und Aufgaben, mit denen du dich beschäftigst."}</p></div>
            {[
              { label: "Dokumentierte Aktivitäten", value: totalInteractions, icon: "▤" },
              { label: "Bewertbare Lernantworten", value: scored.length, icon: "◎" },
              { label: "Abgeschlossene Missionen", value: missionCompleted, icon: "✦" },
            ].map((item) => <div key={item.label} className="rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-lg text-violet-600">{item.icon}</span><p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{item.value}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{item.label}</p></div>)}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,.9fr)]">
          <div className="space-y-5">
            <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_12px_38px_rgba(56,65,120,.07)] md:p-6">
              <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-xl text-violet-600">⌁</span><div><h2 className="text-xl font-bold text-slate-950">Lernanalyse</h2><p className="text-sm text-slate-500">Inhaltliche Auswertung deiner dokumentierten DR1FT-Erlebnisse</p></div></div>
              <div className="space-y-3">
                <article className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[minmax(180px,.9fr)_minmax(0,1.1fr)] md:items-center">
                  <div><p className="font-bold text-slate-900">Inhaltliches Verständnis</p><p className="mt-1 text-xs text-slate-500">Lernziele, Zusammenhänge und bewertete Antworten</p></div>
                  <div>{scored.length ? <><div className="mb-2 flex justify-between text-xs"><span className="text-slate-500">{scored.length} bewertbare Antworten</span><strong className="text-emerald-700">{successRate}% „Ziel erreicht“</strong></div><div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="bg-emerald-400" style={{ width: `${successRate}%` }}/><div className="bg-amber-300" style={{ width: `${Math.round(partialCount / scored.length * 100)}%` }}/><div className="bg-rose-400" style={{ width: `${Math.round(notYetCount / scored.length * 100)}%` }}/></div><p className="mt-2 text-xs leading-5 text-slate-600">{successCount} erreicht · {partialCount} teilweise · {notYetCount} weiterer Übungsbedarf</p></> : <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">Noch keine bewertbaren Lernantworten vorhanden. Likes und Aufrufe werden nicht als Verständnis gewertet.</p>}</div>
                </article>
                <article className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[minmax(180px,.9fr)_minmax(0,1.1fr)] md:items-center">
                  <div><p className="font-bold text-slate-900">Medienkritik und Bewertung</p><p className="mt-1 text-xs text-slate-500">Quellen, Medien, Kontext und Informationsvergleich</p></div>
                  <div>{sourceChecks.length ? <><p className="text-2xl font-bold text-sky-700">{sourceChecks.length} <span className="text-xs font-medium text-slate-500">dokumentierte Prüfhandlungen</span></p><p className="mt-1 text-xs leading-5 text-slate-600">Diese Handlungen zeigen, dass Inhalte aktiv geprüft wurden. Eine sichere Bewertungskompetenz lässt sich daraus allein noch nicht ableiten.</p></> : <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">Bisher sind keine konkreten Quellen-, Medien- oder Kontextprüfungen dokumentiert.</p>}</div>
                </article>
                <article className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[minmax(180px,.9fr)_minmax(0,1.1fr)] md:items-center">
                  <div><p className="font-bold text-slate-900">Reflexion und Selbstständigkeit</p><p className="mt-1 text-xs text-slate-500">Eigene Überlegungen und Antworten auf Lernaufgaben</p></div>
                  <div>{reflections.length ? <><p className="text-2xl font-bold text-amber-600">{reflections.length} <span className="text-xs font-medium text-slate-500">gespeicherte Reflexionen</span></p><p className="mt-1 text-xs leading-5 text-slate-600">Die eingereichten Antworten können inhaltlich betrachtet werden. Die Anzahl allein ist noch keine Aussage über die Qualität der Reflexion.</p></> : <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">Noch keine schriftlichen Antworten auf Lernaufgaben dokumentiert.</p>}</div>
                </article>
                <article className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[minmax(180px,.9fr)_minmax(0,1.1fr)] md:items-center">
                  <div><p className="font-bold text-slate-900">Lernentwicklung und Transfer</p><p className="mt-1 text-xs text-slate-500">Erkenntnisse auf neue Situationen übertragen</p></div>
                  <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">Eine belastbare Entwicklungskurve erfordert wiederholte Nachweise zu denselben Lernzielen in unterschiedlichen Situationen. Diese Verknüpfung ist derzeit noch nicht vollständig verfügbar.</p>
                </article>
              </div>
              {journeyError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Die neue Lernreise-Auswertung ist noch nicht verfügbar. Bitte zuerst die zugehörige Supabase-Migration ausführen. Technischer Hinweis: {journeyError}</p>}
            </section>

            <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_12px_38px_rgba(56,65,120,.07)] md:p-6">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-100 text-xl text-indigo-600">◈</span><div><h2 className="text-xl font-bold text-slate-950">Erlebte Themen & Aktivitäten</h2><p className="text-sm text-slate-500">Nur Beiträge, Aufgaben und Missionen, mit denen du tatsächlich interagiert hast</p></div></div>
              {touchedContent.length ? <div className="space-y-2">{touchedContent.slice(0, 8).map((item) => <div key={item.event_id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">{item.source_type === "learning_card" ? "▤" : item.source_type === "assessment" ? "✓" : "◉"}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900">{item.title}</p><span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{item.event_label}</span></div>{item.scenario_title && <p className="mt-1 text-xs text-slate-500">{item.scenario_title}</p>}{item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.description}</p>}</div>{item.outcome && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${outcomeTone(item.outcome)}`}>{outcomeLabel(item.outcome)}</span>}</div>)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500">Noch keine tatsächlich erlebten Inhalte dokumentiert.</div>}
              {topics.length > 0 && <div className="mt-4 flex flex-wrap gap-2"><span className="mr-1 self-center text-xs font-semibold text-slate-500">Themen:</span>{topics.map((topic) => <span key={topic} className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">{topic}</span>)}</div>}
            </section>

            <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_12px_38px_rgba(56,65,120,.07)] md:p-6">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-fuchsia-100 text-xl text-fuchsia-600">↗</span><div><h2 className="text-xl font-bold text-slate-950">Dein Lernverlauf</h2><p className="text-sm text-slate-500">Chronologie der gespeicherten Aktivitäten und Nachweise</p></div></div>
              {recentEvents.length ? <div className="space-y-0">{recentEvents.map((event, index) => <div key={event.event_id} className="relative flex gap-3 pb-4 last:pb-0"><div className="relative flex w-4 shrink-0 justify-center"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-violet-400 ring-4 ring-violet-50"/>{index < recentEvents.length - 1 && <span className="absolute top-5 h-full w-px bg-violet-100"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{event.event_label}: {event.title || event.scenario_title || "DR1FT-Aktivität"}</p><time className="text-[11px] text-slate-400">{dateLabel(event.occurred_at)}</time></div>{event.scenario_title && <p className="mt-1 text-xs text-slate-500">{event.scenario_title}</p>}</div></div>)}</div> : <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-400">Noch keine Aktivitäten im Verlauf gespeichert.</p>}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_12px_38px_rgba(56,65,120,.07)]">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Zeit, Aktivität & Fokus</h2><p className="mt-1 text-xs text-slate-500">Ergänzende Nutzungsinformationen</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">◷</span></div>
              <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-4"><p className="text-sm font-semibold text-slate-800">Aktive Nutzungszeit noch nicht verlässlich messbar</p><p className="mt-1 text-xs leading-5 text-slate-600">DR1FT protokolliert bereits einzelne Interaktionen, erfasst aber noch keine belastbare aktive Zeit pro Bereich. Deshalb zeigen wir hier bewusst keine geschätzten Stunden oder Fokus-Prozentwerte.</p></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{interactions.length}</p><p className="text-[11px] leading-4 text-slate-500">gespeicherte Feed-Interaktionen</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{reflections.length}</p><p className="text-[11px] leading-4 text-slate-500">Aufgabenreflexionen</p></div></div>
            </section>

            <section className="rounded-[26px] border border-white bg-[linear-gradient(145deg,#fff_0%,#f7f1ff_58%,#effaff_100%)] p-5 shadow-[0_12px_38px_rgba(56,65,120,.07)]">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">✦</span><h2 className="text-lg font-bold text-slate-950">Kurzfazit</h2></div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">{summaryParts.map((part, index) => <p key={index}>{part}</p>)}</div>
              <p className="mt-4 border-t border-violet-100 pt-3 text-[11px] leading-5 text-slate-500">Das Kurzfazit beschreibt dokumentierte Aktivitäten und Ergebnisse. Es ersetzt keine pädagogische Beurteilung und bewertet keine privaten Chats.</p>
            </section>

            <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_12px_38px_rgba(56,65,120,.07)]">
              <h2 className="text-lg font-bold text-slate-950">Kompetenzdaten</h2><p className="mt-1 text-xs text-slate-500">Gespeicherte, bisherige Kompetenzzuordnungen</p>
              {competencies.length ? <div className="mt-4 space-y-3">{competencies.map((row: AnyRow) => <div key={row.competency_id}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="font-semibold text-slate-700">{row.competency_title || "Kompetenz"}</span><span className="text-slate-500">{row.level ?? "—"} / 5</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, Number(row.level ?? 0) / 5 * 100))}%` }}/></div></div>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-xs leading-5 text-slate-500">Noch keine gespeicherten Kompetenz-Level vorhanden. Lernkarten-Antworten werden separat ausgewiesen und nicht automatisch als Kompetenz-Level verbucht.</p>}
              {average !== null && <p className="mt-4 text-xs text-slate-500">Durchschnitt der gespeicherten Kompetenz-Level: <strong className="text-slate-800">{average.toFixed(1)} / 5</strong></p>}
            </section>

            <section className="rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_12px_38px_rgba(56,65,120,.07)]">
              <h2 className="text-lg font-bold text-slate-950">Nächste sinnvolle Schritte</h2>
              <p className="mt-1 text-xs text-slate-500">Aus den aktuell dokumentierten Nachweisen abgeleitet</p>
              <div className="mt-4 space-y-2">
                {notYetCount > 0 && <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-900">Lernziele mit Übungsbedarf erneut aufgreifen</p><p className="mt-1 text-xs leading-5 text-amber-800">{notYetCount} Antwort(en) zeigen weiteren Unterstützungsbedarf.</p></div>}
                {sourceChecks.length === 0 && <div className="rounded-xl bg-sky-50 p-3"><p className="text-xs font-semibold text-sky-900">Quellen und Medien gezielt prüfen</p><p className="mt-1 text-xs leading-5 text-sky-800">Eine passende Aufgabe könnte das bewusste Prüfen von Herkunft und Kontext anregen.</p></div>}
                {reflections.length === 0 && <div className="rounded-xl bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-900">Eigene Überlegungen festhalten</p><p className="mt-1 text-xs leading-5 text-violet-800">Eine kurze Reflexionsaufgabe würde zusätzliche Einblicke in die eigene Begründung ermöglichen.</p></div>}
                {!notYetCount && sourceChecks.length > 0 && reflections.length > 0 && <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">Erkenntnisse in neuen Situationen anwenden</p><p className="mt-1 text-xs leading-5 text-emerald-800">Die nächsten Lerngelegenheiten können den Transfer auf neue Beispiele prüfen.</p></div>}
              </div>
            </section>
          </aside>
        </div>
        <footer className="px-1 pb-4 text-xs text-slate-400 print:hidden">DR1FT · Learning Intelligence · Beruht auf den tatsächlich gespeicherten Aktivitäten und Lernnachweisen dieser Klasseninstanz. Nicht verfügbare Daten werden nicht geschätzt; private Direktnachrichten werden nicht ausgewertet.</footer>
      </div>
    </main>
  );
}
