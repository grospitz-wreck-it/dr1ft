import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { ScenarioToggle } from "./ScenarioToggle";
import { CopyAccessCodeButton } from "./CopyAccessCodeButton";
import { StudentRoster } from "./StudentRoster";
import { changeClassState as setClassActive } from "../actions";

export default async function ClassDetailPage({params}:{params:{classId:string}}){
 const supabase=supabaseServerClient(); const {classId}=params;
 const {data:instance}=await supabase.from("class_instances").select("id,name,access_code,is_active,grade_level,school_year,school_id").eq("id",classId).maybeSingle();
 if(!instance)return <div className="max-w-3xl mx-auto px-5 py-10 text-sm text-slate-500">Klasseninstanz nicht gefunden.</div>;
 const [{data:roster},{data:scenarios},{data:assignments},{data:school}]=await Promise.all([
  supabase.from("class_instance_memberships").select("user_id,role,left_at,user_profiles(display_name,username,avatar_seed)").eq("class_instance_id",classId).is("left_at",null),
  supabase.from("scenarios").select("id,title,age_rating").order("title"),
  supabase.from("class_instance_scenario_assignments").select("scenario_id,pacing_mode,scenarios(title)").eq("class_instance_id",classId),
  instance.school_id?supabase.from("schools").select("id,name,region").eq("id",instance.school_id).maybeSingle():Promise.resolve({data:null})
 ]);
 const students=(roster??[]).filter((r:any)=>r.role==="student").map((r:any)=>({user_id:r.user_id,display_name:r.user_profiles?.display_name??null,username:r.user_profiles?.username??null,avatar_seed:r.user_profiles?.avatar_seed??null}));
 const activeAssignment=(assignments??[])[0] as any;
 const {data:session}=await supabase.auth.getSession();
 const dashboardRes=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`,{method:"POST",headers:{Authorization:`Bearer ${session.session?.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({classId}),cache:"no-store"});
 const dashboard=await dashboardRes.json().catch(()=>({}));
 const competencyRows=dashboard.studentCompetencyProgress??[]; const missionRows=dashboard.studentMissionProgress??[];
 const levels=competencyRows.map((r:any)=>Number(r.level??0)).filter((n:number)=>n>0);
 const average=levels.length?levels.reduce((a:number,b:number)=>a+b,0)/levels.length:null;
 const completed=missionRows.reduce((n:number,r:any)=>n+Number(r.missions_completed??0),0);
 const total=missionRows.reduce((n:number,r:any)=>n+Number(r.missions_total??0),0);
 return <div className="min-h-screen bg-slate-50 px-5 py-7 md:px-8"><div className="max-w-7xl mx-auto space-y-7">
  <header className="bg-white border border-border rounded-3xl p-6 md:p-7 shadow-sm">
   <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
    <div><a href="/classes" className="text-xs text-slate-400 hover:text-slate-700">← Meine Klassen</a><div className="flex items-center gap-3 mt-3"><h1 className="text-3xl font-semibold text-slate-900">{instance.name}</h1><span className={`text-xs px-2.5 py-1 rounded-full ${instance.is_active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{instance.is_active?"Aktiv":"Pausiert"}</span></div><p className="text-sm text-slate-500 mt-2">Jahrgang {instance.grade_level??"—"} · Schuljahr {instance.school_year} · {school?.name??"Schule nicht zugeordnet"}</p></div>
    <div className="flex flex-wrap gap-2"><form action={setClassActive.bind(null,classId,!instance.is_active)}><button className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{instance.is_active?"Klasse pausieren":"Klasse aktivieren"}</button></form><a href={`/grades/lookup?classId=${classId}`} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700">Jahrgang</a></div>
   </div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-7"><Metric label="Schüler:innen" value={students.length}/><Metric label="Aktives Modul" value={activeAssignment?.scenarios?.title??"Keines"}/><Metric label="Ø Kompetenz" value={average===null?"—":`${average.toFixed(1)} / 5`}/><Metric label="Missionen" value={total?`${completed}/${total}`:"—"}/></div>
  </header>

  <section className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden"><div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">Modul für diese Klasse</h2><p className="text-sm text-slate-500 mt-1">Immer genau ein Modul aktiv. Beim Wechsel wird das bisherige Modul deaktiviert; vorhandene Lernfortschritte bleiben erhalten.</p></div><ul className="divide-y divide-border">{(scenarios??[]).map((s:any)=><ScenarioToggle key={s.id} classId={classId} scenarioId={s.id} title={s.title} ageRating={s.age_rating} initiallyAssigned={activeAssignment?.scenario_id===s.id} initialPacingMode={activeAssignment?.pacing_mode??"compact"}/>)}</ul></section>

  <StudentRoster classId={classId} initialStudents={students}/>

  <section className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden"><div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">Klassenanalyse</h2><p className="text-sm text-slate-500 mt-1">Kompetenzen und Missionen – nur für die Lehrkraft dieser Klasse.</p></div><div className="grid lg:grid-cols-2 gap-px bg-border"><Panel title="Kompetenzentwicklung">{dashboard.competencyOverview?.length?dashboard.competencyOverview.map((r:any)=><div key={r.competency_id} className="bg-white px-5 py-3 flex justify-between text-sm"><span>{r.competency_title}</span><span className="text-slate-500">Ø {r.avg_level} / 5</span></div>):<div className="bg-white p-5 text-sm text-slate-400">Noch keine Daten.</div>}</Panel><Panel title="Wo gibt es Schwierigkeiten">{dashboard.missionBottlenecks?.slice(0,5).length?dashboard.missionBottlenecks.slice(0,5).map((r:any)=><div key={r.mission_id} className="bg-white px-5 py-3 flex justify-between text-sm"><span>{r.mission_title}</span><span>{Math.round(Number(r.completion_rate??0)*100)} %</span></div>):<div className="bg-white p-5 text-sm text-slate-400">Noch keine Daten.</div>}</Panel></div></section>

  <section className="bg-white border border-border rounded-3xl p-6 shadow-sm"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-slate-400">Schüler-Zugangscode</p><p className="text-2xl font-mono font-semibold tracking-[0.18em] mt-1">{instance.access_code}</p><p className="text-sm text-slate-500 mt-1">Mit diesem Code können Schüler:innen der Klasse beitreten.</p></div><CopyAccessCodeButton code={instance.access_code}/></div></section>
 </div></div>;
}
function Metric({label,value}:{label:string;value:string|number}){return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-semibold mt-2 truncate">{value}</p></div>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <div><div className="bg-white px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold">{title}</h3></div>{children}</div>}
