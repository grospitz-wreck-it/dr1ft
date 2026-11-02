import { supabaseServerClient } from "../../../../../lib/supabaseServerClient";
import { PrintReportButton } from "./PrintReportButton";
import {
  ArrowUpRight, BookOpenCheck, Brain, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, MessageCircle, Scale, Shield, Sparkles,
  Target, ThumbsUp, Users, XCircle, Zap
} from "lucide-react";

type ScenarioAnswer = {
  response_id: string; scenario_id: string; scenario_title: string; card_id: string;
  card_title: string; card_prompt: string | null; objective_id: string | null;
  objective_title: string | null; selected_option_id: string; selected_option_label: string;
  selected_option_feedback: string | null; recommended_option_label: string | null;
  outcome: "success" | "partial" | "not_yet"; occurred_at: string;
};
type ScenarioReport = { id: string; title: string; answers: ScenarioAnswer[] };
type ScenarioMeta = { id: string; title: string; cover_image_url: string | null; learning_cards: any[] | null };
const avatarUrl=(seed:string|null|undefined,size=160)=>{
  const styles=["voxel-art","adventurer","adventurer-neutral","avataaars","bottts","fun-emoji","lorelei","micah","miniavs","personas","pixel-art-neutral","thumbs"];
  const value=seed||"dr1ft",split=value.indexOf("::"),candidate=split>0?value.slice(0,split):"";
  const style=styles.includes(candidate)?candidate:"voxel-art";
  const avatarSeed=split>0&&styles.includes(candidate)?value.slice(split+2)||"dr1ft":value;
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}&size=${size}&borderRadius=18`;
};
const dateLabel=(v:string)=>new Date(v).toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"short"});
const statusTone=(v:string)=>v==="success"?"bg-emerald-100 text-emerald-800":v==="partial"?"bg-amber-100 text-amber-900":"bg-rose-100 text-rose-800";
const statusLabel=(v:string)=>v==="success"?"Richtig":v==="partial"?"Teilweise richtig":"Noch nicht erreicht";
const objectiveIcon=(title:string)=>{
  const t=title.toLowerCase();
  if(/grenz|schutz|sicher|recht/.test(t))return Shield;
  if(/reaktion|kommun|antwort|dialog/.test(t))return MessageCircle;
  if(/folge|perspekt|betroffen|sozial/.test(t))return Users;
  if(/quelle|prüf|fake|bewert|krit/.test(t))return Scale;
  if(/wissen|versteh|erkenn/.test(t))return Brain;
  return Target;
};
const percent=(n:number,d:number)=>d?Math.round(n/d*100):0;

function ProgressRing({value,label}:{value:number;label:string}){
  return <div className="relative grid h-[118px] w-[118px] shrink-0 place-items-center rounded-full p-[9px]" style={{background:`conic-gradient(#13c98b ${value*3.6}deg,#e4e1f4 0deg)`}}>
    <div className="grid h-full w-full place-items-center rounded-full bg-[#211a43] text-center"><span className="text-[27px] font-black leading-none">{value}%</span><span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/55">{label}</span></div>
  </div>;
}

