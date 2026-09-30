import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ScenarioToggle } from "./ScenarioToggle";
import { ResetPasswordButton } from "./ResetPasswordButton";
import { AddStudentForm } from "./AddStudentForm";
import { CopyAccessCodeButton } from "./CopyAccessCodeButton";
import { GenerateReportButton } from "./GenerateReportButton";
import { changeClassState as setClassActive } from "../actions";

export default async function ClassDetailPage({ params }: { params: { classId: string } }) {
  const supabase = supabaseServerClient();
  const { classId } = params;

  const { data: instance } = await supabase
    .from("class_instances")
    .select("id,name,access_code,is_active,grade_level,school_year,school_id")
    .eq("id", classId)
    .maybeSingle();

  if (!instance) return <div className="max-w-3xl mx-auto px-5 py-10 text-sm text-slate-500">Klasseninstanz nicht gefunden.</div>;

  const [{ data: roster }, { data: scenarios }, { data: assignments }, { data: school }] = await Promise.all([
    supabase.from("class_instance_memberships").select("user_id,role,left_at,user_profiles(display_name,username)").eq("class_instance_id", classId).is("left_at", null),
    supabase.from("scenarios").select("id,title,age_rating").order("title"),
    supabase.from("class_instance_scenario_assignments").select("scenario_id,pacing_mode,scenarios(title)").eq("class_instance_id", classId),
    instance.school_id ? supabase.from("schools").select("id,name,city").eq("id", instance.school_id).maybeSingle() : Promise.resolve({data:null}),
  ]);

  const students = (roster ?? []).filter((r:any)=>r.role==="student");
  const activeAssignment = (assignments ?? [])[0] as any;
  const activeModule = activeAssignment?.scenarios?.title ?? null;

  const { data: session } = await supabase.auth.getSession();
  const dashboardRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`, {
    method:"POST",
    headers:{Authorization:`Bearer ${session.session?.access_token}`,"Content-Type":"application/json"},
    body:JSON.stringify({classId}),
    cache:"no-store",
  });
  const dashboard = await dashboardRes.json().catch(()=>({}));

  const competencyRows = dashboard.studentCompetencyProgress ?? [];
  const missionRows = dashboard.studentMissionProgress ?? [];
  const competencyLevels = competencyRows.map((r:any)=>Number(r.level??0)).filter((n:number)=>n>0);
  const average = competencyLevels.length ? competencyLevels.reduce((a:number,b:number)=>a+b,0)/competencyLevels.length : null;
  const missionCompleted = missionRows.reduce((n:number,r:any)=>n+Number(r.missions_completed??0),0);
  const missionTotal = missionRows.reduce((n:number,r:any)=>n+Number(r.missions_total??0),0);

  return (
    <div className="bg-slate-50 min-h-screen px-5 py-7 md:px-8">
      <div className="max-w-7xl mx-auto space-y-7">
        <header className="bg-white border border-border rounded-3xl p-6 md:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <a href="/classes" className="text-xs text-slate-400 hover:text-slate-700">← Meine Klassen</a>
              <div className="flex items-center gap-3 mt-3">
                <h1 className="text-3xl font-semibold text-slate-900">{instance.name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full ${instance.is_active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{instance.is_active?"Aktiv":"Pausiert"}</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Jahrgang {instance.grade_level??"—"} · Schuljahr {instance.school_year} · {school?.name??"Schule nicht zugeordnet"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={setClassActive.bind(null,classId,!instance.is_active)}><button className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{instance.is_active?"Klasse pausieren":"Klasse aktivieren"}</button></form>
              <a href={`/grades/lookup?classId=${classId}`} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700">Jahrgang</a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-7">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Schüler:innen</p><p className="text-2xl font-semibold mt-1">{students.length}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Aktives Modul</p><p className="text-sm font-semibold mt-2">{activeModule??"Keines"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Ø Kompetenz</p><p className="text-2xl font-semibold mt-1">{average===null?"—":average.toFixed(1)} / 5</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Missionen</p><p className="text-2xl font-semibold mt-1">{missionCompleted}/{missionTotal||"—"}</p></div>
          </div>
        </header>

        <section className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div><h2 className="text-lg font-semibold text-slate-900">Aktives Modul</h2><p className="text-sm text-slate-500 mt-1">Pro Klasse kann immer nur ein Modul aktiv sein.</p></div>
            <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">{activeModule?"1 Modul aktiv":"Kein Modul aktiv"}</div>
          </div>
          <ul className="divide-y divide-border">
            {(scenarios??[]).map((s:any)=><ScenarioToggle key={s.id} classId={classId} scenarioId={s.id} title={s.title} ageRating={s.age_rating} initiallyAssigned={activeAssignment?.scenario_id===s.id} initialPacingMode={activeAssignment?.pacing_mode??"compact"}/>)}
            {(!scenarios || scenarios.length===0)&&<li className="p-6 text-sm text-slate-400">Noch keine Module verfügbar.</li>}
          </ul>
        </section>

        <section className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div><h2 className="text-lg font-semibold text-slate-900">Schüler:innen</h2><p className="text-sm text-slate-500 mt-1">{students.length} aktive Schüler:innen · Reports und Zugangsdaten direkt hier.</p></div>
            <AddStudentForm classId={classId}/>
          </div>
          <div className="divide-y divide-border">
            {students.map((r:any)=><div key={r.user_id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-50 grid place-items-center text-sm font-semibold text-indigo-700">{(r.user_profiles?.display_name??r.user_profiles?.username??"?").slice(0,1).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">{r.user_profiles?.display_name??"Ohne Anzeigename"}</p><p className="text-sm text-slate-500">@{r.user_profiles?.username??"—"}</p></div>
              <div className="flex flex-wrap gap-2">
                <GenerateReportButton classId={classId} studentUserId={r.user_id}/>
                <ResetPasswordButton studentUserId={r.user_id} classId={classId}/>
              </div>
            </div>)}
            {students.length===0&&<div className="p-8 text-center text-sm text-slate-400">Noch keine Schüler:innen. Lege den ersten Account oben an.</div>}
          </div>
        </section>

        <section className="bg-white border border-border rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Schüler-Zugang</p><p className="text-2xl font-mono font-semibold tracking-[0.18em] mt-1">{instance.access_code}</p><p className="text-sm text-slate-500 mt-1">Mit diesem Code können Schüler:innen der Klasse beitreten.</p></div>
            <CopyAccessCodeButton code={instance.access_code}/>
          </div>
        </section>

        <section className="bg-white border border-border rounded-3xl shadow-sm">
          <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">Wo gibt es Schwierigkeiten?</h2><p className="text-sm text-slate-500 mt-1">Missionen mit niedriger Abschlussquote in dieser Klasse.</p></div>
          <div className="divide-y divide-border">{(dashboard.missionBottlenecks??[]).slice(0,5).map((r:any)=><div key={r.mission_id} className="px-6 py-4 flex justify-between gap-4 text-sm"><span>{r.mission_title}</span><span className="font-medium">{Math.round(Number(r.completion_rate??0)*100)} %</span></div>)}{!(dashboard.missionBottlenecks?.length)&&<div className="p-6 text-sm text-slate-400">Noch keine Auswertungsdaten vorhanden.</div>}</div>
        </section>
      </div>
    </div>
  );
}