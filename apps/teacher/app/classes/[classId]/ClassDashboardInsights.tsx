"use client";

import { useState } from "react";
import { BarChart3, Loader2, ShieldCheck } from "lucide-react";
import { loadClassDashboardReport } from "./classDashboardActions";
import { ClassLearningInsights } from "./ClassLearningInsights";

type Student = { user_id: string; display_name: string | null; username: string | null; avatar_seed?: string | null };

export function ClassDashboardInsights({ classId, students, activeAssignmentTitle }: {
  classId: string;
  students: Student[];
  activeAssignmentTitle: string | null;
}) {
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createReport() {
    if (loading || dashboard) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loadClassDashboardReport(classId);
      setDashboard(result ?? {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Das Lernreporting konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  if (!dashboard) {
    return (
      <section className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(115deg,#fff_0%,#faf8ff_60%,#f0fbff_100%)] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><BarChart3 className="h-5 w-5" /></span>
            <div>
              <h3 className="text-base font-bold text-slate-950">Lernreporting der Klasse</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Kompetenzentwicklung, Lernnachweise, Missionsfortschritt und mögliche Lernhürden werden erst ausgewertet, wenn du den Report ausdrücklich erstellst.</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Klassenbezogene Auswertung · nur für berechtigte Lehrkräfte</p>
            </div>
          </div>
          <button type="button" onClick={createReport} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-70">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Report wird erstellt …</> : "Report erstellen"}
          </button>
        </div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </section>
    );
  }

  const competencyRows = dashboard.studentCompetencyProgress ?? [];
  const missionRows = dashboard.studentMissionProgress ?? [];
  const learningEvidenceRows = dashboard.studentLearningEvidence ?? [];
  const scenarioLearningCardInsights = dashboard.scenarioLearningCardInsights ?? [];
  const learningEvidenceTotals = learningEvidenceRows.reduce(
    (totals: { responses: number; assessed: number; successful: number; notYet: number }, row: any) => ({
      responses: totals.responses + Number(row.challenge_responses_submitted ?? 0),
      assessed: totals.assessed + Number(row.assessed_requirements ?? 0),
      successful: totals.successful + Number(row.successful_requirements ?? 0),
      notYet: totals.notYet + Number(row.not_yet_requirements ?? 0),
    }),
    { responses: 0, assessed: 0, successful: 0, notYet: 0 },
  );

  const studentRows = new Map<string, { name: string; competencies: Record<string, number>; completed: number; total: number }>();
  for (const row of competencyRows) {
    if (!row.user_id) continue;
    if (!studentRows.has(row.user_id)) studentRows.set(row.user_id, {
      name: row.display_name ?? row.username ?? "Schüler:in", competencies: {}, completed: 0, total: 0,
    });
    if (row.competency_title && row.level != null) studentRows.get(row.user_id)!.competencies[row.competency_title] = Number(row.level);
  }
  for (const row of missionRows) {
    if (!row.user_id) continue;
    if (!studentRows.has(row.user_id)) studentRows.set(row.user_id, {
      name: row.display_name ?? row.username ?? "Schüler:in", competencies: {}, completed: 0, total: 0,
    });
    const student = studentRows.get(row.user_id)!;
    student.completed += Number(row.missions_completed ?? 0);
    student.total += Number(row.missions_total ?? 0);
  }

  const allCompetencyTitles = Array.from(new Set<string>(
    competencyRows.map((row: any) => row.competency_title)
      .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0),
  ));
  const missionBottlenecks = (dashboard.missionBottlenecks ?? []).slice(0, 5);
  const competencyOverview = (dashboard.competencyOverview ?? []).filter(
    (row: any) => row.competency_id != null && Number(row.student_count ?? 0) > 0,
  );
  const levels = competencyRows.map((row: any) => Number(row.level ?? 0)).filter((level: number) => level > 0);
  const average = levels.length ? levels.reduce((a: number, b: number) => a + b, 0) / levels.length : null;
  const completed = missionRows.reduce((sum: number, row: any) => sum + Number(row.missions_completed ?? 0), 0);
  const total = missionRows.reduce((sum: number, row: any) => sum + Number(row.missions_total ?? 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-emerald-700">Report erstellt · Die Auswertung wurde auf deine Anforderung geladen.</p>
        <button type="button" onClick={() => { setDashboard(null); setError(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Report schließen</button>
      </div>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Schüler:innen" value={students.length} icon="users" tone="blue" />
        <Metric label="Aktives Modul" value={activeAssignmentTitle ?? "Keines"} icon="target" tone="violet" />
        <Metric label="Ø Kompetenz" value={average === null ? "—" : `${average.toFixed(1)} / 5`} icon="chart" tone="cyan" />
        <Metric label="Missionen" value={total ? `${completed}/${total}` : "—"} icon="check" tone="purple" />
      </section>
      <ClassLearningInsights
        students={students}
        studentRows={Object.fromEntries(studentRows.entries())}
        competencyTitles={allCompetencyTitles}
        evidence={learningEvidenceTotals}
        scenarioLearningCards={scenarioLearningCardInsights}
        competencies={competencyOverview.map((row: any) => ({
          competency_id: String(row.competency_id),
          competency_title: String(row.competency_title ?? "Kompetenz"),
          avg_level: Number(row.avg_level ?? 0),
          student_count: Number(row.student_count ?? 0),
        }))}
        bottlenecks={missionBottlenecks.map((row: any) => ({
          mission_id: String(row.mission_id),
          mission_title: String(row.mission_title ?? "Mission"),
          completion_rate: Number(row.completion_rate ?? 0),
          completed_count: Number(row.completed_count ?? 0),
          student_count: Number(row.student_count ?? 0),
        }))}
        average={average}
        completed={completed}
        total={total}
        classId={classId}
      />
    </div>
  );
}

function Metric({ label, value, icon, tone }: {
  label: string;
  value: string | number;
  icon: "users" | "target" | "chart" | "check";
  tone: "blue" | "violet" | "cyan" | "purple";
}) {
  const tones = {
    blue: "bg-sky-100 text-sky-600",
    violet: "bg-violet-100 text-violet-600",
    cyan: "bg-cyan-100 text-cyan-600",
    purple: "bg-fuchsia-100 text-fuchsia-600",
  };
  const glyphs = { users: "♟", target: "◎", chart: "▥", check: "✓" };
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-semibold " + tones[tone]}>{glyphs[icon]}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-950">{value}</p>
      </div>
    </div>
  );
}
