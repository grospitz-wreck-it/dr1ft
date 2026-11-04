"use client";

import { useState, useTransition } from "react";
import { BarChart3, CheckCircle2, RefreshCw } from "lucide-react";
import { submitTeacherModulePostVote } from "../app/feed/teacher-module-vote-actions";

type VoteResult = { counts: Record<string, number>; total: number; responseMode: "single" | "multiple" | "free_text"; isCorrect: boolean | null; explanation: string; correctAnswer: "true" | "false" | null };

export function TeacherModuleInteraction({ postId, classInstanceId, postType, interactionData }: {
  postId: string;
  classInstanceId: string;
  postType: "poll" | "true_false";
  interactionData: { options?: string[]; responseMode?: "single" | "multiple" | "free_text"; correctAnswer?: "true" | "false"; explanation?: string };
}) {
  const legacy = postType === "true_false";
  const mode = legacy ? "single" : (interactionData.responseMode ?? "single");
  const options = legacy ? ["Richtig", "Falsch"] : (interactionData.options?.filter(Boolean) ?? []);
  const [selected, setSelected] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [result, setResult] = useState<VoteResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function toggleChoice(choice: string) {
    if (mode === "single") setSelected([choice]);
    else setSelected(current => current.includes(choice) ? current.filter(value => value !== choice) : [...current, choice]);
  }
  function submit() {
    if (pending || (mode === "free_text" ? !textAnswer.trim() : selected.length === 0)) return;
    setError("");
    startTransition(async () => {
      try {
        const saved = await submitTeacherModulePostVote({
          postId,
          classInstanceId,
          choices: mode === "free_text" ? [] : selected,
          textAnswer: mode === "free_text" ? textAnswer.trim() : undefined,
        });
        setResult(saved);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Deine Antwort konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <section className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-violet-700"><BarChart3 className="h-4 w-4"/>{legacy ? "Richtig oder falsch?" : "Deine Antwort"}</div>
      {!result ? (
        <>
          {mode === "free_text" ? (
            <div className="mt-3 space-y-2"><label htmlFor={"teacher-module-answer-"+postId} className="block text-xs font-semibold text-slate-700">Deine Antwort</label><textarea id={"teacher-module-answer-"+postId} value={textAnswer} onChange={event=>setTextAnswer(event.target.value)} rows={4} maxLength={5000} placeholder="Schreibe deine Antwort …" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"/></div>
          ) : (
            <>
              <p className="mt-2 text-xs text-slate-600">{mode === "multiple" ? "Du kannst mehrere Antworten auswählen." : "Wähle eine Antwort aus."}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {options.map((label,index)=>{const key="option_"+(index+1);const active=selected.includes(key);return <button key={key} type="button" onClick={()=>toggleChoice(key)} className={"min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition "+(active?"border-violet-500 bg-violet-100 text-violet-900 ring-2 ring-violet-100":"border-slate-200 bg-white text-slate-700 hover:border-violet-300")}>{label}</button>;})}
              </div>
            </>
          )}
          <button type="button" disabled={pending||(mode==="free_text"?!textAnswer.trim():selected.length===0)} onClick={submit} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45">{pending?"Wird gespeichert …":mode==="free_text"?"Antwort absenden":"Abstimmen"}</button>
        </>
      ) : (
        <div className="mt-3 space-y-3" aria-live="polite">
          {mode === "free_text" ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4"/>Deine Antwort wurde an die Lehrkraft übermittelt.</div> : <>
            {legacy && <div className={"rounded-xl p-3 text-sm font-semibold "+(result.isCorrect?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-800")}>{result.isCorrect?"Richtig erkannt!":"Nicht ganz – die richtige Antwort ist "+(result.correctAnswer==="true"?"Richtig":"Falsch")+"."}</div>}
            <p className="text-sm font-bold text-slate-900">So hat deine Klasse abgestimmt</p>
            {options.map((label,index)=>{const key="option_"+(index+1);const count=result.counts[key]??0;const percent=result.total?Math.round(count/result.total*100):0;return <div key={key} className="space-y-1"><div className="flex justify-between gap-3 text-xs"><span className="font-medium text-slate-700">{label}{selected.includes(key)?" · Deine Stimme":""}</span><span className="font-bold tabular-nums text-slate-900">{percent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-600 transition-all" style={{width:percent+"%"}}/></div></div>;})}
            {legacy&&result.explanation&&<p className="rounded-xl bg-white/80 p-3 text-sm leading-6 text-slate-700">{result.explanation}</p>}
            <div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] text-slate-500">{result.total} {result.total===1?"Stimme":"Stimmen"}</span><button type="button" disabled={pending} onClick={submit} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"><RefreshCw className={"h-3.5 w-3.5 "+(pending?"animate-spin":"")}/>Aktualisieren</button></div>
          </>}
        </div>
      )}
      {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </section>
  );
}
