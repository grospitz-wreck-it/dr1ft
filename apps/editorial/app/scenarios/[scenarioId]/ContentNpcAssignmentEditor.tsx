"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateContentItemCreator } from "../actions";

type Creator = { id: string; display_name: string; creator_role?: string | null; npc_category?: string | null };
const CATEGORIES = [
  ["all", "Alle"], ["student", "Schüler:innen"], ["brand", "Brands"], ["party", "Parteien"],
  ["club", "Vereine"], ["influencer", "Influencer"], ["institution", "Institutionen"],
  ["citizen", "Normale Leute"], ["creator", "Creator / Medien"], ["other", "Sonstige"],
] as const;
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES) as Record<string, string>;

export function ContentNpcAssignmentEditor({ scenarioId, contentItemId, initialCreatorId, creators = [] }: { scenarioId: string; contentItemId: string; initialCreatorId: string | null; creators?: Creator[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creatorId, setCreatorId] = useState(initialCreatorId ?? "");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState(false);
  const current = creators.find((creator) => creator.id === initialCreatorId) ?? null;
  const filtered = useMemo(() => creators.filter((creator) =>
    (category === "all" || creator.npc_category === category) &&
    (!search.trim() || creator.display_name.toLocaleLowerCase("de").includes(search.trim().toLocaleLowerCase("de")))
  ), [creators, category, search]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function save() {
    setBusy(true);
    try {
      await updateContentItemCreator(contentItemId, scenarioId, creatorId || null);
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  return <>
    <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <button type="button" onClick={() => { setCreatorId(initialCreatorId ?? ""); setOpen(true); }} aria-haspopup="dialog" className="group flex w-full items-center justify-between gap-4 p-3 text-left transition hover:bg-violet-50/60">
        <span className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-900">NPC</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{current ? `${current.display_name}${current.npc_category ? " · " + (CATEGORY_LABELS[current.npc_category] ?? current.npc_category) : ""}` : "Kein NPC zugeordnet"}</span></span></span>
        <span className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[11px] font-bold text-violet-700 shadow-sm group-hover:bg-violet-50">{current ? "Ändern" : "Zuordnen"}</span>
      </button>
    </section>

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="NPC zuordnen" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-violet-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6"><div><h2 className="text-lg font-bold text-slate-950">NPC zuordnen</h2><p className="mt-0.5 text-xs text-slate-500">Suche einen NPC oder filtere nach Kategorie.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Schließen"><X className="h-5 w-5" /></button></div>
        <div className="space-y-3 p-4 sm:p-5">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="NPC suchen …" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></div>
          <div className="flex flex-wrap gap-1.5">{CATEGORIES.map(([value, label]) => <button key={value} type="button" onClick={() => setCategory(value)} className={"rounded-full px-3 py-1.5 text-[11px] font-semibold " + (category === value ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-50")}>{label}</button>)}</div>
          <div className="max-h-[45vh] space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 p-2">
            <button type="button" onClick={() => setCreatorId("")} className={"w-full rounded-xl border px-3 py-2.5 text-left text-sm " + (!creatorId ? "border-violet-300 bg-violet-50 text-violet-800" : "border-transparent text-slate-600 hover:bg-slate-50")}>Kein NPC</button>
            {filtered.map((creator) => <button key={creator.id} type="button" onClick={() => setCreatorId(creator.id)} className={"flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left " + (creatorId === creator.id ? "border-violet-300 bg-violet-50" : "border-transparent hover:bg-slate-50")}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{creator.display_name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{creator.npc_category ? CATEGORY_LABELS[creator.npc_category] ?? creator.npc_category : creator.creator_role ?? "NPC"}</span></span>{creatorId === creator.id && <span className="text-xs font-bold text-violet-700">Ausgewählt</span>}
            </button>)}
            {filtered.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-500">Keine passenden NPCs gefunden.</p>}
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Abbrechen</button><button type="button" disabled={busy} onClick={save} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Speichert …" : "NPC speichern"}</button></div>
      </div>
    </div>}
  </>;
}
