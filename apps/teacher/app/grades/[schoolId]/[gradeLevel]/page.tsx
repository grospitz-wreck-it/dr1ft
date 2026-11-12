// apps/teacher/app/grades/[schoolId]/[gradeLevel]/page.tsx

import { supabaseServerClient } from "../../../../lib/supabaseServerClient";

interface Props {
  params: { schoolId: string; gradeLevel: string };
}

export default async function GradeOverviewPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { schoolId, gradeLevel } = params;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gradeQuery: { schoolId, gradeLevel: Number(gradeLevel) },
      }),
    }
  );
  const dashboard = await res.json();

  if (dashboard.error) {
    return (
      <div className="px-6 py-5 max-w-3xl">
        <p className="text-sm text-status-rejected">{dashboard.error}</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Jahrgang {gradeLevel} — Übersicht
      </h1>
      <p className="text-sm text-slate-500">
        {dashboard.classOverview?.class_count ?? 0} Klassen in diesem Jahrgang
      </p>

      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">Kompetenzentwicklung (Jahrgangsdurchschnitt)</h2>
        <ul className="space-y-1">
          {dashboard.competencyOverview?.map((row: any) => (
            <li key={row.competency_id} className="flex justify-between text-sm border-b border-border py-2 px-1">
              <span>{row.competency_title}</span>
              <span>Ø {row.avg_level} / 5 ({row.student_count} Schüler:innen)</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">Missionen</h2>
        <ul className="space-y-1">
          {dashboard.missionOverview?.map((row: any) => (
            <li key={row.mission_id} className="flex justify-between text-sm border-b border-border py-2 px-1">
              <span>{row.mission_title}</span>
              <span>{row.completed_count} / {row.student_count} abgeschlossen</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs2 text-slate-400">
        Aggregiert über alle Klassen dieses Jahrgangs — keine Einzelauswertung
        pro Schüler:in oder Klasse sichtbar.
      </p>
    </div>
  );
}
