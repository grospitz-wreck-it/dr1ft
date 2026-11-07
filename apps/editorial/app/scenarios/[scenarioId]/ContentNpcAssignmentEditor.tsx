"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateContentItemCreator } from "../actions";

type Creator = {
  id: string;
  display_name: string;
  creator_role?: string | null;
  npc_category?: string | null;
  interest_tags?: string[] | null;
  bio?: string | null;
  is_active?: boolean;
};

const NPC_TYPES = [
  ["all", "Alle NPC-Typen"],
  ["student", "Schüler:innen"],
  ["brand", "Brands"],
  ["party", "Parteien"],
  ["club", "Vereine"],
  ["influencer", "Influencer"],
  ["institution", "Institutionen"],
  ["citizen", "Normale Leute"],
  ["creator", "Creator / Medien"],
  ["other", "Sonstige"],
] as const;

const TYPE_LABELS = Object.fromEntries(NPC_TYPES) as Record<string, string>;

const TOPICS = [
  { value: "all", label: "Alle Themen", tags: [] as string[] },
  { value: "extremism", label: "Politisch extrem", tags: ["Extremismus", "Rechtsextremismus", "Linksextremismus", "Neonazismus", "Radikalisierung", "Extremistische Ideologien", "Extremistische Narrative"] },
  { value: "politics", label: "Politik & Gesellschaft", tags: ["Politik", "Parteipolitik", "Aktivismus", "Demokratie", "Direkte Demokratie", "Bürgerrechte", "Bildungsreform", "Wirtschaftsordnung", "Öffentliche Sicherheit", "Protest", "Protestkultur", "Metapolitik", "Meinungsfreiheit", "Gesellschaft", "Kritik am Modernismus", "Kritik am Zeitgeist"] },
  { value: "fashion", label: "Mode & Beauty", tags: ["Mode", "Streetwear", "Streetstyle", "Beauty & Pflege", "Make-up", "Skincare", "Hautpflege", "Design", "Ästhetik", "Fashion"] },
  { value: "sports", label: "Sport", tags: ["Sport", "Fußball", "Basketball", "Handball", "Volleyball", "Fitness", "Laufen", "Radfahren", "Skateboarding", "Skaten", "Motorsport", "Klettern", "Wandern"] },
  { value: "gaming", label: "Games & Gaming", tags: ["Gaming", "Games", "E-Sport", "Fortnite", "Minecraft", "Roblox", "Indie-Games", "Game Design", "Discord", "Highscores"] },
  { value: "social", label: "Social Media", tags: ["Social Media", "Internetkultur", "Memes", "Streaming", "Videos drehen", "Podcasts", "BookTok & Lesetrends"] },
  { value: "culture", label: "Musik & Kultur", tags: ["Musik", "Hip-Hop & Rap", "K-Pop", "Pop", "Rock", "Live-Musik", "Konzerte & Festivals", "Tanzen", "Theater", "Kultur", "Kunst", "Anime", "Manga", "Comics", "Cosplay"] },
  { value: "environment", label: "Umwelt & Natur", tags: ["Klima & Umwelt", "Klimaschutz", "Umwelt", "Nachhaltigkeit", "Natur", "Tiere", "Outdoor"] },
  { value: "school", label: "Schule & Alltag", tags: ["Schule", "Schulleben", "Lern- & Study-Tipps", "Freundschaft", "Jugend", "Familie", "Gemeinschaft", "Teamwork"] },
] as const;

function normalize(value: string) {
  return value.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ContentNpcAssignmentEditor({ scenarioId, contentItemId, initialCreatorId, creators = [] }: { scenarioId: string; contentItemId: string; initialCreatorId: string | null; creators?: Creator[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creatorId, setCreatorId] = useState(initialCreatorId ?? "");
  const [search, setSearch] = useState("");
  const [npcType, setNpcType] = useState("all");
  const [topic, setTopic] = useState("all");
  const [busy, setBusy] = useState(false);
  const current = creators.find((creator) => creator.id === initialCreatorId) ?? null;

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    const selectedTopic = TOPICS.find((item) => item.value === topic);
    return creators.filter((creator) => {
      if (creator.is_active === false) return false;
      if (npcType !== "all" && creator.npc_category !== npcType) return false;
      if (selectedTopic && selectedTopic.value !== "all") {
        const tags = creator.interest_tags ?? [];
        if (!tags.some((tag) => selectedTopic.tags.some((match) => normalize(tag) === normalize(match)))) return false;
      }
      if (query) {
        const haystack = [creator.display_name, creator.bio ?? "", creator.creator_role ?? "", ...(creator.interest_tags ?? [])].join(" ");
        if (!normalize(haystack).includes(query)) return false;
      }
      return true;
    });
  }, [creators, search, npcType, topic]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function resetFilters() {
    setSearch("");
    setNpcType("all");
    setTopic("all");
  }

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
        <span className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-900">NPC</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{current ? `${current.display_name}${current.npc_category ? " · " + (TYPE_LABELS[current.npc_category] ?? current.npc_category) : ""}` : "Kein NPC zugeordnet"}</span></span></span>
        <span className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[11px] font-bold text-violet-700 shadow-sm group-hover:bg-violet-50">{current ? "Ändern" : "Zuordnen"}</span>
      </button>
    </section>

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="NPC zuordnen" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div><h2 className="text-lg font-bold text-slate-950">NPC zuordnen</h2><p className="mt-0.5 text-xs text-slate-500">Mit zwei Filtern und einer Suche schnell die passende Figur finden.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Schließen"><X className="h-5 w-5" /></button></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">NPC-Typ<select value={npcType} onChange={(event) => setNpcType(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">{NPC_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600">Thema<select value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">{TOPICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Suche konkretisieren: Name, Beschreibung, Interesse …" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></div>
          {topic === "extremism" && <p className="text-[11px] leading-4 text-amber-700">Es werden nur NPCs angezeigt, deren Interessen ausdrücklich mit Extremismus-Begriffen gekennzeichnet sind. Politische Interessen allein reichen dafür nicht aus.</p>}
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-600">{filtered.length} passende NPCs</p><button type="button" onClick={resetFilters} className="text-xs font-semibold text-violet-700 hover:underline">Filter zurücksetzen</button></div>
          <div className="max-h-[48vh] space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 p-2">
            <button type="button" onClick={() => setCreatorId("")} className={"w-full rounded-xl border px-3 py-2.5 text-left text-sm " + (!creatorId ? "border-violet-300 bg-violet-50 text-violet-800" : "border-transparent text-slate-600 hover:bg-slate-50")}>Kein NPC</button>
            {filtered.map((creator) => <button key={creator.id} type="button" onClick={() => setCreatorId(creator.id)} className={"flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left " + (creatorId === creator.id ? "border-violet-300 bg-violet-50" : "border-transparent hover:bg-slate-50")}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{creator.display_name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{creator.npc_category ? TYPE_LABELS[creator.npc_category] ?? creator.npc_category : creator.creator_role ?? "NPC"}</span>{creator.interest_tags?.length ? <span className="mt-0.5 block truncate text-[10px] text-slate-400">{creator.interest_tags.slice(0, 4).join(" · ")}</span> : null}</span>{creatorId === creator.id && <span className="text-xs font-bold text-violet-700">Ausgewählt</span>}
            </button>)}
            {filtered.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-500">Keine passenden NPCs gefunden. Passe die Filter an oder setze sie zurück.</p>}
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Abbrechen</button><button type="button" disabled={busy} onClick={save} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Speichert …" : "NPC speichern"}</button></div>
      </div>
    </div>}
  </>;
}
