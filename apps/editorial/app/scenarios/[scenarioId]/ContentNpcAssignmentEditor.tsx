"use client";

import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
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

  async function save() {
    setBusy(true);
    try {
      await updateContentItemCreator(contentItemId, scenarioId, creatorId || null);
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  return <section className="overflow-hidden rounded-xl border border-violet-100 bg-white">
    <button type="button" onClick={() => { setCreatorId(initialCreatorId ?? ""); setOpen(!open); }} aria-expanded={open} className="flex w-full items-center gap-2.5 p-3 text-left hover:bg-violet-50/50">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-900">Figur / NPC</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{current ? `${current.display_name}${current.npc_category ? " · " + (CATEGORY_LABELS[current.npc_category] ?? current.npc_category) : ""}` : "Keine Figur zugeordnet"}</span></span>
      <span className="rounded-lg border border-violet-200 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700">{open ? "Schließen" : current ? "Ändern" : "Zuordnen"}</span>
    </button>
    {open && <div className="border-t border-violet-100 p-3">
      <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="NPC suchen …" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-violet-400" /></div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{CATEGORIES.map(([value, label]) => <button key={value} type="button" onClick={() => setCategory(value)} className={"shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold " + (category === value ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-50")}>{label}</button>)}</div>
      <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
        <button type="button" onClick={() => setCreatorId("")} className={"w-full rounded-lg border px-2.5 py-2 text-left text-xs " + (!creatorId ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-100 text-slate-600 hover:bg-slate-50")}>Keine Figur</button>
        {filtered.map((creator) => <button key={creator.id} type="button" onClick={() => setCreatorId(creator.id)} className={"flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left " + (creatorId === creator.id ? "border-violet-300 bg-violet-50" : "border-slate-100 hover:bg-slate-50")}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><UserRound className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{creator.display_name}</span><span className="shrink-0 text-[10px] text-slate-500">{creator.npc_category ? CATEGORY_LABELS[creator.npc_category] ?? creator.npc_category : creator.creator_role ?? "NPC"}</span>
        </button>)}
        {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-slate-500">Keine passenden NPCs gefunden.</p>}
      </div>
      <div className="mt-2 flex justify-end"><button type="button" disabled={busy} onClick={save} className="rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? "Speichert …" : "Zuordnung speichern"}</button></div>
    </div>}
  </section>;
}
