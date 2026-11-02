import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";
import { PrintReportButton } from "./PrintReportButton";

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

function avatarUrl(seed: string | null | undefined, size = 160) {
  const styles = ["voxel-art", "adventurer", "adventurer-neutral", "avataaars", "bottts", "fun-emoji", "lorelei", "micah", "miniavs", "personas", "pixel-art-neutral", "thumbs"];
  const value = seed || "dr1ft";
  const separator = value.indexOf("::");
  const candidate = separator > 0 ? value.slice(0, separator) : "";
  const style = styles.includes(candidate) ? candidate : "voxel-art";
  const avatarSeed = separator > 0 && styles.includes(candidate) ? value.slice(separator + 2) || "dr1ft" : value;
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}&size=${size}&animationVariant=medium&borderRadius=18`;
}
function pct(value: number, total: number) { return total ? Math.round(value / total * 100) : 0; }
function tone(outcome: string) {
  return outcome === "success" ? "text-emerald-700 bg-emerald-100" : outcome === "partial" ? "text-amber-800 bg-amber-100" : "text-rose-700 bg-rose-100";
}
function label(outcome: string) {
  return outcome === "success" ? "Ziel erreicht" : outcome === "partial" ? "Teilweise erreicht" : "Noch nicht erreicht";
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export default async function StudentReportPage({ params }: { params: { classId: string; studentId: string } }) {
  const supabase = supabaseServerClient();
  const { classId, studentId } = params;
  const [{ data: classInfo }, { data: profile }, { data: assignments }, reportResult] = await Promise.all([
    supabase.from("class_instances").select("name, school_year, grade_level").eq("id", classId).maybeSingle(),
    supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", studentId).maybeSingle(),
    supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classId).eq("is_active", true).is("archived_at", null),
    supabase.rpc("get_teacher_student_scenario_report_v1", { p_class_id: classId, p_student_id: studentId }),
  ]);

  const reportError = reportResult.error?.message ?? null;
  const answers = (reportResult.data ?? []) as ScenarioAnswer[];
  const grouped = new Map<string, ScenarioReport>();
  for (const answer of answers) {
    const current = grouped.get(answer.scenario_id) ?? { id: answer.scenario_id, title: answer.scenario_title, answers: [] };
    current.answers.push(answer);
    grouped.set(answer.scenario_id, current);
  }
  const reports = Array.from(grouped.values()).sort((a,b) => {
    const aDate = Math.max(...a.answers.map(x => new Date(x.occurred_at).getTime()));
    const bDate = Math.max(...b.answers.map(x => new Date(x.occurred_at).getTime()));
    return bDate-aDate;
  });
  const all = answers;
  const success = all.filter(x => x.outcome === "success").length;
  const partial = all.filter(x => x.outcome === "partial").length;
  const missed = all.filter(x => x.outcome === "not_yet").length;
  const total = all.length;
  const successRate = pct(success,total);
  const studentName = profile?.display_name || "Schüler:in";
  const assignedCount = new Set((assignments ?? []).map((a: {scenario_id:string|null}) => a.scenario_id).filter(Boolean)).size;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f5ff] text-slate-950 print:bg-white">
      <div className="pointer-events-none fixed inset-0 print:hidden" aria-hidden="true"><div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet-300/25 blur-3xl"/><div className="absolute right-[-10rem] top-24 h-[30rem] w-[30rem] rounded-full bg-cyan-200/30 blur-3xl"/></div>
      <div className="relative mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-8 lg:px-10">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center print:hidden">
          <div><p className="text-[11px] font-black uppercase tracking-[.28em] text-violet-600">DR1FT / Learning Intelligence</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] md:text-5xl">Lernreport <span className="text-violet-600">— {studentName}</span></h1><p className="mt-2 text-sm text-slate-500">{classInfo?.name || "Klasse"} · Jahrgang {classInfo?.grade_level ?? "—"} · Schuljahr {classInfo?.school_year || "—"}</p></div>
          <div className="flex flex-wrap items-center gap-2"><a href="#gesamtfortschritt" className="rounded-full border border-violet-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-600">Gesamtfortschritt</a><a href="#drift-reports" className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-300/40">DR1FT-Report</a><PrintReportButton/><a href={`/classes/${classId}`} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Klassenübersicht ↗</a></div>
        </header>

        <section className="relative overflow-hidden rounded-[32px] bg-[#17142f] text-white shadow-[0_24px_80px_rgba(37,28,91,.22)]">
          <div className="absolute inset-y-0 right-0 w-[55%] bg-[radial-gradient(ellipse_at_65%_45%,rgba(125,65,255,.32),transparent_62%)]"/><div className="absolute -right-20 -top-44 h-[32rem] w-[32rem] rounded-full border border-white/10"/><div className="absolute right-8 -top-24 h-[25rem] w-[25rem] rounded-full border border-white/10"/>
          <div className="relative grid gap-7 p-6 md:p-8 lg:grid-cols-[1fr_1.1fr_1fr] lg:items-center">
            <div className="flex items-center gap-4"><img src={avatarUrl(profile?.avatar_seed || studentId)} alt="" className="h-20 w-20 rounded-[24px] border-4 border-white/20 bg-white/10 object-cover md:h-24 md:w-24"/><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Dein Lernprofil</p><h2 className="mt-1 text-3xl font-black">{studentName}</h2><p className="mt-1 text-sm text-white/55">@{profile?.username || "—"} · {classInfo?.name || "Klasse"}</p><span className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold text-emerald-200">● {total ? "Lernantworten ausgewertet" : "Noch keine Auswertung"}</span></div></div>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Dein bisheriger Lernstand</p><div className="mt-2 flex items-end gap-3"><span className="text-6xl font-black tracking-tight">{total ? `${successRate}%` : "—"}</span><span className="pb-2 text-xs text-white/55">Zielerreichung<br/>{total} bewertete Antworten</span></div><div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10"><div className="bg-emerald-400" style={{width:`${pct(success,total)}%`}}/><div className="bg-amber-300" style={{width:`${pct(partial,total)}%`}}/><div className="bg-rose-400" style={{width:`${pct(missed,total)}%`}}/></div><div className="mt-2 flex flex-wrap gap-4 text-[10px] text-white/60"><span>● {success} erreicht</span><span>● {partial} teilweise</span><span>● {missed} noch offen</span></div></div>
            <div className="grid grid-cols-2 gap-2"><div className="rounded-2xl border border-white/10 bg-white/[.07] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">DR1FTs</p><p className="mt-2 text-3xl font-black">{reports.length}</p><p className="text-[10px] text-white/45">mit Lernantworten</p></div><div className="rounded-2xl border border-white/10 bg-white/[.07] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Zuweisungen</p><p className="mt-2 text-3xl font-black">{assignedCount}</p><p className="text-[10px] text-white/45">aktive DR1FTs</p></div></div>
          </div>
        </section>

        <section id="drift-reports" className="space-y-5 scroll-mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-violet-600">01 / Individuelle Auswertung</p><h2 className="mt-1 text-2xl font-black md:text-3xl">Deine DR1FTs – und was noch fehlt</h2><p className="mt-1 text-sm text-slate-500">Jede Auswertung zeigt Aufgaben, deine konkrete Antwort und – sofern redaktionell hinterlegt – den fehlenden Baustein.</p></div><span className="rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-bold text-violet-700">{reports.length} Szenarien</span></div>
          {reports.length ? reports.map((report, reportIndex) => {
            const rows=report.answers;
            const s=rows.filter(x=>x.outcome==="success").length;
            const p=rows.filter(x=>x.outcome==="partial").length;
            const m=rows.filter(x=>x.outcome==="not_yet").length;
            const rate=pct(s,rows.length);
            const objectives = new Map<string, {title:string;rows:ScenarioAnswer[]}>();
            rows.forEach(row=>{const key=row.objective_id || row.objective_title || row.card_id;const item=objectives.get(key)??{title:row.objective_title || row.card_title,rows:[]};item.rows.push(row);objectives.set(key,item);});
            return <article key={report.id} className="overflow-hidden rounded-[30px] border border-white bg-white/90 shadow-[0_14px_50px_rgba(48,48,100,.08)]">
              <div className="relative overflow-hidden bg-gradient-to-r from-[#20183f] via-[#30205c] to-[#35226c] p-6 text-white md:p-8"><div className="absolute -right-12 -top-28 h-72 w-72 rounded-full border border-white/10"/><div className="relative flex flex-wrap items-center justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">DR1FT {String(reportIndex+1).padStart(2,"0")} / Szenario-Report</p><h3 className="mt-2 text-2xl font-black md:text-3xl">{report.title}</h3><p className="mt-2 text-sm text-white/55">{rows.length} ausgewertete Aufgaben · letzter Nachweis {dateLabel(rows[0].occurred_at)}</p></div><div className="flex items-center gap-4"><div className="grid h-24 w-24 place-items-center rounded-full p-[7px]" style={{background:`conic-gradient(#20d49a ${rate*3.6}deg,rgba(255,255,255,.16) 0deg)`}}><div className="grid h-full w-full place-items-center rounded-full bg-[#29204c]"><span className="text-2xl font-black">{rate}%</span></div></div><div className="max-w-32"><p className="text-xs font-bold">Zielerreichung</p><p className="mt-1 text-[10px] leading-4 text-white/50">Anteil der Antworten mit „Ziel erreicht“ – keine Punktnote.</p></div></div></div><div className="relative mt-6 grid grid-cols-3 gap-2"><div className="rounded-xl bg-emerald-400/15 p-3"><p className="text-2xl font-black text-emerald-300">{s}</p><p className="text-[10px] text-white/60">Ziel erreicht</p></div><div className="rounded-xl bg-amber-300/15 p-3"><p className="text-2xl font-black text-amber-200">{p}</p><p className="text-[10px] text-white/60">Teilweise</p></div><div className="rounded-xl bg-rose-400/15 p-3"><p className="text-2xl font-black text-rose-300">{m}</p><p className="text-[10px] text-white/60">Noch nicht erreicht</p></div></div></div>
              <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1.2fr_.8fr]">
                <div className="space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">Deine Lernziele</p><h4 className="mt-1 text-lg font-black">Wo du schon sicher bist – und wo noch etwas fehlt</h4></div>
                  {Array.from(objectives.values()).map((objective,index)=>{const os=objective.rows.filter(x=>x.outcome==="success").length;const op=objective.rows.filter(x=>x.outcome==="partial").length;const om=objective.rows.filter(x=>x.outcome==="not_yet").length;const objectiveRate=pct(os,objective.rows.length);return <div key={index} className="rounded-2xl border border-slate-200/80 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${om||op?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>{om||op?"!":"✓"}</span><div><p className="font-bold">{objective.title}</p><p className="text-[10px] text-slate-400">{objective.rows.length} Nachweis(e)</p></div></div><span className="text-xl font-black">{objectiveRate}%</span></div><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100"><div className="bg-emerald-400" style={{width:`${pct(os,objective.rows.length)}%`}}/><div className="bg-amber-300" style={{width:`${pct(op,objective.rows.length)}%`}}/><div className="bg-rose-400" style={{width:`${pct(om,objective.rows.length)}%`}}/></div></div>})}
                </div>
                <aside className="space-y-3"><div className="rounded-2xl bg-gradient-to-br from-violet-50 to-cyan-50 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-700">Dein Lernfazit</p><p className="mt-2 text-sm leading-6 text-slate-700">{m+ p ? `In ${m+p} Aufgabe(n) ist noch nicht alles sicher. Schau dir besonders die markierten Antworten und Hinweise an.` : "Alle bisher bewerteten Antworten dieser DR1FT wurden als Ziel erreicht markiert."}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rose-600">Hier liegen noch Punkte</p>{rows.filter(x=>x.outcome!=="success").length ? <ul className="mt-3 space-y-2">{rows.filter(x=>x.outcome!=="success").map(row=><li key={row.response_id} className="flex gap-2 text-xs leading-5 text-slate-700"><span className="mt-1 text-rose-500">●</span><span><strong>{row.card_title}:</strong> {row.outcome==="partial"?"teilweise erreicht":"noch nicht erreicht"}</span></li>)}</ul> : <p className="mt-2 text-xs leading-5 text-slate-500">In dieser DR1FT ist aktuell kein offener Lernnachweis markiert.</p>}</div></aside>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/70 p-5 md:p-7"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">02 / Aufgaben im Detail</p><h4 className="mt-1 text-xl font-black">Deine Antworten – und was du daraus mitnehmen kannst</h4></div><div className="grid gap-3 lg:grid-cols-2">{rows.map((row,index)=><div key={row.response_id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-black text-violet-700">{index+1}</span><div className="min-w-0"><p className="font-bold">{row.card_title}</p>{row.objective_title && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600">{row.objective_title}</p>}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone(row.outcome)}`}>{label(row.outcome)}</span></div>{row.card_prompt && <p className="mt-3 text-xs leading-5 text-slate-500">{row.card_prompt}</p>}<div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-[.16em] text-slate-400">Deine gewählte Antwort</p><p className="mt-1 text-sm font-semibold text-slate-800">{row.selected_option_label}</p></div>{row.outcome!=="success" && <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-700">Was noch fehlt</p>{row.selected_option_feedback ? <p className="mt-1 text-xs leading-5 text-amber-900">{row.selected_option_feedback}</p> : row.recommended_option_label ? <><p className="mt-1 text-xs leading-5 text-amber-900">Als vollständig passende Antwort ist im Lernmaterial hinterlegt:</p><p className="mt-1 text-xs font-bold text-amber-950">{row.recommended_option_label}</p></> : <p className="mt-1 text-xs leading-5 text-amber-900">Für diese Aufgabe ist noch kein konkreter redaktioneller Feedbacktext hinterlegt. Die Antwort ist als {row.outcome==="partial"?"teilweise erreicht":"noch nicht erreicht"} markiert; eine genauere Erklärung können wir erst anzeigen, wenn sie im Lernmaterial gepflegt ist.</p>}</div>}<p className="mt-3 text-[10px] text-slate-400">Bearbeitet: {dateLabel(row.occurred_at)}</p></div>)}</div></div>
            </article>
          }) : <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/80 p-10 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-100 text-3xl text-violet-600">◎</div><h3 className="mt-4 text-xl font-black">Noch keine individuellen DR1FT-Nachweise</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Sobald Marie Lernkarten in einer zugewiesenen DR1FT beantwortet, erscheint hier die konkrete Aufgabe, ihre gewählte Antwort und das hinterlegte Feedback.</p></div>}
          {reportError && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Die Szenario-Auswertung konnte nicht geladen werden. Bitte zuerst die neue Supabase-Migration ausführen. {reportError}</p>}
        </section>

        <section id="gesamtfortschritt" className="scroll-mt-6 rounded-[28px] border border-white bg-white/80 p-6 shadow-[0_12px_40px_rgba(48,48,100,.06)]"><p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-600">03 / Gesamtfortschritt</p><h2 className="mt-1 text-xl font-black">Entwicklung über alle DR1FTs</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Hier bündeln wir die Ergebnisse aus den einzelnen Szenario-Reports. Ein belastbarer Kompetenzverlauf und ein Vergleich mit dem Klassenschnitt werden ergänzt, sobald Lernziele szenarioübergreifend eindeutig verknüpft und die Vergleichswerte verfügbar sind. Bis dahin zeigen wir keine erfundenen Kompetenzstände oder Klassenmittelwerte.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-violet-50 p-4"><p className="text-2xl font-black text-violet-700">{reports.length}</p><p className="text-xs text-violet-900/70">DR1FTs mit Antworten</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-2xl font-black text-emerald-700">{success}</p><p className="text-xs text-emerald-900/70">Ziele erreicht</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-2xl font-black text-amber-700">{partial+missed}</p><p className="text-xs text-amber-900/70">Noch zu vertiefen</p></div></div></section>
        <footer className="pb-5 text-center text-[10px] tracking-wide text-slate-400 print:hidden">DR1FT · Learning Intelligence · Bewertet werden ausschließlich gespeicherte Antworten aus den jeweiligen DR1FTs. Keine privaten Nachrichten, keine bloßen Feed-Aufrufe und keine geschätzten Werte.</footer>
      </div>
    </main>
  );
}
