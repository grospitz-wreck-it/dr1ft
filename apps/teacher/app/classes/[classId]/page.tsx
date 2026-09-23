import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ScenarioToggle } from "./ScenarioToggle";
import { CopyAccessCodeButton } from "./CopyAccessCodeButton";
import { StudentRoster } from "./StudentRoster";

interface Props { params: { classId: string } }
const EVENT_LABELS: Record<string, string> = { PostViewed: "Post ansehen", CommentCreated: "Kommentar schreiben", NpcReplySelected: "NPC-Antwort wählen" };

export default async function ClassDetailPage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { classId } = params;
  const { data: classInfo } = await supabase.from("class_instances").select("id, name, access_code, is_active, grade_level, school_year, previous_instance_id").eq("id", classId).maybeSingle();
  const { data: roster } = await supabase.from("class_instance_memberships").select("user_id, role, joined_at, left_at, user_profiles(display_name, username, avatar_seed)").eq("class_instance_id", classId).is("left_at", null);
  const students = (roster ?? []).filter((r: any) => r.role === "student").map((r: any) => ({ user_id: r.user_id, display_name: r.user_profiles?.display_name ?? null, username: r.user_profiles?.username ?? null, avatar_seed: r.user_profiles?.avatar_seed ?? null }));
  const { data: allScenarios } = await supabase.from("scenarios").select("*");
  const { data: assignments } = await supabase.from("class_instance_scenario_assignments").select("scenario_id, pacing_mode").eq("class_instance_id", classId);
  const assignedIds = new Set((assignments ?? []).map((a) => a.scenario_id));
  const pacingByScenario = new Map((assignments ?? []).map((a) => [a.scenario_id, a.pacing_mode]));
  const assignedScenarioIds = Array.from(assignedIds);
  const { data: missions } = assignedScenarioIds.length ? await supabase.from("missions").select("*, scenarios(title)").in("scenario_id", assignedScenarioIds).eq("status", "live") : { data: [] };
  const { data: session } = await supabase.auth.getSession();
  const dashboardRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`, { method: "POST", headers: { Authorization: `Bearer ${session.session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ classId }), cache: "no-store" });
  const dashboard = await dashboardRes.json();
  const studentRows = new Map<string, { name: string; competencies: Record<string, number>; completed: number; total: number }>();
  (dashboard.studentCompetencyProgress ?? []).forEach((row: any) => { if (!studentRows.has(row.user_id)) studentRows.set(row.user_id, { name: row.display_name, competencies: {}, completed: 0, total: 0 }); if (row.competency_title) studentRows.get(row.user_id)!.competencies[row.competency_title] = row.level ?? 1; });
  (dashboard.studentMissionProgress ?? []).forEach((row: any) => { if (!studentRows.has(row.user_id)) studentRows.set(row.user_id, { name: row.display_name, competencies: {}, completed: 0, total: 0 }); const entry = studentRows.get(row.user_id)!; entry.completed = Number(row.missions_completed); entry.total = Number(row.missions_total); });
  const allCompetencyTitles = Array.from(new Set((dashboard.studentCompetencyProgress ?? []).map((r: any) => r.competency_title).filter(Boolean)));
  if (!classInfo) return <div className="px-6 py-5 text-sm text-slate-500">Klasseninstanz nicht gefunden.</div>;

  return (
    <div className="px-5 py-6 md:px-8 max-w-6xl mx-auto space-y-8">
      <header className="rounded-3xl bg-slate-950 text-white p-7 md:p-9 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Klasseninstanz · {classInfo.school_year}</p><h1 className="text-3xl font-semibold tracking-tight mt-2">{classInfo.name}</h1><p className="text-sm text-slate-400 mt-2">Jahrgang {classInfo.grade_level ?? "—"} · {students.length} aktive Schüler:innen</p></div>
          <span className={`self-start text-xs px-3 py-1.5 rounded-full ${classInfo.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-300"}`}>{classInfo.is_active ? "Aktiv" : "Inaktiv"}</span>
        </div>
        <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white/5 border border-white/10 p-4"><div><p className="text-xs uppercase tracking-wide text-slate-400">Schüler-Zugangscode</p><p className="text-2xl font-mono font-semibold tracking-[0.18em] mt-1">{classInfo.access_code}</p></div><CopyAccessCodeButton code={classInfo.access_code} /></div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Aktive Schüler:innen" value={students.length} detail="direkt verwaltbar" />
        <MetricCard label="Freigeschaltete Module" value={assignedIds.size} detail="für diese Klasse" />
        <MetricCard label="Missionen" value={missions?.length ?? 0} detail="im aktuellen Setup" />
      </section>

      <StudentRoster classId={classId} initialStudents={students} />

      <section><div className="flex items-end justify-between mb-3"><div><h2 className="text-lg font-semibold text-slate-900">Pädagogischer Überblick</h2><p className="text-sm text-slate-500 mt-1">Wo die Klasse gut vorankommt und wo Unterstützung sinnvoll ist.</p></div><a href={`/grades/lookup?classId=${classId}`} className="text-sm font-medium text-accent hover:text-accent-hover">Jahrgangsübersicht →</a></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Kompetenzentwicklung"><div className="divide-y divide-border">{dashboard.competencyOverview?.map((row: any) => <div key={row.competency_id} className="px-5 py-3 flex justify-between text-sm"><span className="text-slate-700">{row.competency_title}</span><span className="text-slate-500">Ø {row.avg_level} / 5</span></div>)}{(!dashboard.competencyOverview || dashboard.competencyOverview.length === 0) && <p className="p-5 text-sm text-slate-400">Noch keine Kompetenzdaten.</p>}</div></Panel>
          <Panel title="Wo gibt es Schwierigkeiten"><div className="divide-y divide-border">{dashboard.missionBottlenecks?.slice(0, 5).map((row: any) => <div key={row.mission_id} className="px-5 py-3 flex justify-between items-center text-sm"><span>{row.mission_title}</span><span className={`text-xs px-2 py-1 rounded-full ${row.completion_rate < 0.4 ? "bg-red-50 text-red-700" : row.completion_rate < 0.7 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{Math.round(row.completion_rate * 100)}%</span></div>)}{(!dashboard.missionBottlenecks || dashboard.missionBottlenecks.length === 0) && <p className="p-5 text-sm text-slate-400">Noch keine Daten.</p>}</div></Panel>
        </div>
      </section>

      <section><h2 className="text-lg font-semibold text-slate-900 mb-3">Modulsteuerung</h2><Panel title="Freigeschaltete Szenarien"><div className="divide-y divide-border">{allScenarios?.map((s) => <ScenarioToggle key={s.id} classId={classId} scenarioId={s.id} title={s.title} ageRating={s.age_rating} initiallyAssigned={assignedIds.has(s.id)} initialPacingMode={(pacingByScenario.get(s.id) as "compact" | "as_designed") ?? "compact"} />)}</div></Panel></section>

      <section><h2 className="text-lg font-semibold text-slate-900 mb-3">Missionen &amp; Lernaktivitäten</h2><Panel title="Aktuelle Missionen"><div className="divide-y divide-border">{missions?.map((m: any) => <div key={m.id} className="px-5 py-3 flex justify-between items-start text-sm"><div><p className="font-medium text-slate-900">{m.title}</p><p className="text-xs text-slate-400">{m.scenarios?.title}</p></div><span className="text-xs text-slate-500">{EVENT_LABELS[m.trigger_condition?.event] ?? m.trigger_condition?.event} × {m.trigger_condition?.count ?? 1}</span></div>)}{(!missions || missions.length === 0) && <p className="p-5 text-sm text-slate-400">Noch keine Missionen.</p>}</div></Panel></section>

      <section><h2 className="text-lg font-semibold text-slate-900 mb-3">Fortschritt pro Schüler:in</h2><Panel title="Kompetenzen & Missionen"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-slate-400"><th className="px-5 py-3">Schüler:in</th>{allCompetencyTitles.map((t) => <th key={t as string} className="px-3 py-3">{t as string}</th>)}<th className="px-3 py-3">Missionen</th></tr></thead><tbody>{Array.from(studentRows.values()).map((s, i) => <tr key={i} className="border-b border-border last:border-0"><td className="px-5 py-3 text-slate-900">{s.name}</td>{allCompetencyTitles.map((t) => <td key={t as string} className="px-3 py-3 text-slate-500">{s.competencies[t as string] ?? "—"}/5</td>)}<td className="px-3 py-3 text-slate-500">{s.completed}/{s.total}</td></tr>)}{studentRows.size === 0 && <tr><td colSpan={2 + allCompetencyTitles.length} className="px-5 py-6 text-center text-slate-400">Noch keine Daten.</td></tr>}</tbody></table></div></Panel></section>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) { return <div className="rounded-2xl bg-panel border border-border p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-400">{label}</p><p className="text-3xl font-semibold text-slate-900 mt-2">{value}</p><p className="text-sm text-slate-500 mt-1">{detail}</p></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-panel border border-border rounded-2xl overflow-hidden shadow-sm"><div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold text-slate-900">{title}</h3></div>{children}</div>; }
