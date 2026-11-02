import { Plus, Trash2, Layers3 } from "lucide-react";
import { createScenarioLearningCard, deleteScenarioLearningCard } from "./learning-cards-actions";

type Card = { id: string; type: string; title: string; prompt: string; position: string; options?: string[]; required?: boolean };
const TYPE_LABELS: Record<string, string> = {
  decision: "Entscheidung",
  reflection: "Reflexion",
  knowledge_check: "Wissenscheck",
  mission_completion: "Missionsabschluss",
};
const POSITION_LABELS: Record<string, string> = { before_feed: "Vor dem Feed", feed_end: "Am Ende des Feeds" };

export function LearningCardsEditor({ scenarioId, cards }: { scenarioId: string; cards: Card[] }) {
  return <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
    <header className="flex flex-col gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm ring-1 ring-violet-100"><Layers3 className="h-5 w-5" /></span>
        <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Eigenständige Inhalte</p><h2 className="text-lg font-bold text-slate-950">Lernkarten</h2><p className="mt-0.5 text-sm text-slate-500">Unabhängig von einzelnen Feed-Posts anlegen und platzieren.</p></div>
      </div>
      <span className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700">{cards.length} {cards.length === 1 ? "Karte" : "Karten"}</span>
    </header>
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] sm:p-6">
      <div className="space-y-3">
        {cards.length ? cards.map((card) => <article key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">{TYPE_LABELS[card.type] ?? "Lernkarte"}</span><span className="text-[11px] text-slate-500">{POSITION_LABELS[card.position] ?? card.position}</span>{card.required && <span className="text-[10px] font-semibold text-rose-600">Pflicht</span>}</div><h3 className="mt-2 font-semibold text-slate-900">{card.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{card.prompt}</p>
              {card.options?.length ? <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">{card.options.map((option, index) => <li key={index} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{String.fromCharCode(65 + index)} · {option}</li>)}</ul> : null}
            </div>
            <form action={deleteScenarioLearningCard.bind(null, scenarioId, card.id)}><button aria-label="Lernkarte entfernen" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></form>
          </div>
        </article>) : <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center"><Layers3 className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">Noch keine Lernkarten angelegt</p><p className="mt-1 text-xs text-slate-500">Lege hier zum Beispiel eine Abschlusskarte für das Ende des Feeds an.</p></div>}
      </div>
      <form action={createScenarioLearningCard.bind(null, scenarioId)} className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Plus className="h-4 w-4 text-violet-600" /> Neue Lernkarte</div>
        <label className="block text-xs font-semibold text-slate-600">Kartentyp<select name="type" defaultValue="decision" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="decision">Entscheidung</option><option value="reflection">Reflexion</option><option value="knowledge_check">Wissenscheck</option><option value="mission_completion">Missionsabschluss</option></select></label>
        <label className="block text-xs font-semibold text-slate-600">Position<select name="position" defaultValue="feed_end" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="before_feed">Vor dem Feed</option><option value="feed_end">Am Ende des Feeds</option></select></label>
        <label className="block text-xs font-semibold text-slate-600">Titel<input name="title" required maxLength={100} placeholder="z. B. Was nimmst du mit?" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-600">Frage oder Aufgabe<textarea name="prompt" required rows={3} maxLength={500} placeholder="Formuliere die Aufgabe für die Lernenden …" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-600">Antwortmöglichkeiten <span className="font-normal text-slate-400">(eine pro Zeile, mindestens zwei)</span><textarea name="options" required rows={4} placeholder={"Ich prüfe die Quelle.\nIch teile den Beitrag sofort.\nIch frage eine weitere Person."} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" name="required" defaultChecked className="rounded border-slate-300 text-violet-600" /> Muss bearbeitet werden</label>
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"><Plus className="h-4 w-4" /> Lernkarte hinzufügen</button>
        <p className="text-[11px] leading-4 text-slate-500">Die Karten werden separat am Szenario gespeichert und nicht als Feed-Posts angelegt.</p>
      </form>
    </div>
  </section>;
}
