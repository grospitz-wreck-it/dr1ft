"use client";

import { useState, useTransition } from "react";
import { BarChart3, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { submitTeacherModulePostVote } from "../app/feed/teacher-module-vote-actions";

type VoteChoice = "option_1" | "option_2" | "true" | "false";
type VoteResult = { counts: Record<string, number>; total: number; isCorrect: boolean | null; explanation: string; correctAnswer: "true" | "false" | null };

export function TeacherModuleInteraction({ postId, classInstanceId, postType, interactionData }: {
  postId: string;
  classInstanceId: string;
  postType: "poll" | "true_false";
  interactionData: { options?: string[] };
}) {
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [result, setResult] = useState<VoteResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const labels = postType === "poll"
    ? [interactionData.options?.[0] || "Echt", interactionData.options?.[1] || "Fake"]
    : ["Richtig", "Falsch"];
  const choices: VoteChoice[] = postType === "poll" ? ["option_1", "option_2"] : ["true", "false"];

  function submit(nextChoice: VoteChoice = choice!) {
    if (!nextChoice || pending) return;
    setError("");
    startTransition(async () => {
      try {
        const saved = await submitTeacherModulePostVote({ postId, classInstanceId, choice: nextChoice });
        setChoice(nextChoice);
        setResult(saved);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Deine Antwort konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <section className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-violet-700">
        {postType === "poll" ? <BarChart3 className="h-4 w-4"/> : <CheckCircle2 className="h-4 w-4"/>}
        {postType === "poll" ? "Deine Einschätzung" : "Richtig oder falsch?"}
      </div>
      {!result ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {choices.map((value,index) => <button key={value} type="button" onClick={()=>setChoice(value)} className={"min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition "+(choice===value?"border-violet-500 bg-violet-100 text-violet-900 ring-2 ring-violet-100":"border-slate-200 bg-white text-slate-700 hover:border-violet-300")}>{labels[index]}</button>)}
          </div>
          <button type="button" disabled={!choice||pending} onClick={()=>submit()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45">{pending?"Wird gespeichert …":"Abstimmen"}</button>
        </>
      ) : (
        <div className="mt-3 space-y-3" aria-live="polite">
          {postType === "true_false" && <div className={"flex items-start gap-2 rounded-xl p-3 text-sm font-semibold "+(result.isCorrect?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-800")}>{result.isCorrect?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>:<XCircle className="mt-0.5 h-4 w-4 shrink-0"/>}{result.isCorrect?"Richtig erkannt!":"Nicht ganz – die richtige Antwort ist "+(result.correctAnswer==="true"?"Richtig":"Falsch")+"."}</div>}
          {postType === "poll" && <p className="text-sm font-bold text-slate-900">So hat deine Klasse abgestimmt</p>}
          {choices.map((value,index)=>{
            const count=result.counts[value]??0;
            const percent=result.total?Math.round(count/result.total*100):0;
            return <div key={value} className="space-y-1"><div className="flex justify-between gap-3 text-xs"><span className="font-medium text-slate-700">{labels[index]}{choice===value?" · Deine Stimme":""}</span><span className="font-bold tabular-nums text-slate-900">{percent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-600 transition-all" style={{width:percent+"%"}}/></div></div>;
          })}
          {postType === "true_false" && result.explanation && <p className="rounded-xl bg-white/80 p-3 text-sm leading-6 text-slate-700">{result.explanation}</p>}
          <div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] text-slate-500">{result.total} {result.total===1?"Stimme":"Stimmen"}</span><button type="button" disabled={pending} onClick={()=>submit()} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"><RefreshCw className={"h-3.5 w-3.5 "+(pending?"animate-spin":"")}/>Aktualisieren</button></div>
        </div>
      )}
      {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </section>
  );
}
