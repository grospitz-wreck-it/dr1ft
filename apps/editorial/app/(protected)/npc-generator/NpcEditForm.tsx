"use client";

import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { updateNpcProfile } from "./edit-actions";
import { NpcInterestSelector } from "./NpcInterestSelector";
import { NpcModuleSelector } from "./NpcModuleSelector";

type Interest = { key: string; label: string; emoji: string | null; category: string };
type Module = { id: string; title: string };
type Npc = { id: string; display_name: string; handle: string; actor_type: string; age: number | null; keywords: string[] | null; context: string | null; interest_keys: string[] | null };

export function NpcEditForm({ npc, interests, modules, assignedModuleIds }: { npc: Npc; interests: Interest[]; modules: Module[]; assignedModuleIds: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSaved(false);
    const form = event.currentTarget; const data = new FormData(form);
    startTransition(async () => {
      try { await updateNpcProfile(data); setSaved(true); }
      catch (err) { setError(err instanceof Error ? err.message : "Der Akteur konnte nicht gespeichert werden."); }
    });
  }

  return <details className="group rounded-xl border border-slate-200 bg-slate-50">
    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700"><span>✎ Akteur bearbeiten</span><span className="text-[11px] text-slate-400 group-open:hidden">Details öffnen</span></summary>
    <form onSubmit={submit} className="border-t border-slate-200 p-4 space-y-4 bg-white rounded-b-xl">
      <input type="hidden" name="npcId" value={npc.id} />
      <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">Hier änderst du die redaktionellen Eigenschaften des Akteurs. Änderungen werden direkt gespeichert.</div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block"><span className="label">NAME</span><input name="displayName" defaultValue={npc.display_name} className="control" /></label>
        <label className="block"><span className="label">HANDLE</span><input name="handle" defaultValue={npc.handle} className="control" /></label>
        <label className="block"><span className="label">AKTEUR-TYP</span><select name="actorType" defaultValue={npc.actor_type} className="control"><option value="person">Person</option><option value="creator">Creator / Influencer</option><option value="news_outlet">News-Outlet</option><option value="brand">Marke / Werbekunde</option><option value="company">Unternehmen</option><option value="organization">Organisation</option><option value="community">Community / Gruppe</option><option value="bot">Bot / automatisierter Account</option></select></label>
        <label className="block"><span className="label">ALTER <span className="normal-case tracking-normal font-normal">(nur Person/Creator)</span></span><input name="age" type="number" min="12" max="99" defaultValue={npc.age ?? ""} className="control" /></label>
      </div>
      <NpcModuleSelector modules={modules} initialSelected={assignedModuleIds} />
      <NpcInterestSelector interests={interests} initialSelected={npc.interest_keys ?? []} />
      <label className="block"><span className="label">STICHWORTE</span><input name="keywords" defaultValue={(npc.keywords ?? []).join(", ")} placeholder="z.B. lokal, Fußball, kritisch, Memes" className="control" /><span className="text-[11px] text-slate-400">Mit Kommas trennen. Diese Begriffe helfen bei der thematischen Einordnung.</span></label>
      <label className="block"><span className="label">KONTEXT / ROLLE</span><textarea name="context" rows={5} defaultValue={npc.context ?? ""} placeholder="Welche Rolle soll der Akteur im digitalen Umfeld spielen?" className="control resize-y" /></label>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      {saved && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center gap-2"><Check className="w-3.5 h-3.5" /> Änderungen gespeichert.</div>}
      <button disabled={pending} className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{pending ? "Speichert …" : "Änderungen speichern"}</button>
    </form>
  </details>;
}
