"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { deleteScenarioFamily } from "./actions";

export function ScenarioDeleteButton({ scenarioId, title }: { scenarioId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    if (confirmation.trim() !== title) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteScenarioFamily(scenarioId, confirmation.trim());
        router.push("/scenarios");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Das Szenario konnte nicht gelöscht werden.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setConfirmation(""); setError(""); setOpen(true); }}
        aria-label={`Szenario ${title} endgültig löschen`}
        title="Szenario endgültig löschen"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 sm:h-11 sm:w-11 sm:rounded-xl"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="scenario-delete-title" className="w-full max-w-lg rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><AlertTriangle className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 id="scenario-delete-title" className="text-lg font-bold text-slate-950">Szenario endgültig löschen?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">„{title}“ und alle Altersvarianten werden unwiderruflich entfernt – einschließlich Lerninhalten, Missionen, Lernplänen, Klassenzuweisungen sowie Schülerfortschritten und Abschlüssen.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Dialog schließen" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Zur Bestätigung den vollständigen Szenariotitel eingeben:
              <input
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={pending}
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                placeholder={title}
              />
            </label>
            {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} disabled={pending} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Abbrechen</button>
              <button type="button" onClick={remove} disabled={pending || confirmation.trim() !== title} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                {pending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Wird gelöscht …</> : <><Trash2 className="h-4 w-4" /> Endgültig löschen</>}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
