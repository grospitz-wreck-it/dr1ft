"use client";

import { useState, useTransition } from "react";
import { createScenarioLearningCard, deleteScenarioLearningCard } from "./learning-cards-actions";
import { Plus, Trash2, X, Target, CheckCircle2, Layers3, Sparkles } from "lucide-react";

type Option = { id: string; label: string; outcome: "success" | "partial" | "not_yet" };
type Card = { id: string; type: string; title: string; prompt: string; position: string; options: Option[]; required?: boolean; objectiveId?: string; objective?: string };
type Competency = { id: string; title: string };
const outcomes = [{value:"success",label:"Ziel erreicht"},{value:"partial",label:"Teilweise erreicht"},{value:"not_yet",label:"Noch nicht erreicht"}];
const starterOptions = (): Option[] => [
 {id:crypto.randomUUID(),label:"Ich prüfe die Quelle und gleiche die Angaben ab.",outcome:"success"},
 {id:crypto.randomUUID(),label:"Ich hole eine weitere Perspektive ein.",outcome:"partial"},
 {id:crypto.randomUUID(),label:"Ich teile den Beitrag ungeprüft.",outcome:"not_yet"},
];

export function LearningCardsModal({scenarioId,cards,learningObjectives=[]}:{scenarioId:string;cards:Card[];learningObjectives?:Competency[]}) {
 const [open,setOpen]=useState(false);
 const [options,setOptions]=useState<Option[]>(starterOptions);
 const [busy,startTransition]=useTransition();
 const [error,setError]=useState("");
 const availableCompetencies = learningObjectives;
 async function submit(formData:FormData) {
  formData.set("options",JSON.stringify(options));
  startTransition(async()=>{try { await createScenarioLearningCard(scenarioId,formData); setError(""); setOptions(starterOptions()); } catch(e){setError(e instanceof Error?e.message:"Die Karte konnte nicht gespeichert werden.");}});
 }
 return <>
  <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"><Layers3 className="h-4 w-4"/>Lernkarten {cards.length>0&&<span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px]">{cards.length}</span>}</button>
  {open&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={()=>setOpen(false)}>
   <div role="dialog" aria-modal="true" aria-labelledby="learning-cards-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/80 bg-[#fbfaff] shadow-2xl" onMouseDown={e=>e.stopPropagation()}>
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-violet-100/80 bg-white/95 px-6 py-5 backdrop-blur">
     <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Layers3 className="h-5 w-5"/></span><div><h3 id="learning-cards-title" className="text-lg font-bold tracking-tight text-slate-950">Lernkarten</h3><p className="mt-1 text-sm text-slate-500">Ergänze deinen Lernweg um gezielte Entscheidungen und Aufgaben.</p></div></div>
     <button type="button" onClick={()=>setOpen(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5"/></button>
    </header>
    <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
     <section className="space-y-3">
      <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-slate-900">Deine Karten</h4><span className="text-xs text-slate-400">{cards.length} angelegt</span></div>
      {cards.length===0&&<div className="rounded-2xl border border-dashed border-violet-200 bg-white px-5 py-9 text-center"><Sparkles className="mx-auto h-6 w-6 text-violet-300"/><p className="mt-2 text-sm font-semibold text-slate-700">Noch keine Lernkarten</p><p className="mt-1 text-xs text-slate-500">Lege rechts deine erste Karte an.</p></div>}
      {cards.map(card=><article key={card.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
       <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">{card.position==="before_feed"?"Vor dem Feed":"Am Feed-Ende"}</span><span className="text-[10px] text-slate-400">{card.type==="decision"?"Entscheidung":card.type==="knowledge_check"?"Wissenscheck":card.type==="reflection"?"Reflexion":"Missionsabschluss"}</span></div><h5 className="mt-2 text-sm font-bold text-slate-900">{card.title}</h5><p className="mt-1 text-xs leading-5 text-slate-600">{card.prompt}</p><p className="mt-2 text-[11px] font-medium text-slate-500">Lernziel: {card.objective??learningObjectives.find(c=>c.id===card.objectiveId)?.title??"—"}</p></div><form action={deleteScenarioLearningCard.bind(null,scenarioId,card.id)}><button aria-label="Karte löschen" className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4"/></button></form></div>
      </article>)}
     </section>
     <form action={submit} className="space-y-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_3px_18px_rgba(124,58,237,0.06)]">
      <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600">Neue Karte</p><h4 className="mt-1 text-base font-bold text-slate-950">Was sollen Lernende tun?</h4></div>
      <div className="grid gap-3 sm:grid-cols-2">
       <label className="text-xs font-semibold text-slate-600">Art der Karte<select name="type" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="decision">Entscheidung</option><option value="knowledge_check">Wissenscheck</option><option value="reflection">Reflexion</option><option value="mission_completion">Missionsabschluss</option></select></label>
       <label className="text-xs font-semibold text-slate-600">Wo soll sie erscheinen?<select name="position" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="feed_end">Am Ende des Feeds</option><option value="before_feed">Vor dem Feed</option></select></label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">Lernziel<select name="objectiveId" required disabled={!availableCompetencies.length} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-60"><option value="">{availableCompetencies.length?"Vorhandenes Lernziel auswählen":"Lege zuerst ein Lernziel im Lernplan fest"}</option>{availableCompetencies.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label className="block text-xs font-semibold text-slate-600">Titel<input name="title" required maxLength={100} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" placeholder="z. B. Prüfe die Hinweise"/></label>
      <label className="block text-xs font-semibold text-slate-600">Aufgabe<textarea name="prompt" required rows={3} maxLength={500} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" placeholder="Beschreibe die Situation oder Entscheidung …"/></label>
      <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Antwortmöglichkeiten</span><button type="button" onClick={()=>setOptions(current=>[...current,{id:crypto.randomUUID(),label:"",outcome:"not_yet"}])} className="text-xs font-semibold text-violet-700 hover:text-violet-900">+ Antwort ergänzen</button></div>
       {options.map((option,index)=><div key={option.id} className="grid grid-cols-[minmax(0,1fr)_150px_28px] items-center gap-2"><input aria-label={"Antwort "+(index+1)} value={option.label} onChange={e=>setOptions(current=>current.map(o=>o.id===option.id?{...o,label:e.target.value}:o))} placeholder={"Antwortmöglichkeit "+(index+1)} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs"/><select aria-label="Lernzielerreichung" value={option.outcome} onChange={e=>setOptions(current=>current.map(o=>o.id===option.id?{...o,outcome:e.target.value as Option["outcome"]}:o))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px]">{outcomes.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><button type="button" onClick={()=>setOptions(current=>current.filter(o=>o.id!==option.id))} className="text-slate-400 hover:text-rose-600" aria-label="Antwort entfernen"><X className="h-4 w-4"/></button></div>)}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" name="required" defaultChecked className="rounded border-slate-300 text-violet-600"/>Muss bearbeitet werden</label>
      <button disabled={busy||options.length<2||!availableCompetencies.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>{busy?"Speichert …":"Lernkarte hinzufügen"}</button>
      {error&&<p className="text-xs text-rose-600">{error}</p>}
     </form>
    </div>
   </div>
  </div>}
 </>;
}
