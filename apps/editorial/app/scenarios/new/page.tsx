import { ArrowLeft, Clock3, FilePlus2, Route, Sparkles, Users } from "lucide-react";
import { generateScenarioDraft } from "../actions";
import { AiGenerationButton } from "../../components/AiGenerationButton";

const AGE_BANDS = [
  ["9_11", "9–11", "Kinder / frühe Lernende"],
  ["12_13", "12–13", "Frühe Teenager"],
  ["14_15", "14–15", "Mittlere Teenager"],
  ["16_17", "16–17", "Ältere Jugendliche"],
  ["18_plus", "18+", "Erwachsene / ältere Lernende"],
] as const;

export default function NewScenarioPage({ searchParams = {} }: { searchParams?: { generationError?: string } }) {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <a href="/scenarios" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Zur Szenario-Bibliothek</a>
      <header>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700"><Sparkles className="h-4 w-4" /> Neuer Lernfall</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Neues Szenario anlegen</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Beschreibe Thema, Lernabsicht und Zielgruppe. DR1FT erstellt daraus einen redaktionellen Entwurf, den du anschließend im Szenario-Wizard prüfst und vervollständigst.</p>
      </header>
      {searchParams.generationError && <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4"><div className="text-xs font-semibold uppercase tracking-wider text-red-700">KI-Entwurf fehlgeschlagen</div><div className="mt-1 break-words text-sm text-red-800">{searchParams.generationError}</div></section>}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.035)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="h-4 w-4" /></div>
            <div><h2 className="font-semibold text-slate-900">Szenario-Brief</h2><p className="mt-1 text-sm text-slate-500">Einmal die Grundlage festlegen. Lege Thema, Zielgruppe und die grobe Lern-Ausrichtung fest. DR1FT erstellt daraus einen ersten Entwurf mit konkreten Lernerlebnissen.</p></div>
          </div>
        </div>
      <form action={generateScenarioDraft} className="grid gap-7 p-6 lg:grid-cols-[1.15fr_.85fr] lg:p-7">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">THEMA</label>
                <input
                  name="topic"
                  required
                  placeholder="z. B. Fake News erkennen"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">DEIN KURZER BRIEF</label>
                <textarea
                  name="brief"
                  rows={6}
                  placeholder="Was soll passieren? Was sollen Jugendliche lernen? Gibt es einen bestimmten Alltagsschauplatz, eine Plattform oder Vorgabe?"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent resize-y"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Stichpunkte reichen. Die KI formuliert daraus den redaktionellen Entwurf.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">BESONDERE VORGABEN</label>
                <textarea
                  name="constraints"
                  rows={3}
                  placeholder="Optional: keine realen Personen, Schulchat statt TikTok, eher sachlich …"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent resize-y"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600">ALTERSVARIANTEN</label>
                  <span className="text-[11px] text-slate-400">Mehrere möglich</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {AGE_BANDS.map(([value, label, hint]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        name="ageBands"
                        value={value}
                        defaultChecked={value !== "18_plus"}
                        className="shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight text-slate-800">{label}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5 truncate">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-slate-900">Lern-Ausrichtung <span className="font-normal text-slate-400">· kurz wählen</span></div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Diese Angaben steuern, wie die KI die Erlebnisse und Interaktionen aufbaut. Du kannst den Entwurf später bearbeiten.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Wie sollen Lernende vor allem lernen?</label>
                    <select name="learningModel" defaultValue="experience_reflection" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                      <option value="experience_reflection">Erleben → reflektieren → ausprobieren</option>
                      <option value="goal_aligned">Lernziel → passende Aufgabe → Nachweis</option>
                      <option value="discover_evidence">Hinweise entdecken → prüfen → Urteil bilden</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Was sollen Lernende am Ende können?</label>
                    <select name="cognitiveLevel" defaultValue="analyze" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                      <option value="understand">Erklären und verstehen</option>
                      <option value="apply">Wissen in einer Situation anwenden</option>
                      <option value="analyze">Hinweise vergleichen und Zusammenhänge erkennen</option>
                      <option value="evaluate">Eine Entscheidung begründen</option>
                      <option value="create">Eine eigene Lösung entwickeln</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Welche Art Lernerlebnis passt?</label>
                    <select name="experiencePattern" defaultValue="social_feed" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                      <option value="social_feed">Social Feed: Posts, Kommentare und Reaktionen</option>
                      <option value="investigation">Ermittlung: Hinweise sammeln und abgleichen</option>
                      <option value="decision">Entscheidung: wählen, Folgen erleben, reflektieren</option>
                      <option value="conversation">Dialog: Perspektiven und Antworten abwägen</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">UMFANG</label>
                  <select name="duration" defaultValue="standard" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="short">Kurz · 5–10 Min.</option>
                    <option value="standard">Standard · 15–20 Min.</option>
                    <option value="intensive">Intensiv · 25–35 Min.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">TON</label>
                  <select name="tone" defaultValue="realistic" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="realistic">realistisch</option>
                    <option value="neutral">sachlich</option>
                    <option value="emotional">emotional</option>
                    <option value="light">locker / leicht</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-800">Die KI erstellt</div>
                <div className="flex items-center gap-2"><FilePlus2 className="w-3.5 h-3.5" /> eine Variante je Altersgruppe</div>
                <div className="flex items-center gap-2"><Route className="w-3.5 h-3.5" /> einen ersten Ablauf</div>
                <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> 2–4 konkrete Missionen</div>
                <div className="flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" /> alles als Entwurf</div>
              </div>

              <AiGenerationButton
                idleLabel="Szenario-Draft erstellen"
                pendingLabel="Szenario wird erstellt …"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
              />
            </div>
      </form>
      </section>
    </div>
  );
}
