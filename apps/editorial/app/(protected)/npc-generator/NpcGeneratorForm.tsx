"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { generateNpcProfile } from "./actions";
import { NpcInterestSelector } from "./NpcInterestSelector";
import { NpcModuleSelector } from "./NpcModuleSelector";

type Interest = { key: string; label: string; emoji: string | null; category: string };
type Module = { id: string; title: string };

export function NpcGeneratorForm({ interests, modules }: { interests: Interest[]; modules: Module[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    const interests = String(data.get("interestKeys") ?? "").split(",").map(v => v.trim()).filter(Boolean);
    const keywords = String(data.get("keywords") ?? "").split(",").map(v => v.trim()).filter(Boolean);
    const moduleIds = String(data.get("moduleIds") ?? "").split(",").map(v => v.trim()).filter(Boolean);
    if (interests.length !== 3) { setError(`Bitte genau 3 Interessen auswählen. Aktuell sind ${interests.length} ausgewählt.`); return; }
    if (!moduleIds.length) { setError("Bitte mindestens ein Modul auswählen."); return; }
    if (!keywords.length) { setError("Bitte mindestens ein Stichwort eingeben."); return; }
    startTransition(async () => {
      try { await generateNpcProfile(data); setSuccess(true); form.reset(); }
      catch (err) { setError(err instanceof Error ? err.message : "Der Akteur konnte nicht erzeugt werden."); }
    });
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div><div className="flex items-center gap-2 font-semibold text-slate-900"><Wand2 className="w-4 h-4 text-violet-600"/> Neuer Akteur</div><p className="text-xs text-slate-500 mt-1">Du gibst die redaktionellen Leitplanken vor. Gemini baut daraus den ersten Entwurf.</p></div>
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Deine Eingaben</div><div className="grid gap-2 text-xs text-slate-600"><div><strong className="text-slate-800">1. Rolle</strong> · Was für ein Akteur ist es?</div><div><strong className="text-slate-800">2. Module</strong> · Wo darf er auftreten?</div><div><strong className="text-slate-800">3. Interessen</strong> · Welche 3 Themen passen zu ihm?</div><div><strong className="text-slate-800">4. Stichworte & Kontext</strong> · Was soll Gemini berücksichtigen?</div></div></div>
      <label className="block"><span className="label">1 · AKTEUR-TYP</span><select name="actorType" defaultValue="person" className="control"><option value="person">Person</option><option value="creator">Creator / Influencer</option><option value="news_outlet">News-Outlet</option><option value="brand">Marke / Werbekunde</option><option value="company">Unternehmen</option><option value="organization">Organisation</option><option value="community">Community / Gruppe</option><option value="bot">Bot / automatisierter Account</option></select></label>
      <NpcModuleSelector modules={modules} />
      <NpcInterestSelector interests={interests} />
      <label className="block"><span className="label">4 · STICHWORTE</span><input name="keywords" placeholder="z.B. lokal, Fußball, kritisch, Memes" className="control"/><span className="text-[11px] text-slate-400">Mehrere Begriffe mit Komma trennen. Sie steuern Themen und Charakterisierung.</span></label>
      <label className="block"><span className="label">KONTEXT / ROLLE</span><textarea name="context" rows={5} placeholder="z.B. Lokales Nachrichtenportal für Jugendliche; sachlich, aber aufmerksamkeitsstark." className="control resize-y"/><span className="text-[11px] text-slate-400">Beschreibe kurz, welche Rolle der Akteur in der digitalen Welt spielen soll.</span></label>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Akteur wurde erfolgreich erzeugt. Du findest ihn unten bei den Akteuren und kannst ihn dort bearbeiten.</div>}
      <button disabled={pending} className="w-full rounded-xl bg-slate-900 text-white px-5 py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"><Sparkles className="w-4 h-4"/> {pending ? "Akteur wird erzeugt …" : "Akteur mit Gemini erzeugen"}</button>
      <p className="text-[11px] text-slate-400">Der Akteur ist global. Klasseninstanzen sind nur Laufzeitkontext; sie werden hier nicht ausgewählt.</p>
    </form>
  );
}
