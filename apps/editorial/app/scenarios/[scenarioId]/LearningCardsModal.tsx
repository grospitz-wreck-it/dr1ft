"use client";

import { useState, useTransition } from "react";
import { createScenarioLearningCard, deleteScenarioLearningCard } from "./learning-cards-actions";
import { Plus, Trash2, X, Target, CheckCircle2 } from "lucide-react";

type Option = { id: string; label: string; outcome: "success" | "partial" | "not_yet" };
type Card = { id: string; type: string; title: string; prompt: string; position: string; options: Option[]; required?: boolean; evidenceKey?: string; competency?: string };
const outcomes = [{value:"success",label:"Lernziel erreicht"},{value:"partial",label:"Teilweise erreicht"},{value:"not_yet",label:"Noch nicht erreicht"}];

export function LearningCardsModal({scenarioId,cards}:{scenarioId:string;cards:Card[]}) {
 const [open,setOpen]=useState(false);
 const [options,setOptions]=useState<Option[]>([
  {id:"a",label:"Ich prüfe die Quelle und vergleiche Hinweise.",outcome:"success"},
  {id:"b",label:"Ich frage eine weitere Person.",outcome:"partial"},
  {id:"c",label:"Ich teile den Beitrag sofort.",outcome:"not_yet"},
 ]);
 const [busy,startTransition]=useTransition();
 const [error,setError]=useState("");
 async function submit(formData:FormData) {
  formData.set("options",JSON.stringify(options));
  startTransition(async()=>{try { await createScenarioLearningCard(scenarioId,formData); setError(""); setOptions([]); } catch(e){setError(e instanceof Error?e.message:"Speichern fehlgeschlagen.");}});
 }
 return <>
  <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50"><Target className="h-4 w-4"/> Lernkarten {cards.length>0&&<span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px]">{cards.length}</span>}</button>
  {open&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={()=>setOpen(false)}>
   <div role="dialog" aria-modal="true" aria-labelledby="learning-cards-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white bg-white shadow-2xl" onMouseDown={e=>e.stopPropagation()}>
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-sky-50 px-6 py-5">
     <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-600">Content-Module · eigenständige Lerninteraktionen</p><h3 id="learning-cards-title" className="mt-1 text-xl font-bold text-slate-950">Lernkarten verwalten</h3><p className="mt-1 text-sm text-slate-500">Strukturierte Entscheidungen statt unbewerteter Freitext-Antworten.</p></div>
     <button type="button" onClick={()=>setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700"><X className="h-5 w-5"/></button>
    </header>
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.05fr]">
     <section className="space-y-3">
      <h4 className="text-sm font-bold text-slate-900">Vorhandene Karten ({cards.length})</h4>
      {cards.length===0&&<p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">Noch keine Lernkarten. Lege rechts deine erste Karte an.</p>}
      {cards.map(card=><article key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
       <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-wide text-violet-600">{card.position==="before_feed"?"Vor dem Feed":"Am Feed-Ende"} · {card.type}</div><h5 className="mt-1 text-sm font-bold text-slate-900">{card.title}</h5><p className="mt-1 text-xs leading-5 text-slate-600">{card.prompt}</p><div className="mt-2 space-y-1">{(card.options??[]).map(o=><div key={o.id} className="flex items-center gap-2 text-[11px] text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-violet-400"/>{o.label}<span className="ml-auto text-slate-400">{outcomes.find(x=>x.value===o.outcome)?.label}</span></div>)}</div></div><form action={deleteScenarioLearningCard.bind(null,scenarioId,card.id)}><button aria-label="Karte löschen" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4"/></button></form></div>
      </article>)}
     </section>
     <form action={submit} className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Plus className="h-4 w-4 text-violet-600"/>Neue Lernkarte</h4>
      <div className="grid gap-3 sm:grid-cols-2">
       <label className="text-xs font-semibold text-slate-600">Kartentyp<select name="type" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="decision">Entscheidung</option><option value="knowledge_check">Wissenscheck</option><option value="reflection">Strukturierte Reflexion</option><option value="mission_completion">Missionsabschluss</option></select></label>
       <label className="text-xs font-semibold text-slate-600">Position<select name="position" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="feed_end">Am Feed-Ende</option><option value="before_feed">Vor dem Feed</option></select></label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">Titel<input name="title" required maxLength={100} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="z. B. Quelle richtig einschätzen"/></label>
      <label className="block text-xs font-semibold text-slate-600">Aufgabe / Entscheidung<textarea name="prompt" required rows={3} maxLength={500} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Was soll die lernende Person tun?"/></label>
      <label className="block text-xs font-semibold text-slate-600">Lernziel / Kompetenz<input name="competency" required placeholder="z. B. Informationen kritisch prüfen" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></label>
      <label className="block text-xs font-semibold text-slate-600">Nachweis-Schlüssel<input name="evidenceKey" required placeholder="z. B. source_evaluation" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></label>
      <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Antwortoptionen und Bewertung</span><button type="button" onClick={()=>setOptions(current=>[...current,{id:crypto.randomUUID(),label:"",outcome:"not_yet"}])} className="text-xs font-semibold text-violet-700">+ Option</button></div>
       {options.map((option,index)=><div key={option.id} className="grid grid-cols-[minmax(0,1fr)_145px_28px] items-center gap-2"><input aria-label={"Antwortoption "+(index+1)} value={option.label} onChange={e=>setOptions(current=>current.map(o=>o.id===option.id?{...o,label:e.target.value}:o))} placeholder={"Antwort "+(index+1)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"/><select aria-label="Bewertung" value={option.outcome} onChange={e=>setOptions(current=>current.map(o=>o.id===option.id?{...o,outcome:e.target.value as Option["outcome"]}:o))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px]">{outcomes.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><button type="button" onClick={()=>setOptions(current=>current.filter(o=>o.id!==option.id))} className="text-slate-400 hover:text-rose-600" aria-label="Option entfernen"><X className="h-4 w-4"/></button></div>)}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" name="required" defaultChecked className="rounded border-slate-300"/>Verpflichtend</label>
      <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-4 text-amber-800">Die Bewertung wird redaktionell festgelegt. Eine Reflexionsantwort ist nicht automatisch ein Kompetenznachweis. Die Auswertung im Player muss diese Regel serverseitig prüfen.</p>
      {error&&<p className="text-xs text-rose-600">{error}</p>}
      <button disabled={busy||options.length<2} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>{busy?"Speichert …":"Lernkarte speichern"}</button>
     </form>
    </div>
   </div>
  </div>}
 </>;
}
