"use client";

import { useMemo, useState } from "react";

type CompletionFeedback = {
  low_threshold_percent?: number;
  middle_threshold_percent?: number;
  low_message?: string;
  middle_message?: string;
  high_message?: string;
};

type Props = {
  scenarioId: string;
  requiredRequirementCount: number;
  config: CompletionFeedback | null;
  saveAction: (formData: FormData) => Promise<void>;
};

const DEFAULTS = {
  lowThreshold: 25,
  middleThreshold: 75,
  lowMessage: "Bist du sicher? Du hast bisher kaum etwas entdeckt. Schau dich noch einmal um.",
  middleMessage: "Willst du DR1FT wirklich schon beenden? Es gibt noch Hinweise zu finden.",
  highMessage: "Du hast das Thema bereits gut erfasst. Deine Auswertung wird jetzt erstellt.",
};

export function ScenarioCompletionFeedbackEditor({
  requiredRequirementCount,
  config,
  saveAction,
}: Props) {
  const [lowThreshold, setLowThreshold] = useState(config?.low_threshold_percent ?? DEFAULTS.lowThreshold);
  const [middleThreshold, setMiddleThreshold] = useState(config?.middle_threshold_percent ?? DEFAULTS.middleThreshold);
  const [lowMessage, setLowMessage] = useState(config?.low_message ?? DEFAULTS.lowMessage);
  const [middleMessage, setMiddleMessage] = useState(config?.middle_message ?? DEFAULTS.middleMessage);
  const [highMessage, setHighMessage] = useState(config?.high_message ?? DEFAULTS.highMessage);

  const counts = useMemo(() => {
    if (requiredRequirementCount <= 0) return { low: 0, middle: 0 };
    return {
      low: Math.ceil(requiredRequirementCount * lowThreshold / 100),
      middle: Math.ceil(requiredRequirementCount * middleThreshold / 100),
    };
  }, [requiredRequirementCount, lowThreshold, middleThreshold]);

  const valid = lowThreshold < middleThreshold;

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Szenarioabschluss</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Abschluss-Feedback festlegen</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">
            Diese drei Rückmeldungen erscheinen, wenn Lernende das gesamte Szenario beenden möchten – nicht bei einzelnen Beiträgen.
          </p>
        </div>
        <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
          {requiredRequirementCount} auswertbare Pflichtabfragen
        </span>
      </div>

      <form action={saveAction} className="mt-5 space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Rückmeldung: wenig entdeckt</span>
            <textarea name="lowMessage" value={lowMessage} onChange={(event) => setLowMessage(event.target.value)} maxLength={500} rows={3} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Rückmeldung: noch Hinweise offen</span>
            <textarea name="middleMessage" value={middleMessage} onChange={(event) => setMiddleMessage(event.target.value)} maxLength={500} rows={3} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Rückmeldung: gut erfasst</span>
            <textarea name="highMessage" value={highMessage} onChange={(event) => setHighMessage(event.target.value)} maxLength={500} rows={3} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Schwellen für die Rückmeldungen</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Die Regler arbeiten mit Prozenten. DR1FT rechnet sie anhand der Pflichtabfragen automatisch in konkrete Anzahlen um.
              </p>
            </div>
            <span className="text-xs font-semibold tabular-nums text-slate-600">{requiredRequirementCount} Abfragen insgesamt</span>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>Bis hier: „wenig entdeckt“</span>
                <span className="tabular-nums text-violet-700">{lowThreshold}% · {counts.low} von {requiredRequirementCount}</span>
              </span>
              <input name="lowThresholdPercent" type="range" min="0" max="99" step="1" value={lowThreshold} onChange={(event) => setLowThreshold(Number(event.target.value))} disabled={requiredRequirementCount === 0} className="mt-3 w-full accent-violet-600 disabled:opacity-40" />
            </label>
            <label className="block">
              <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>Bis hier: „noch Hinweise offen“</span>
                <span className="tabular-nums text-violet-700">{middleThreshold}% · {counts.middle} von {requiredRequirementCount}</span>
              </span>
              <input name="middleThresholdPercent" type="range" min="1" max="100" step="1" value={middleThreshold} onChange={(event) => setMiddleThreshold(Number(event.target.value))} disabled={requiredRequirementCount === 0} className="mt-3 w-full accent-violet-600 disabled:opacity-40" />
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Wenig entdeckt</p>
              <p className="mt-1 text-sm font-semibold text-amber-900">Unter {lowThreshold}%</p>
              <p className="mt-1 text-xs text-amber-800">Grenze bei ca. {counts.low} von {requiredRequirementCount} vollständig erfüllten Abfragen</p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Noch Hinweise offen</p>
              <p className="mt-1 text-sm font-semibold text-sky-900">{lowThreshold}% bis unter {middleThreshold}%</p>
              <p className="mt-1 text-xs text-sky-800">Grenze bei ca. {counts.middle} von {requiredRequirementCount} vollständig erfüllten Abfragen</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Gut erfasst</p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">Ab {middleThreshold}%</p>
              <p className="mt-1 text-xs text-emerald-800">Ab ca. {counts.middle} von {requiredRequirementCount} vollständig erfüllten Abfragen</p>
            </div>
          </div>

          {!valid && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">Die erste Schwelle muss kleiner als die zweite sein.</p>}
          {requiredRequirementCount === 0 && <p className="mt-3 text-xs text-amber-700">Aktuell gibt es keine explizit bewertbaren Pflichtabfragen. Sobald solche Abfragen angelegt sind, wird die dynamische Vorschau hier angezeigt.</p>}
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            Die Prozentwerte beziehen sich ausschließlich auf die Erfüllung der Pflichtabfragen. Sie sind keine Kompetenzstufen. Die endgültige Auswertung nutzt weiterhin den eingefrorenen Zuweisungs-Snapshot.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">Die Vorschau aktualisiert sich beim Verschieben der Regler sofort.</p>
          <button type="submit" disabled={!valid} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Abschluss-Feedback speichern</button>
        </div>
      </form>
    </section>
  );
}
