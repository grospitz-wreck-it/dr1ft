// apps/teacher/app/classes/[classId]/page.tsx
// Kernstück des Lehrer-Dashboards:
// - Roster, Szenario-Freigabe
// - Aggregierter Fortschritt + Pro-Schüler-"Notenbuch" + Engpass-Analyse
//   (alles über die abgesicherte Edge Function / SECURITY DEFINER-Funktionen)
// - Modul-/Missionsübersicht (welche Aufgaben mit welcher Ausrichtung)

import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ScenarioToggle } from "./ScenarioToggle";
import { ResetPasswordButton } from "./ResetPasswordButton";

interface Props {
  params: { classId: string };
}

const EVENT_LABELS: Record<string, string> = {
  PostViewed: "Post ansehen",
  CommentCreated: "Kommentar schreiben",
  NpcReplySelected: "NPC-Antwort wählen",
};

export default async function ClassDetailPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { classId } = params;

  const { data: roster } = await supabase
    .from("class_memberships")
    .select("user_id, role, user_profiles(display_name)")
    .eq("class_id", classId);

  const { data: allScenarios } = await supabase.from("scenarios").select("*");
  const { data: assignments } = await supabase
    .from("class_scenario_assignments")
    .select("scenario_id, pacing_mode")
    .eq("class_id", classId);
  const assignedIds = new Set((assignments ?? []).map((a) => a.scenario_id));
  const pacingByScenario = new Map((assignments ?? []).map((a) => [a.scenario_id, a.pacing_mode]));

  // Modul-/Missionsübersicht: direkter Read, keine Edge Function nötig
  // (missions hat "authenticated read" RLS, siehe 0008)
  const assignedScenarioIds = [...assignedIds];
  const { data: missions } = assignedScenarioIds.length
    ? await supabase
        .from("missions")
        .select("*, scenarios(title)")
        .in("scenario_id", assignedScenarioIds)
        .eq("status", "live")
    : { data: [] };

  const { data: session } = await supabase.auth.getSession();
  const dashboardRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ classId }),
    }
  );
  const dashboard = await dashboardRes.json();

  // Pro-Schüler-Daten zu einer Zeile pro Schüler:in zusammenführen
  // (die Funktionen liefern flache Zeilen, hier client-seitig gruppiert)
  const studentRows = new Map<string, { name: string; competencies: Record<string, number>; completed: number; total: number }>();
  (dashboard.studentCompetencyProgress ?? []).forEach((row: any) => {
    if (!studentRows.has(row.user_id)) {
      studentRows.set(row.user_id, { name: row.display_name, competencies: {}, completed: 0, total: 0 });
    }
    if (row.competency_title) {
      studentRows.get(row.user_id)!.competencies[row.competency_title] = row.level ?? 1;
    }
  });
  (dashboard.studentMissionProgress ?? []).forEach((row: any) => {
    if (!studentRows.has(row.user_id)) {
      studentRows.set(row.user_id, { name: row.display_name, competencies: {}, completed: 0, total: 0 });
    }
    const entry = studentRows.get(row.user_id)!;
    entry.completed = Number(row.missions_completed);
    entry.total = Number(row.missions_total);
  });
  const allCompetencyTitles = [...new Set((dashboard.studentCompetencyProgress ?? []).map((r: any) => r.competency_title).filter(Boolean))];

  return (
    <div className="px-6 py-5 max-w-4xl space-y-8">
      <h1 className="text-lg font-semibold text-slate-900">Klassenübersicht</h1>

      {/* Modul-/Missionsübersicht */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">
          Module &amp; Missionen dieser Klasse
        </h2>
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {missions?.map((m: any) => (
            <div key={m.id} className="px-4 py-3 flex justify-between items-start text-sm">
              <div>
                <p className="font-medium text-slate-900">{m.title}</p>
                <p className="text-xs2 text-slate-400">{m.scenarios?.title}</p>
              </div>
              <span className="text-xs2 text-slate-500">
                {EVENT_LABELS[m.trigger_condition?.event] ?? m.trigger_condition?.event} × {m.trigger_condition?.count ?? 1}
              </span>
            </div>
          ))}
          {(!missions || missions.length === 0) && (
            <p className="px-4 py-3 text-sm text-slate-400">Noch keine Module für die freigeschalteten Szenarien.</p>
          )}
        </div>
      </section>

      {/* Wo gibt es Schwierigkeiten */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">
          Wo gibt es Schwierigkeiten
        </h2>
        <p className="text-xs2 text-slate-400 mb-2">
          Missionen mit der niedrigsten Abschlussquote in dieser Klasse — mögliche
          Curriculum-Stellen, die im Unterricht nachbesprochen werden sollten.
        </p>
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {dashboard.missionBottlenecks?.slice(0, 5).map((row: any) => (
            <div key={row.mission_id} className="px-4 py-3 flex justify-between items-center text-sm">
              <span className="text-slate-900">{row.mission_title}</span>
              <span
                className={`text-xs2 px-2 py-0.5 rounded-full text-white ${
                  row.completion_rate < 0.4 ? "bg-status-rejected" : row.completion_rate < 0.7 ? "bg-status-review" : "bg-status-live"
                }`}
              >
                {Math.round(row.completion_rate * 100)}% ({row.completed_count}/{row.student_count})
              </span>
            </div>
          ))}
          {(!dashboard.missionBottlenecks || dashboard.missionBottlenecks.length === 0) && (
            <p className="px-4 py-3 text-sm text-slate-400">Noch keine Daten.</p>
          )}
        </div>
      </section>

      {/* Klassendurchschnitt */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">Kompetenzentwicklung (Klassendurchschnitt)</h2>
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {dashboard.competencyOverview?.map((row: any) => (
            <div key={row.competency_id} className="px-4 py-2 flex justify-between text-sm">
              <span className="text-slate-700">{row.competency_title}</span>
              <span className="text-slate-500">Ø {row.avg_level} / 5 ({row.student_count} Schüler:innen)</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pro-Schüler-"Notenbuch" — bewusst nur Kompetenz-Level + Missions-
          fortschritt, KEINE Einzelauswertung "hat auf Post X reagiert" */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">
          Fortschritt pro Schüler:in
        </h2>
        <p className="text-xs2 text-slate-400 mb-2">
          Nur für dich sichtbar. Zeigt Kompetenz-Level und Missions-Fortschritt —
          keine Einzelauswertung, welcher Post angeklickt/geliked wurde.
        </p>
        <div className="bg-panel border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-slate-400 text-xs2 uppercase">
                <th className="px-4 py-2">Schüler:in</th>
                {allCompetencyTitles.map((t) => (
                  <th key={t as string} className="px-3 py-2">{t as string}</th>
                ))}
                <th className="px-3 py-2">Missionen</th>
              </tr>
            </thead>
            <tbody>
              {[...studentRows.values()].map((s, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-slate-900">{s.name}</td>
                  {allCompetencyTitles.map((t) => (
                    <td key={t as string} className="px-3 py-2 text-slate-500">
                      {s.competencies[t as string] ?? "—"}/5
                    </td>
                  ))}
                  <td className="px-3 py-2 text-slate-500">{s.completed}/{s.total}</td>
                </tr>
              ))}
              {studentRows.size === 0 && (
                <tr><td colSpan={2 + allCompetencyTitles.length} className="px-4 py-4 text-center text-slate-400">Noch keine Daten.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Szenario-Freigabe */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">Freigeschaltete Szenarien</h2>
        <ul className="bg-panel border border-border rounded-lg divide-y divide-border">
          {allScenarios?.map((s) => (
            <ScenarioToggle
              key={s.id}
              classId={classId}
              scenarioId={s.id}
              title={s.title}
              ageRating={s.age_rating}
              initiallyAssigned={assignedIds.has(s.id)}
              initialPacingMode={(pacingByScenario.get(s.id) as "compact" | "as_designed") ?? "compact"}
            />
          ))}
        </ul>
      </section>

      {/* Roster */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase text-xs2 mb-2">Klassenmitglieder</h2>
        <ul className="bg-panel border border-border rounded-lg divide-y divide-border">
          {roster?.map((r: any) => (
            <li key={r.user_id} className="px-4 py-2 text-sm flex items-center justify-between gap-3">
              <span className="text-slate-700">{r.user_profiles?.display_name ?? "—"} · {r.role}</span>
              {r.role === "student" && (
                <ResetPasswordButton studentUserId={r.user_id} classId={classId} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs2 text-slate-400">
        Jahrgangsweite Auswertung? Falls diese Klasse einen Jahrgang hat:{" "}
        <a href={`/grades/lookup?classId=${classId}`} className="text-accent hover:text-accent-hover">
          zur Jahrgangs-Übersicht
        </a>
      </p>
    </div>
  );
}
