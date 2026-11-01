"use client";

import { useState } from "react";
import { Check, FileText, HelpCircle, Mail, MessageCircle, Puzzle, Plus, Video, X } from "lucide-react";

export type ContentModuleId = "feed_post" | "group_chat" | "interactive_task" | "video" | "direct_message";

const MODULES: { id: ContentModuleId; title: string; short: string; description: string; Icon: typeof FileText; tone: string }[] = [
  { id: "feed_post", title: "Feed-Posts", short: "Social Feed", description: "Beiträge im simulierten Feed erleben, einordnen und darauf reagieren.", Icon: FileText, tone: "bg-violet-100 text-violet-700" },
  { id: "group_chat", title: "Gruppenchats", short: "Chats", description: "Gespräche, Gruppendynamiken und unterschiedliche Perspektiven direkt erleben.", Icon: MessageCircle, tone: "bg-sky-100 text-sky-700" },
  { id: "interactive_task", title: "Interaktive Aufgaben", short: "Aufgaben", description: "Wissen aktiv anwenden, Entscheidungen treffen oder konkrete Aufgaben lösen.", Icon: Puzzle, tone: "bg-amber-100 text-amber-700" },
  { id: "video", title: "Videos", short: "Video", description: "Visuelle Inhalte gezielt in den Lernweg integrieren und anschließend weiterverarbeiten.", Icon: Video, tone: "bg-rose-100 text-rose-700" },
  { id: "direct_message", title: "Direktnachrichten", short: "Nachrichten", description: "Persönliche Situationen und individuelle Perspektiven über private Nachrichten vermitteln.", Icon: Mail, tone: "bg-emerald-100 text-emerald-700" },
];

export function ContentModulePicker({ selected, onChange }: { selected: ContentModuleId[]; onChange: (modules: ContentModuleId[]) => void }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<ContentModuleId | null>(null);
  const selectedModules = MODULES.filter((module) => selected.includes(module.id));

  function toggle(id: ContentModuleId) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Puzzle className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-bold text-slate-900">2. Content-Module wählen</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">Wähle die Bausteine, die DR1FT für diesen Lernweg verwenden darf. Du kannst mehrere kombinieren.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/70 via-white to-sky-50/60 p-3">
        {selectedModules.map((module) => {
          const Icon = module.Icon;
          return (
            <span key={module.id} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              <span className={"grid h-6 w-6 place-items-center rounded-lg " + module.tone}><Icon className="h-3.5 w-3.5" /></span>
              {module.title}
              <button type="button" onClick={() => toggle(module.id)} className="ml-0.5 rounded-full p-0.5 text-violet-400 transition hover:bg-violet-50 hover:text-violet-700" aria-label={module.title + " entfernen"}><X className="h-3.5 w-3.5" /></button>
            </span>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-dashed border-sky-300 bg-gradient-to-r from-sky-50 to-fuchsia-50 px-4 py-2 text-sm font-bold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <Plus className="h-4 w-4" /> Content-Module
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="bg-gradient-to-r from-sky-50 via-white to-fuchsia-50 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-fuchsia-500 text-white shadow-lg shadow-sky-200"><Puzzle className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-950">Content-Module hinzufügen</h4>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Wähle einen oder mehrere Bausteine aus. DR1FT darf später nur die hier freigegebenen Module für den Lernweg verwenden.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="grid gap-2 p-5 sm:grid-cols-2">
              {MODULES.map((module) => {
                const Icon = module.Icon;
                const active = selected.includes(module.id);
                return (
                  <div key={module.id} className={"group relative rounded-2xl border p-4 transition " + (active ? "border-violet-300 bg-violet-50/60" : "border-slate-200 hover:border-sky-200 hover:bg-sky-50/30")}>
                    <button type="button" onClick={() => toggle(module.id)} className="flex w-full items-start gap-3 text-left">
                      <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl " + module.tone}><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">{module.title}</span><span className="mt-1 block text-xs leading-4 text-slate-500">{module.short}</span></span>
                      <span className={"grid h-5 w-5 place-items-center rounded-full border " + (active ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300 bg-white text-transparent")}><Check className="h-3 w-3" /></span>
                    </button>
                    <button type="button" onClick={() => setInfo(info === module.id ? null : module.id)} className="absolute bottom-3 right-3 rounded-full p-1 text-slate-400 hover:bg-white hover:text-sky-600" aria-label={"Mehr über " + module.title}><HelpCircle className="h-4 w-4" /></button>
                    {info === module.id && <p className="mt-3 rounded-xl border border-sky-100 bg-white/80 p-2.5 pr-8 text-xs leading-5 text-slate-600">{module.description}</p>}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <span className="text-xs text-slate-500">{selected.length ? selected.length + " Modul" + (selected.length === 1 ? "" : "e") + " ausgewählt" : "Noch kein Modul ausgewählt"}</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200">Übernehmen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
