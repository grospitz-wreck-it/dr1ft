"use client";

import { useState, useTransition } from "react";
import { BarChart3, CheckCircle2, Loader2, ShieldCheck, Target, Users } from "lucide-react";
import { loadClassAggregateReport } from "./classDashboardActions";

type ModuleRow = { scenario_id: string; title: string; responses: number; participants: number; success: number; partial: number; not_yet: number };
type AggregateReport = {
  total_students: number;
  participating_students: number;
  response_count: number;
  success_count: number;
  partial_count: number;
  not_yet_count: number;
  modules: ModuleRow[];
  scope: "school_aggregate" | "class_teacher_aggregate" | "own_modules_aggregate";
};

export function ClassDashboardInsights({ classId }: {
  classId: string;
  students: Array<{ user_id: string; display_name: string | null; username: string | null; avatar_seed?: string | null }>;
  activeAssignmentTitle: string | null;
}) {
  const [report, setReport] = useState<AggregateReport | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function createReport() {
    if (pending || report) return;
    setError("");
    startTransition(async () => {
      try {
        setReport(await loadClassAggregateReport(classId) as AggregateReport);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Das Klassenreporting konnte nicht geladen werden.");
      }
    });
  }

  const scopeLabel = report?.scope === "school_aggregate"
    ? "Schulweite Rolle · aggregierte Klassenwerte"
    : report?.scope === "class_teacher_aggregate"
      ? "Klassenleitung · aggregierte Gesamtklasse"
      : "Eigene Modulzuweisungen · aggregierte Werte";

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(115deg,#fff_0%,#faf8ff_60%,#f0fbff_100%)] shadow-sm">
      <header className="flex flex-col gap-4 border-b border-violet-100/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><BarChart3 className="h-5 w-5" /></span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-600">DR1FT / INSIGHTS</p>
            <h3 className="mt-1 text-base font-bold text-slate-950">Lernreporting der Klasse</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Aggregierte Lernnachweise und Modulübersichten. Es werden keine individuellen Schülerprofile oder Einzelantworten angezeigt.</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Rollen- und modulbezogene Berechtigungsprüfung</p>
          </div>
        </div>
        {!report && <button type="button" onClick={createReport} disabled={pending} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60">
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird erstellt …</> : "Klassenreport erstellen"}
        </button>}
        {report && <button type="button" onClick={() => setReport(null)} className="rounded-xl border border-violet-200 bg-white px-3.5 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50">Report schließen</button>}
      </header>
      {error && <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {report && <>
        <div className="px-5 pt-4 sm:px-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-violet-700"><ShieldCheck className="h-3.5 w-3.5" />{scopeLabel}</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-7">
          <Metric label="Schüler:innen" value={report.total_students} detail="Aktive Klassenmitglieder" icon={<Users className="h-4 w-4" />} tone="blue" />
          <Metric label="Aktiv beteiligt" value={report.participating_students} detail="Mit Lernnachweisen" icon={<Target className="h-4 w-4" />} tone="violet" />
          <Metric label="Antworten" value={report.response_count} detail="Neuester Stand je Lernkarte" icon={<BarChart3 className="h-4 w-4" />} tone="cyan" />
          <Metric label="Vollständig" value={report.success_count} detail={`${report.partial_count} teilweise · ${report.not_yet_count} noch nicht erreicht`} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        </div>
        <div className="border-t border-slate-100 px-5 py-5 sm:px-7">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-slate-900">Module im Überblick</h4><p className="mt-0.5 text-xs text-slate-500">Nur zusammengefasste Werte, keine Zuordnung zu einzelnen Personen.</p></div><span className="text-[10px] font-semibold text-slate-400">{report.modules.length} Module</span></div>
          {report.modules.length ? <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Modul</th><th className="px-4 py-3 text-right">Teilnehmende</th><th className="px-4 py-3 text-right">Antworten</th><th className="px-4 py-3 text-right">Vollständig</th><th className="px-4 py-3 text-right">Teilweise</th><th className="px-4 py-3 text-right">Übungsbedarf</th></tr></thead>
              <tbody>{report.modules.map((module) => <tr key={module.scenario_id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{module.title}</td><td className="px-4 py-3 text-right tabular-nums text-slate-600">{module.participants}</td><td className="px-4 py-3 text-right tabular-nums text-slate-600">{module.responses}</td><td className="px-4 py-3 text-right tabular-nums text-emerald-700">{module.success}</td><td className="px-4 py-3 text-right tabular-nums text-amber-700">{module.partial}</td><td className="px-4 py-3 text-right tabular-nums text-rose-700">{module.not_yet}</td></tr>)}</tbody>
            </table>
          </div> : <div className="rounded-xl border border-dashed border-violet-200 bg-white/70 px-4 py-8 text-center text-xs text-slate-500">Für den freigegebenen Auswertungsbereich liegen noch keine Lernnachweise vor.</div>}
        </div>
      </>}
    </section>
  );
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: React.ReactNode; tone: "blue" | "violet" | "cyan" | "green" }) {
  const colors = { blue: "bg-sky-50 text-sky-700", violet: "bg-violet-50 text-violet-700", cyan: "bg-cyan-50 text-cyan-700", green: "bg-emerald-50 text-emerald-700" };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</span><p className="text-2xl font-extrabold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-700">{label}</p><p className="mt-0.5 text-[10px] text-slate-400">{detail}</p></div>;
}
