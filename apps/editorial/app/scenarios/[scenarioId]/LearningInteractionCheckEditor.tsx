"use client";

import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { saveContentInteractionChecks } from "../learning-step-design-actions";

type CheckKey = "inspect_source" | "inspect_media" | "inspect_context" | "inspect_profile" | "compare_information";
type CheckConfig = { enabled: boolean; feedback: string };
type Checks = Record<CheckKey, CheckConfig>;

const OPTIONS: { key: CheckKey; label: string; hint: string }[] = [
  { key: "inspect_source", label: "Quelle ansehen", hint: "Was zeigt die Quellenprüfung?" },
  { key: "inspect_media", label: "Bild prüfen", hint: "Was ergibt die Bild-/Medienprüfung?" },
  { key: "inspect_context", label: "Kontext prüfen", hint: "Welche Kontextinformation wird aufgedeckt?" },
  { key: "inspect_profile", label: "Profil ansehen", hint: "Was fällt bei der Profilprüfung auf?" },
  { key: "compare_information", label: "Informationen vergleichen", hint: "Hinweis für den Vergleich; die verknüpfte Gegeninformation muss zusätzlich vorhanden sein." },
];

function readChecks(extra: unknown): Checks {
  const source = extra && typeof extra === "object" ? (extra as Record<string, unknown>).interaction_checks : null;
  const saved = source && typeof source === "object" ? source as Record<string, unknown> : {};
  return Object.fromEntries(OPTIONS.map(({ key }) => {
    const value = saved[key] && typeof saved[key] === "object" ? saved[key] as Record<string, unknown> : {};
    return [key, { enabled: typeof value.enabled === "boolean" ? value.enabled : false, feedback: typeof value.feedback === "string" ? value.feedback : "" }];
  })) as Checks;
}

export function LearningInteractionCheckEditor({ scenarioId, item }: {
  scenarioId: string;
  item: { id: string; body: string | null; media_url?: string | null; media_type?: string | null; extra?: unknown };
}) {
  const [checks, setChecks] = useState<Checks>(() => readChecks(item.extra));
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const extra = item.extra && typeof item.extra === "object" ? item.extra as Record<string, unknown> : {};

  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        await saveContentInteractionChecks(item.id, scenarioId, checks);
        setMessage("Prüfaktionen gespeichert.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] rounded-xl border border-slate-200 bg-white p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Vorschau im Player</div>
        <article className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {item.media_url && item.media_type === "image" && <img src={item.media_url} alt="" className="max-h-52 w-full object-contain bg-slate-50" />}
          <div className="p-3">
            <div className="text-[9px] uppercase tracking-wide text-slate-400">Beitrag</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{item.body || "Noch kein Beitragstext."}</p>
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400"><span>♡ Gefällt mir</span><span>◯ Kommentare</span><span className="ml-auto">Mehr · Prüfaktionen</span></div>
          </div>
        </article>
        {typeof extra.media_context === "object" && extra.media_context !== null && <p className="mt-2 text-[10px] text-slate-400">Medienkontext ist vorhanden.</p>}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Prüfaktionen konfigurieren</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Aktiviere nur Checks, die für diesen Beitrag sinnvoll sind. Die Rückmeldung muss sich auf konkrete, redaktionell geprüfte Informationen stützen.</p>
        <div className="mt-2 space-y-2">
          {OPTIONS.map((option) => (
            <div key={option.key} className="rounded-lg border border-slate-200 p-2.5">
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-800">
                <input type="checkbox" checked={checks[option.key].enabled} onChange={(event) => setChecks((current) => ({ ...current, [option.key]: { ...current[option.key], enabled: event.target.checked } }))} className="mt-0.5" />
                <span>{option.label}<span className="mt-0.5 block text-[10px] font-normal text-slate-400">{option.hint}</span></span>
              </label>
              {checks[option.key].enabled && (
                <label className="mt-2 block text-[10px] font-medium text-slate-500">
                  Rückmeldung nach dem Check
                  <textarea value={checks[option.key].feedback} onChange={(event) => setChecks((current) => ({ ...current, [option.key]: { ...current[option.key], feedback: event.target.value } }))} rows={2} placeholder="Welche konkrete Information soll der Schüler sehen?" className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-800" />
                </label>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"><Save className="h-3 w-3" />{busy ? "Speichert …" : "Checks speichern"}</button>
          {message && <span role="status" className="text-[10px] text-slate-500"><Check className="mr-1 inline h-3 w-3" />{message}</span>}
        </div>
      </div>
    </div>
  );
}
