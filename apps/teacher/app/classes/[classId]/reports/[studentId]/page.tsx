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
  if (outcome === "partial") return "Teilweise";
  if (outcome === "not_yet") return "Übungsbedarf";
  return "Nicht bewertbar";
}
function outcomeTone(outcome: string | null) {
  if (outcome === "success") return "bg-emerald-100 text-emerald-800";
  if (outcome === "partial") return "bg-amber-100 text-amber-800";
  if (outcome === "not_yet") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-600";
}
function pct(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

export default async function StudentReportPage({ params }: { params: { classId: string; studentId: string } }) {
  const supabase = supabaseServerClient();
  const { classId, studentId } = params;
  const [
    { data: classInfo },
    { data: profile },
    { data: assignments },
    journeyResult,
  ] = await Promise.all([
    supabase.from("class_instances").select("name, school_year, grade_level").eq("id", classId).maybeSingle(),
    supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", studentId).maybeSingle(),
    supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classId).eq("is_active", true).is("archived_at", null),
    supabase.rpc("get_teacher_student_learning_journey_v1", { p_class_id: classId, p_student_id: studentId }),
  ]);

  const journey = ((journeyResult.data ?? []) as JourneyRow[]).slice().sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  const journeyError = journeyResult.error?.message ?? null;
  const assessed = journey.filter(row => (row.source_type === "learning_card" || row.source_type === "assessment") && ["success", "partial", "not_yet"].includes(row.outcome ?? ""));
  const success = assessed.filter(row => row.outcome === "success").length;
  const partial = assessed.filter(row => row.outcome === "partial").length;
  const needsPractice = assessed.filter(row => row.outcome === "not_yet").length;
  const notAssessable = journey.filter(row => (row.source_type === "learning_card" || row.source_type === "assessment") && row.outcome === "not_assessable").length;
  const scenarios = new Map<string, { id: string; title: string; rows: JourneyRow[] }>();
  assessed.forEach(row => {
    const key = row.scenario_id || "unassigned";
    const current = scenarios.get(key) ?? { id: key, title: row.scenario_title || "DR1FT ohne Szenario-Zuordnung", rows: [] };
    current.rows.push(row);
    scenarios.set(key, current);
  });
  const scenarioReports = Array.from(scenarios.values()).sort((a,b) => b.rows.length-a.rows.length);
  const recentEvidence = journey.filter(row => row.source_type === "learning_card" || row.source_type === "assessment").slice(0, 8);
  const studentName = profile?.display_name || "Schüler:in";
  const assignedCount = new Set((assignments ?? []).map((a: AnyRow) => a.scenario_id).filter(Boolean)).size;
  const hasEvidence = assessed.length > 0;
  const total = assessed.length;
  const successRate = pct(success, total);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f6ff] text-slate-900 print:bg-white">
      <div className="pointer-events-none fixed inset-0 print:hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet-300/25 blur-3xl"/>
        <div className="absolute right-[-10rem] top-24 h-[30rem] w-[30rem] rounded-full bg-cyan-200/30 blur-3xl"/>
        <div className="absolute bottom-[-10rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-200/20 blur-3xl"/>
      </div>
      <div className="relative mx-auto max-w-[1480px] space-y-6 px-4 py-6 md:px-8 lg:px-10">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end print:hidden">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400"><a href={`/classes/${classId}`} className="hover:text-violet-700">Klassen</a><span>/</span><span>{classInfo?.name || "Klasse"}</span><span>/</span><span>Learning Intelligence</span></div>
            <p className="text-[11px] font-black uppercase tracking-[.28em] text-violet-600">DR1FT / Learning Intelligence</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950 md:text-5xl">Lernreport <span className="text-violet-600">— {studentName}</span></h1>
            <p className="mt-2 text-sm text-slate-500">{classInfo?.name || "Klasse"} · Jahrgang {classInfo?.grade_level ?? "—"} · Schuljahr {classInfo?.school_year || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2"><PrintReportButton/><a href={`/classes/${classId}`} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5">Klassenübersicht ↗</a></div>
        </header>

        <section className="relative overflow-hidden rounded-[32px] bg-[#17142f] p-6 text-white shadow-[0_24px_80px_rgba(37,28,91,.22)] md:p-9">
          <div className="absolute -right-20 -top-36 h-[28rem] w-[28rem] rounded-full border border-white/10"/><div className="absolute -right-2 -top-20 h-[20rem] w-[20rem] rounded-full border border-white/10"/><div className="absolute right-24 top-12 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl"/>
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div className="flex items-center gap-5">
              <img src={avatarUrl(profile?.avatar_seed || studentId)} alt="" className="h-24 w-24 rounded-[28px] border-4 border-white/20 bg-white/10 object-cover shadow-2xl md:h-32 md:w-32"/>
              <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-violet-300">Dein Lernprofil</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{studentName}</h2><p className="mt-2 text-sm text-white/55">@{profile?.username || "—"} · {classInfo?.name || "Klasse"}</p><div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-violet-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/>{hasEvidence ? "Lernnachweise vorhanden" : "Auswertung wächst mit deinen Nachweisen"}</div></div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.07] p-3 md:p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">DR1FTs</p><p className="mt-2 text-3xl font-black">{scenarioReports.length}</p><p className="mt-1 text-[10px] text-white/45">mit bewertbaren Nachweisen</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.07] p-3 md:p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Lernziele</p><p className="mt-2 text-3xl font-black">{total}</p><p className="mt-1 text-[10px] text-white/45">bewertbare Antworten</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.07] p-3 md:p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Ziel erreicht</p><p className="mt-2 text-3xl font-black text-emerald-300">{hasEvidence ? `${successRate}%` : "—"}</p><p className="mt-1 text-[10px] text-white/45">Anteil der Antworten</p></div>
            </div>
          </div>
          <div className="relative mt-8 grid gap-5 border-t border-white/10 pt-6 md:grid-cols-[1fr_auto] md:items-center">
            <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold text-white/70">Ergebnisverteilung aller bewertbaren Antworten</span><span className="text-white/40">{total} Antworten</span></div><div className="flex h-3 overflow-hidden rounded-full bg-white/10"><div className="bg-emerald-400 transition-all" style={{width:`${pct(success,total)}%`}}/><div className="bg-amber-300" style={{width:`${pct(partial,total)}%`}}/><div className="bg-rose-400" style={{width:`${pct(needsPractice,total)}%`}}/></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/60"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400"/> {success} Ziel erreicht</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-300"/> {partial} teilweise</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-400"/> {needsPractice} Übungsbedarf</span></div></div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-400/15 text-xl text-violet-200">◎</div><div><p className="text-xl font-black">{assignedCount}</p><p className="text-[10px] text-white/45">aktive DR1FT-Zuweisungen</p></div></div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-white bg-white/90 p-5 shadow-[0_12px_45px_rgba(48,48,100,.07)] md:p-7">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-600">01 / Auswertung</p><h2 className="mt-1 text-2xl font-black tracking-tight">Deine DR1FT-Reports</h2><p className="mt-1 text-sm text-slate-500">Jede DR1FT wird anhand ihrer tatsächlich bewerteten Lernnachweise betrachtet.</p></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700">{scenarioReports.length} ausgewertete Szenarien</span></div>
              {scenarioReports.length ? <div className="space-y-4">{scenarioReports.map((scenario,index)=>{
                const rows=scenario.rows; const s=rows.filter(r=>r.outcome==="success").length; const p=rows.filter(r=>r.outcome==="partial").length; const n=rows.filter(r=>r.outcome==="not_yet").length; const rate=pct(s,rows.length);
                return <article key={scenario.id} className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-violet-50/60 p-5">
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-200/20 blur-2xl"/>
                  <div className="relative flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-sm font-black text-violet-700">{String(index+1).padStart(2,"0")}</span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">DR1FT / Szenario</p><h3 className="mt-1 text-lg font-black leading-snug text-slate-950">{scenario.title}</h3><p className="mt-1 text-xs text-slate-500">{rows.length} bewertbare Lernantworten</p></div></div><div className="flex items-center gap-3"><div className="relative grid h-[76px] w-[76px] place-items-center rounded-full" style={{background:`conic-gradient(#10b981 ${rate*3.6}deg, #e8eaf2 0deg)`}}><div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-white"><span className="text-lg font-black text-slate-900">{rate}%</span></div></div><span className="max-w-16 text-[10px] font-bold uppercase leading-4 tracking-wide text-slate-400">Ziel erreicht</span></div></div>
                  <div className="relative mt-5"><div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="bg-emerald-400" style={{width:`${pct(s,rows.length)}%`}}/><div className="bg-amber-300" style={{width:`${pct(p,rows.length)}%`}}/><div className="bg-rose-400" style={{width:`${pct(n,rows.length)}%`}}/></div><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-xl bg-emerald-50 px-3 py-2"><p className="text-xl font-black text-emerald-700">{s}</p><p className="text-[10px] font-semibold text-emerald-800/70">Ziel erreicht</p></div><div className="rounded-xl bg-amber-50 px-3 py-2"><p className="text-xl font-black text-amber-700">{p}</p><p className="text-[10px] font-semibold text-amber-800/70">Teilweise</p></div><div className="rounded-xl bg-rose-50 px-3 py-2"><p className="text-xl font-black text-rose-700">{n}</p><p className="text-[10px] font-semibold text-rose-800/70">Übungsbedarf</p></div></div></div>
                  <div className="relative mt-4 space-y-2">{rows.slice(0,4).map(row=><div key={row.event_id} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs"><span className="min-w-0 truncate font-medium text-slate-700">{row.title || row.event_label}</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${outcomeTone(row.outcome)}`}>{outcomeLabel(row.outcome)}</span></div>)}</div>
                </article>
              })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-2xl text-violet-600">◎</div><h3 className="mt-4 font-bold text-slate-900">Noch keine bewertbaren DR1FT-Nachweise</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Sobald Lernkarten oder Aufgaben mit einem konkreten Ergebnis abgeschlossen wurden, erscheint hier die individuelle Szenario-Auswertung.</p></div>}
              {notAssessable>0 && <p className="mt-4 text-xs text-slate-400">{notAssessable} weitere Nachweise sind gespeichert, aber nicht bewertbar. Sie fließen nicht in die Ergebnisgrafiken ein.</p>}
              {journeyError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Die Lernnachweise konnten nicht geladen werden. Bitte die zugehörige Supabase-Migration prüfen. {journeyError}</p>}
            </section>

            {recentEvidence.length>0 && <section className="rounded-[28px] border border-white bg-white/90 p-5 shadow-[0_12px_45px_rgba(48,48,100,.07)] md:p-7"><div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-600">02 / Belege</p><h2 className="mt-1 text-2xl font-black tracking-tight">Woran wir die Ergebnisse festmachen</h2><p className="mt-1 text-sm text-slate-500">Konkrete Antworten und bewertete Aufgaben – keine bloßen Feed-Aufrufe.</p></div><div className="relative space-y-0 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-violet-100">{recentEvidence.map((row,index)=><div key={row.event_id} className="relative flex gap-4 pb-5 last:pb-0"><span className="relative z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl border-4 border-white bg-violet-100 text-xs font-black text-violet-700">{index+1}</span><div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-800">{row.title || row.event_label}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${outcomeTone(row.outcome)}`}>{outcomeLabel(row.outcome)}</span></div>{row.description && <p className="mt-2 text-xs leading-5 text-slate-500">{row.description}</p>}<p className="mt-2 text-[10px] text-slate-400">{row.scenario_title || "DR1FT"} · {dateLabel(row.occurred_at)}</p></div></div>)}</div></section>}
          </div>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#e9e4ff] via-[#f2edff] to-[#e4f7ff] p-6 shadow-[0_12px_45px_rgba(48,48,100,.07)]"><p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-700">03 / Einordnung</p><h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Was sagt das Ergebnis?</h2>{hasEvidence ? <><div className="mt-5 flex items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-[26px] bg-white/80 shadow-sm"><span className="text-3xl font-black text-violet-700">{successRate}%</span></div><p className="text-sm leading-6 text-slate-700">der bewertbaren Antworten wurden mit „Ziel erreicht“ bewertet. {needsPractice>0 ? `${needsPractice} Antwort(en) zeigen konkreten Übungsbedarf.` : "In den vorliegenden Antworten ist aktuell kein expliziter Übungsbedarf markiert."}</p></div><div className="mt-5 rounded-2xl border border-white/80 bg-white/55 p-4"><p className="text-xs font-bold text-slate-800">Wichtig für die Interpretation</p><p className="mt-1 text-xs leading-5 text-slate-600">Die Grafik beschreibt dokumentierte Antworten in den ausgewerteten DR1FTs. Sie ist keine pauschale Aussage über die gesamte Kompetenz oder den Lernerfolg.</p></div></> : <p className="mt-3 text-sm leading-6 text-slate-600">Es liegen noch nicht genügend bewertbare Lernantworten für eine inhaltliche Einordnung vor. Nicht ausgewertete Bereiche werden bewusst nicht dargestellt.</p>}</section>

            <section className="rounded-[28px] border border-white bg-white/90 p-6 shadow-[0_12px_45px_rgba(48,48,100,.07)]"><p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-600">04 / Nächster Schritt</p><h2 className="mt-2 text-xl font-black tracking-tight">Lernen gezielt weiterführen</h2>{needsPractice>0 ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4"><div className="flex items-center gap-2 text-rose-700"><span className="text-lg">↗</span><p className="text-sm font-bold">Nachweise mit Übungsbedarf erneut aufgreifen</p></div><p className="mt-2 text-xs leading-5 text-rose-800/80">{needsPractice} bewertbare Antwort(en) wurden als „Weiterer Übungsbedarf“ dokumentiert. Die zugehörigen Lernziele sollten in einer passenden Lerngelegenheit erneut vorkommen.</p></div> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Sobald ein konkretes Lernziel weiteren Übungsbedarf zeigt, erscheint hier ein darauf abgestimmter nächster Schritt.</p>}{partial>0 && <div className="mt-3 rounded-2xl bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">Teilweise erreichte Lernziele vertiefen</p><p className="mt-1 text-xs leading-5 text-amber-800/80">{partial} Antwort(en) wurden teilweise erreicht.</p></div>}</section>

            <section className="rounded-[28px] border border-white bg-white/90 p-6 shadow-[0_12px_45px_rgba(48,48,100,.07)]"><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-700">05 / Datenqualität</p><h2 className="mt-2 text-lg font-black">Nur belastbare Aussagen</h2><div className="mt-4 space-y-3 text-xs leading-5 text-slate-500"><p className="flex gap-2"><span className="text-emerald-500">●</span> Bewertete Antworten werden szenariobezogen ausgewertet.</p><p className="flex gap-2"><span className="text-emerald-500">●</span> Nicht bewertete Aktivitäten werden nicht als Lernerfolg gezählt.</p><p className="flex gap-2"><span className="text-amber-500">●</span> Bearbeitungsdauer und Klassenschnitt erscheinen erst, wenn sie zuverlässig und vergleichbar erfasst werden.</p></div></section>
          </aside>
        </div>
        <footer className="pb-5 text-center text-[10px] tracking-wide text-slate-400 print:hidden">DR1FT · Learning Intelligence · Auswertung ausschließlich auf Basis gespeicherter, zuordenbarer Lernnachweise. Private Direktnachrichten und nicht lernzielbezogene Feed-Aktivitäten bleiben außen vor.</footer>
      </div>
    </main>
  );
}