export default async function StudentReportPage({params}:{params:{classId:string;studentId:string}}){
  const supabase=supabaseServerClient(),{classId,studentId}=params;
  const [{data:classInfo},{data:profile},{data:assignments},reportResult]=await Promise.all([
    supabase.from("class_instances").select("name,school_year,grade_level").eq("id",classId).maybeSingle(),
    supabase.from("user_profiles").select("display_name,username,avatar_seed").eq("id",studentId).maybeSingle(),
    supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id",classId).eq("is_active",true).is("archived_at",null),
    supabase.rpc("get_teacher_student_scenario_report_v1",{p_class_id:classId,p_student_id:studentId})
  ]);
  const error=reportResult.error?.message??null,answers=(reportResult.data??[]) as ScenarioAnswer[];
  const ids=Array.from(new Set(answers.map(a=>a.scenario_id)));
  let scenarioRows: ScenarioMeta[] = [];
  if (ids.length) {
    const scenarioResult = await supabase.from("scenarios").select("id,title,cover_image_url,learning_cards").in("id", ids);
    scenarioRows = (scenarioResult.data ?? []) as ScenarioMeta[];
  }
  const scenarioMeta = new Map<string, ScenarioMeta>(scenarioRows.map((scenario) => [scenario.id, scenario]));
  const grouped=new Map<string,ScenarioReport>();
  for(const a of answers){const item=grouped.get(a.scenario_id)??{id:a.scenario_id,title:a.scenario_title,answers:[]};item.answers.push(a);grouped.set(a.scenario_id,item);}
  const reports=Array.from(grouped.values()).sort((a,b)=>new Date(b.answers[0].occurred_at).getTime()-new Date(a.answers[0].occurred_at).getTime());
  const success=answers.filter(x=>x.outcome==="success").length,partial=answers.filter(x=>x.outcome==="partial").length,missed=answers.filter(x=>x.outcome==="not_yet").length,total=answers.length;
  const studentName=profile?.display_name||"Schüler:in",assignedCount=new Set((assignments??[]).map((a:{scenario_id:string|null})=>a.scenario_id).filter(Boolean)).size;
  const openCount=partial+missed;
  const requiredCardCount = scenarioRows.reduce((sum, scenario) => {
    const required = (scenario.learning_cards ?? []).filter((card: any) => card.type !== "reflection" && card.required !== false).length;
    return sum + required;
  }, 0) || total;
  const completionRate=percent(total,Math.max(total,requiredCardCount));

  return (
  <main className="min-h-screen overflow-hidden bg-[#f2f3ff] text-[#111329] print:bg-white">
    <div className="pointer-events-none fixed inset-0 print:hidden" aria-hidden="true"><div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-violet-300/25 blur-3xl"/><div className="absolute right-0 top-0 h-[34rem] w-[34rem] rounded-full bg-cyan-200/25 blur-3xl"/></div>
    <div className="relative mx-auto max-w-[1480px] space-y-6 px-5 py-6 md:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-violet-600">DR1FT / Learning Intelligence</p><h1 className="mt-1 text-3xl font-black tracking-[-.045em] md:text-4xl">Lernreport <span className="text-violet-600">— {studentName}</span></h1><p className="mt-1 text-xs text-slate-500">{classInfo?.name||"Klasse"} · Jahrgang {classInfo?.grade_level??"—"} · Schuljahr {classInfo?.school_year||"—"}</p></div>
        <nav className="flex flex-wrap items-center gap-2 text-xs font-bold"><a href="#gesamtfortschritt" className="rounded-full border border-violet-200 bg-white px-4 py-2.5 text-slate-600">Gesamtfortschritt</a><a href="#drift-reports" className="rounded-full bg-violet-600 px-5 py-2.5 text-white shadow-lg shadow-violet-300/50">DR1FT-Report</a><PrintReportButton/><a href={`/classes/${classId}`} className="rounded-xl bg-slate-950 px-4 py-2.5 text-white">Klassenübersicht ↗</a></nav>
      </header>

      <section className="relative isolate overflow-hidden rounded-[30px] bg-[#17132f] text-white shadow-[0_25px_75px_rgba(37,28,91,.24)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_72%_45%,rgba(139,75,255,.42),transparent_36%),radial-gradient(ellipse_at_90%_0%,rgba(30,190,220,.18),transparent_38%)]"/>
        <div className="absolute -right-10 -top-44 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10"/><div className="absolute right-20 -top-28 -z-10 h-[27rem] w-[27rem] rounded-full border border-white/10"/>
        <div className="grid gap-0 lg:grid-cols-[.8fr_1.15fr_1fr] lg:items-stretch">
          <div className="flex items-center gap-4 p-6 md:p-8"><img src={avatarUrl(profile?.avatar_seed||studentId)} alt="" className="h-20 w-20 rounded-[22px] border-4 border-white/20 bg-violet-200 object-cover md:h-24 md:w-24"/><div><p className="text-[9px] font-black uppercase tracking-[.24em] text-violet-300">Dein Lernprofil</p><h2 className="mt-1 text-3xl font-black">{studentName}</h2><p className="mt-1 text-xs text-white/55">@{profile?.username||"—"} · {classInfo?.name||"Klasse"}</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-200"><CheckCircle2 className="h-3 w-3"/>{total?"DR1FT-Antworten erfasst":"Noch keine Antworten"}</span></div></div>
          <div className="relative min-h-[190px] overflow-hidden border-y border-white/10 lg:border-x lg:border-y-0">
            {reports[0]&&scenarioMeta.get(reports[0].id)?.cover_image_url?<img src={scenarioMeta.get(reports[0].id)?.cover_image_url||""} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65"/>:<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(244,63,181,.38),transparent_35%),linear-gradient(110deg,rgba(41,28,83,.4),rgba(25,18,51,.05))]"><div className="absolute right-[22%] top-6 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-2xl"/><MessageCircle className="absolute right-[31%] top-9 h-12 w-12 -rotate-12 text-fuchsia-300/80"/><Brain className="absolute right-[13%] top-14 h-10 w-10 rotate-12 text-violet-200/80"/><Sparkles className="absolute right-[20%] bottom-7 h-8 w-8 text-cyan-200/80"/></div>}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1435] via-[#1a1435]/80 to-[#1a1435]/25"/>
            <div className="relative flex h-full min-h-[190px] flex-col justify-center p-6 md:p-7"><p className="text-[9px] font-black uppercase tracking-[.25em] text-violet-300">DR1FT / Szenario</p><h3 className="mt-2 max-w-sm text-2xl font-black leading-tight md:text-[27px]">{reports[0]?.title||"Dein Lernweg beginnt hier"}</h3><p className="mt-2 max-w-sm text-xs leading-5 text-white/55">{reports[0]? "Deine Entscheidungen, Lernziele und nächsten Schritte in dieser DR1FT.":"Sobald du eine DR1FT bearbeitet hast, erscheint hier dein persönlicher Szenario-Report."}</p></div>
          </div>
          <div className="flex items-center justify-around gap-4 p-6 md:p-8">
            <ProgressRing value={total?completionRate:0} label="bearbeitet"/>
            <div className="min-w-0 flex-1 space-y-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-400/15 text-violet-200"><Clock3 className="h-5 w-5"/></span><div><p className="text-[10px] font-semibold text-white/45">Bearbeitungszeit</p><p className="text-sm font-bold text-white/80">Noch nicht verlässlich erfasst</p></div></div><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fuchsia-400/15 text-fuchsia-200"><Users className="h-5 w-5"/></span><div><p className="text-[10px] font-semibold text-white/45">Vergleich zur Klasse</p><p className="text-sm font-bold text-white/80">Noch keine Vergleichsdaten</p></div></div></div>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-4 md:px-8"><div className="mb-2 flex items-center justify-between text-[11px]"><span className="font-bold text-white/75">Deine Antwortverteilung</span><span className="text-white/45">{total} Antworten</span></div><div className="flex h-3 overflow-hidden rounded-full bg-white/10"><div className="bg-emerald-400" style={{width:`${percent(success,total)}%`}}/><div className="bg-amber-300" style={{width:`${percent(partial,total)}%`}}/><div className="bg-rose-400" style={{width:`${percent(missed,total)}%`}}/></div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-white/55"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400"/> {success} vollständig</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-300"/> {partial} teilweise</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-400"/> {missed} noch nicht erreicht</span></div>
      </section>

      <section id="drift-reports" className="scroll-mt-5 space-y-5">
        {reports.length?reports.map((report,ri)=>{
          const rows=report.answers,meta=scenarioMeta.get(report.id),cards=meta?.learning_cards??[];
          const s=rows.filter(x=>x.outcome==="success").length,p=rows.filter(x=>x.outcome==="partial").length,m=rows.filter(x=>x.outcome==="not_yet").length,open=rows.filter(x=>x.outcome!=="success");
          const objectiveMap=new Map<string,{title:string;rows:ScenarioAnswer[]}>();
          rows.forEach(row=>{const key=row.objective_id||row.objective_title||row.card_id,item=objectiveMap.get(key)??{title:row.objective_title||row.card_title,rows:[]};item.rows.push(row);objectiveMap.set(key,item);});
          const objectives=Array.from(objectiveMap.values());
          const totalRequired=cards.filter((c:any)=>c.type!=="reflection"&&c.required!==false).length||rows.length;
          const completion=percent(rows.length,totalRequired);
          const scenarioRate=percent(s,rows.length);
          return <article key={report.id} className="overflow-hidden rounded-[30px] border border-white bg-white/95 shadow-[0_18px_55px_rgba(49,43,105,.10)]">
            <div className="relative overflow-hidden bg-gradient-to-r from-[#20163f] via-[#34205f] to-[#432477] p-6 text-white md:p-8">
              <div className="absolute -right-16 -top-36 h-80 w-80 rounded-full border border-white/10"/><div className="absolute right-28 top-0 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl"/>
              <div className="relative flex flex-wrap items-center justify-between gap-5"><div className="max-w-2xl"><p className="text-[9px] font-black uppercase tracking-[.25em] text-violet-300">DR1FT {String(ri+1).padStart(2,"0")} / Szenario-Report</p><h3 className="mt-2 text-2xl font-black leading-tight md:text-3xl">{report.title}</h3><p className="mt-2 text-xs text-white/55">{rows.length} ausgewertete Aufgaben · zuletzt bearbeitet {dateLabel(rows[0].occurred_at)}</p></div><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.08] p-3"><div className="grid h-14 w-14 place-items-center rounded-full bg-white/10"><Target className="h-7 w-7 text-violet-200"/></div><div><p className="text-sm font-black">{open.length? `${open.length} Lernziel(e) offen`:"Alles erreicht"}</p><p className="mt-1 max-w-36 text-[10px] leading-4 text-white/50">{open.length?"Hier kannst du noch Punkte holen":"Alle bewerteten Antworten waren vollständig"}</p></div></div></div>
              <div className="relative mt-6 grid grid-cols-3 gap-2 md:gap-3"><div className="rounded-xl border border-emerald-300/10 bg-emerald-400/15 p-3"><p className="text-2xl font-black text-emerald-300">{s}</p><p className="text-[10px] font-semibold text-white/65">Vollständig</p></div><div className="rounded-xl border border-amber-300/10 bg-amber-300/15 p-3"><p className="text-2xl font-black text-amber-200">{p}</p><p className="text-[10px] font-semibold text-white/65">Teilweise</p></div><div className="rounded-xl border border-rose-300/10 bg-rose-400/15 p-3"><p className="text-2xl font-black text-rose-200">{m}</p><p className="text-[10px] font-semibold text-white/65">Nicht erreicht</p></div></div>
            </div>
            <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1.25fr_.75fr]">
              <div className="space-y-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Target className="h-6 w-6"/></span><div><h4 className="text-xl font-black">Deine Lernziele in dieser DR1FT</h4><p className="text-xs text-slate-500">Was du gelernt hast – und wo du noch Punkte holen kannst.</p></div></div>
                {objectives.map((obj,i)=>{const Icon=objectiveIcon(obj.title),os=obj.rows.filter(x=>x.outcome==="success").length,op=obj.rows.filter(x=>x.outcome==="partial").length,om=obj.rows.filter(x=>x.outcome==="not_yet").length,rate=percent(os,obj.rows.length);return <details key={i} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white open:border-violet-200 open:shadow-md open:shadow-violet-100/60"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden"><span className={`grid h-10 w-10 place-items-center rounded-xl ${op+om?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>{op+om?<CircleHelp className="h-5 w-5"/>:<CheckCircle2 className="h-5 w-5"/>}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5"/></span><span className="min-w-[130px] flex-1"><strong className="block text-sm">{obj.title}</strong><small className="text-[10px] text-slate-400">{obj.rows.length} zugehörige Aufgabe(n)</small></span><span className="w-28"><span className="block text-right text-lg font-black">{op?"Teilweise":om?"Offen":rate+"%"}</span><span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${op+om?"bg-amber-400":"bg-emerald-500"}`} style={{width:`${rate}%`}}/></span></span><ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180"/></summary><div className="grid gap-4 border-t border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 md:grid-cols-2"><div><p className="flex items-center gap-2 text-xs font-black text-amber-900"><XCircle className="h-4 w-4"/>Hier hast du Punkte liegen lassen</p><ul className="mt-2 space-y-2 text-xs leading-5 text-amber-950">{obj.rows.filter(x=>x.outcome!=="success").map(row=><li key={row.response_id} className="flex gap-2"><span className="text-amber-600">●</span>{row.selected_option_feedback||`Deine Antwort „${row.selected_option_label}“ wurde als ${statusLabel(row.outcome).toLowerCase()} bewertet.`}</li>)}{!obj.rows.some(x=>x.outcome!=="success")&&<li>Für dieses Lernziel sind alle gespeicherten Antworten vollständig.</li>}</ul></div><div className="border-t border-amber-200 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0"><p className="flex items-center gap-2 text-xs font-black text-emerald-800"><Check className="h-4 w-4"/>So erreichst du die volle Punktzahl</p><ul className="mt-2 space-y-2 text-xs leading-5 text-emerald-950">{obj.rows.filter(x=>x.outcome!=="success").map(row=><li key={row.response_id} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"/>{row.recommended_option_label||"Die vollständige Musterlösung ist für diese Aufgabe noch nicht redaktionell hinterlegt."}</li>)}{!obj.rows.some(x=>x.outcome!=="success")&&<li>Alle dokumentierten Antworten erfüllen dieses Lernziel.</li>}</ul></div></div></details>})}
              </div>
              <aside className="space-y-4">
                <div className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-[#f0eaff] via-[#f7f2ff] to-[#e8faff] p-5"><div className="flex items-center gap-3"><Sparkles className="h-6 w-6 text-violet-600"/><h4 className="text-xl font-black">Kurzfazit</h4></div><p className="mt-3 text-sm leading-6 text-slate-700">{open.length?`Du hast ${s} von ${rows.length} Aufgaben vollständig gelöst. ${open.length} Antwort(en) zeigen, wo du noch genauer hinschauen solltest.`:"Du hast alle bewerteten Aufgaben dieser DR1FT vollständig gelöst."}</p></div>
                <div className="rounded-[24px] border border-emerald-100 bg-white p-5"><div className="flex items-center gap-3"><ThumbsUp className="h-6 w-6 text-emerald-600"/><h4 className="text-lg font-black">Deine Stärken</h4></div>{s>0?<ul className="mt-3 space-y-2 text-xs leading-5 text-slate-700">{rows.filter(x=>x.outcome==="success").map(row=><li key={row.response_id} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"/>{row.objective_title||row.card_title}</li>)}</ul>:<p className="mt-3 text-xs leading-5 text-slate-500">Sobald ein Lernziel vollständig erreicht wurde, erscheinen hier deine belegten Stärken.</p>}</div>
                <div className="rounded-[24px] border border-violet-100 bg-white p-5"><div className="flex items-center gap-3"><Target className="h-6 w-6 text-violet-600"/><h4 className="text-lg font-black">Dein nächster Lernschritt</h4></div><div className="mt-3 rounded-2xl bg-gradient-to-r from-violet-100 to-fuchsia-100 p-4"><p className="font-black text-violet-950">{open.length?"Offene Lernziele gezielt vertiefen":"Auf diesem Lernweg bist du auf Kurs"}</p><p className="mt-2 text-xs leading-5 text-violet-900/80">{open.length?"Greife die markierten Aufgaben erneut auf und achte besonders auf die fehlenden Aspekte in den Lösungshinweisen.":"Bearbeite die nächste DR1FT und wende das Gelernte in einer neuen Situation an."}</p></div></div>
              </aside>
            </div>
            <div className="border-t border-slate-100 bg-[#f8f9ff] p-5 md:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><BookOpenCheck className="h-6 w-6"/></span><div><h4 className="text-xl font-black">Deine bearbeiteten Aufgaben</h4><p className="text-xs text-slate-500">So hast du in dieser DR1FT gearbeitet – mit deiner Antwort und dem Ergebnis.</p></div></div><div className="grid gap-4 xl:grid-cols-2">{rows.map((row,i)=>{const Icon=objectiveIcon(row.objective_title||row.card_title);return <div key={row.response_id} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_5px_18px_rgba(34,30,80,.035)]"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5"/></span><div><h5 className="font-black">{row.card_title}</h5>{row.objective_title&&<p className="mt-1 text-[9px] font-black uppercase tracking-[.17em] text-violet-600">{row.objective_title}</p>}</div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${statusTone(row.outcome)}`}>{statusLabel(row.outcome)}</span></div>{row.card_prompt&&<p className="mt-4 text-sm leading-6 text-slate-600">{row.card_prompt}</p>}<div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Deine gewählte Antwort</p><p className="mt-2 text-sm font-semibold leading-5 text-slate-900">{row.selected_option_label}</p></div>{row.outcome!=="success"&&<div className="mt-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4"><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-amber-800"><ArrowUpRight className="h-4 w-4"/>Was dir noch gefehlt hat</p>{row.selected_option_feedback?<p className="mt-2 text-sm leading-6 text-amber-950">{row.selected_option_feedback}</p>:row.recommended_option_label?<p className="mt-2 text-sm font-semibold leading-6 text-amber-950">Für die volle Punktzahl: {row.recommended_option_label}</p>:<p className="mt-2 text-xs leading-5 text-amber-950">Für diese Aufgabe ist noch keine redaktionelle Erklärung hinterlegt. Deshalb zeigen wir keine erfundene Musterlösung.</p>}{row.recommended_option_label&&row.selected_option_feedback&&<p className="mt-2 border-t border-amber-200 pt-2 text-xs font-semibold leading-5 text-amber-950">Vollständige Antwort: {row.recommended_option_label}</p>}</div>}<p className="mt-3 text-[10px] text-slate-400">Bearbeitet am {dateLabel(row.occurred_at)}</p></div>})}</div></div>
          </article>
        }):<div className="rounded-[28px] border border-dashed border-violet-200 bg-white p-10 text-center"><h3 className="text-xl font-black">Noch keine individuellen DR1FT-Nachweise</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Sobald Lernkarten in einer zugewiesenen DR1FT beantwortet werden, erscheinen hier die konkrete Aufgabe, die Antwort und die hinterlegten Lernhinweise.</p></div>}
        {error&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Die Szenario-Auswertung konnte nicht geladen werden. Bitte die Supabase-Migration prüfen. {error}</p>}
      </section>

      <section id="gesamtfortschritt" className="scroll-mt-5 rounded-[28px] border border-white bg-white/90 p-6 shadow-[0_12px_40px_rgba(48,48,100,.06)] md:p-8"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Zap className="h-6 w-6"/></span><div><p className="text-[9px] font-black uppercase tracking-[.23em] text-violet-600">Gesamtfortschritt</p><h2 className="text-2xl font-black">Deine Entwicklung über alle DR1FTs</h2></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Der Gesamtfortschritt fasst die individuellen Szenario-Reports zusammen. Ein Kompetenzverlauf und ein Vergleich mit dem Klassenschnitt folgen, sobald dieselben Lernziele über mehrere DR1FTs hinweg zuverlässig verknüpft und vergleichbar ausgewertet werden.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-violet-50 p-4"><p className="text-3xl font-black text-violet-700">{reports.length}</p><p className="mt-1 text-xs font-semibold text-violet-900/70">DR1FTs mit Antworten</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-3xl font-black text-emerald-700">{success}</p><p className="mt-1 text-xs font-semibold text-emerald-900/70">Vollständig erreicht</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-3xl font-black text-amber-700">{openCount}</p><p className="mt-1 text-xs font-semibold text-amber-900/70">Noch zu vertiefen</p></div></div></section>
      <footer className="pb-5 text-center text-[10px] tracking-wide text-slate-400 print:hidden">DR1FT · Learning Intelligence · Nur tatsächlich gespeicherte Antworten und redaktionell hinterlegte Hinweise. Keine erfundenen Punktwerte oder Klassenvergleiche.</footer>
    </div>
  </main>;
}
