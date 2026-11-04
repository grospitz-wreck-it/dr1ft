"use client";

import { useState, useTransition } from "react";
import { FileText, Printer, X } from "lucide-react";
import { getTeacherModuleFreeTextReport } from "./teacherModuleActions";

type Report = {
  moduleTitle: string;
  generatedAt: string;
  questionCount: number;
  studentCount: number;
  rows: Array<{ postId: string; question: string; student: string; username: string; answer: string; submittedAt: string | null }>;
};

export function TeacherModuleResponses({ classId, moduleId }: { classId: string; moduleId: string }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function showReport() {
    setError("");
    setOpen(true);
    if (report) return;
    startTransition(async () => {
      try {
        setReport(await getTeacherModuleFreeTextReport(classId, moduleId) as Report);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Antwortübersicht konnte nicht geladen werden.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={showReport} title="Freitextantworten ansehen" aria-label="Freitextantworten ansehen"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200 bg-white text-cyan-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50">
        <FileText className="h-4 w-4" />
      </button>
      {open && (
        <div className="teacher-module-report-overlay fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="teacher-module-report-title">
          <section className="teacher-module-report-panel flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-600">DR1FT · Lehrkraft-Auswertung</p>
                <h2 id="teacher-module-report-title" className="mt-1 truncate text-lg font-extrabold text-slate-950">Freitextantworten</h2>
                <p className="mt-0.5 text-xs text-slate-500">{report?.moduleTitle ?? "Antwortübersicht des Moduls"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => window.print()} disabled={!report || pending} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"><Printer className="h-4 w-4"/>Drucken / PDF</button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {pending && <p className="py-12 text-center text-sm text-slate-500">Antworten werden geladen …</p>}
              {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              {report && <>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-violet-50 p-3"><p className="text-[10px] font-semibold text-violet-700">Schülerkonten</p><p className="mt-1 text-xl font-extrabold text-slate-950">{report.studentCount}</p></div>
                  <div className="rounded-xl bg-cyan-50 p-3"><p className="text-[10px] font-semibold text-cyan-800">Freitextfragen</p><p className="mt-1 text-xl font-extrabold text-slate-950">{report.questionCount}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-600">Antworten</p><p className="mt-1 text-xl font-extrabold text-slate-950">{report.rows.filter(row => row.answer.trim()).length}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-600">Ohne Antwort</p><p className="mt-1 text-xl font-extrabold text-slate-950">{report.rows.filter(row => !row.answer.trim()).length}</p></div>
                </div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Antworten nach Frage und Schülerkonto</h3>
                  <p className="text-[10px] text-slate-500">Erstellt am {new Date(report.generatedAt).toLocaleString("de-DE")}</p>
                </div>
                {report.rows.length ? <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Frage</th><th className="px-3 py-3">Schülerkonto</th><th className="px-3 py-3">Antwort</th><th className="px-3 py-3">Eingegangen</th></tr></thead>
                    <tbody>{report.rows.map((row,index)=><tr key={row.postId+"-"+index} className="border-t border-slate-100 align-top">
                      <td className="max-w-[210px] px-3 py-3 font-semibold text-slate-800">{row.question}</td>
                      <td className="px-3 py-3"><p className="font-semibold text-slate-800">{row.student}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.username}</p></td>
                      <td className="max-w-[440px] whitespace-pre-wrap break-words px-3 py-3 text-slate-700">{row.answer || <span className="italic text-slate-400">Noch nicht beantwortet</span>}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-500">{row.submittedAt ? new Date(row.submittedAt).toLocaleString("de-DE") : "—"}</td>
                    </tr>)}</tbody>
                  </table>
                </div> : <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">In diesem Modul sind keine Freitextfragen vorhanden.</p>}
              </>}
            </div>
          </section>
          <style jsx global>{`
            @media print {
              @page { size: A4 landscape; margin: 12mm; }
              body * { visibility: hidden !important; }
              .teacher-module-report-overlay, .teacher-module-report-overlay * { visibility: visible !important; }
              .teacher-module-report-overlay { position: absolute !important; inset: 0 !important; display: block !important; overflow: visible !important; padding: 0 !important; background: white !important; }
              .teacher-module-report-panel { display: block !important; width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; }
              .teacher-module-report-panel header button { display: none !important; }
              .teacher-module-report-panel > div { overflow: visible !important; padding: 0 !important; }
              .teacher-module-report-panel table { min-width: 0 !important; font-size: 9pt !important; }
              .teacher-module-report-panel th, .teacher-module-report-panel td { padding: 6px !important; }
              .teacher-module-report-panel tr { break-inside: avoid; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
