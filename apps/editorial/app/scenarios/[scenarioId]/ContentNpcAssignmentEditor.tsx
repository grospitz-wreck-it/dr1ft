"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, X, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateContentItemCreator } from "../actions";

type Creator = {
  id: string;
  display_name: string;
  creator_role?: string | null;
  npc_category?: string | null;
  npc_role?: string | null;
  interest_tags?: string[] | null;
  age_bands?: string[] | null;
  bio?: string | null;
  is_active?: boolean;
};

const CATEGORIES = [
  ["all", "Alle"], ["student", "Schüler:innen"], ["brand", "Brands"], ["party", "Parteien"],
  ["club", "Vereine"], ["influencer", "Influencer"], ["institution", "Institutionen"],
  ["citizen", "Normale Leute"], ["creator", "Creator / Medien"], ["other", "Sonstige"],
] as const;

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES) as Record<string, string>;

const TOPIC_FILTERS = [
  { id: "extremism", label: "Politisch extrem", tags: ["Extremismus", "Rechtsextremismus", "Linksextremismus", "Neonazismus", "Radikalisierung", "Extremistische Ideologien", "Extremistische Narrative"] },
  { id: "politics", label: "Politik & Gesellschaft", tags: ["Politik", "Parteipolitik", "Aktivismus", "Demokratie", "Direkte Demokratie", "Bürgerrechte", "Bildungsreform", "Wirtschaftsordnung", "Öffentliche Sicherheit", "Protest", "Protestkultur", "Metapolitik", "Meinungsfreiheit", "Gesellschaft"] },
  { id: "fashion", label: "Mode & Beauty", tags: ["Mode", "Streetwear", "Streetstyle", "Beauty & Pflege", "Make-up", "Skincare", "Hautpflege", "Design", "Ästhetik", "Fashion"] },
  { id: "sports", label: "Sport", tags: ["Sport", "Fußball", "Basketball", "Handball", "Volleyball", "Fitness", "Laufen", "Radfahren", "Skateboarding", "Skaten", "Motorsport", "Klettern", "Wandern"] },
  { id: "gaming", label: "Games & Gaming", tags: ["Gaming", "Games", "E-Sport", "Fortnite", "Minecraft", "Roblox", "Indie-Games", "Game Design", "Discord", "Highscores"] },
  { id: "social", label: "Social Media", tags: ["Social Media", "Internetkultur", "Memes", "Streaming", "Videos drehen", "Podcasts", "BookTok & Lesetrends"] },
  { id: "music", label: "Musik & Kultur", tags: ["Musik", "Hip-Hop & Rap", "K-Pop", "Pop", "Rock", "Live-Musik", "Konzerte & Festivals", "Tanzen", "Theater", "Kultur", "Kunst", "Anime", "Manga", "Comics", "Cosplay"] },
  { id: "environment", label: "Umwelt & Natur", tags: ["Klima & Umwelt", "Klimaschutz", "Umwelt", "Nachhaltigkeit", "Natur", "Tiere", "Outdoor"] },
  { id: "school", label: "Schule & Alltag", tags: ["Schule", "Schulleben", "Lern- & Study-Tipps", "Freundschaft", "Jugend", "Familie", "Gemeinschaft", "Teamwork"] },
] as const;

const AGE_BANDS = [
  ["9_11", "9–11"], ["12_13", "12–13"], ["14_15", "14–15"], ["16_17", "16–17"], ["18_plus", "18+"],
] as const;

const ROLE_LABELS: Record<string, string> = {
  story: "Story-NPC",
  ambient: "Feed-NPC",
  hybrid: "Story & Feed",
};

function normalized(value: string) {
  return value.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ContentNpcAssignmentEditor({ scenarioId, contentItemId, initialCreatorId, creators = [] }: { scenarioId: string; contentItemId: string; initialCreatorId: string | null; creators?: Creator[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creatorId, setCreatorId] = useState(initialCreatorId ?? "");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [topics, setTopics] = useState<string[]>([]);
  const [ageBand, setAgeBand] = useState("all");
  const [npcRole, setNpcRole] = useState("all");
  const [busy, setBusy] = useState(false);
  const current = creators.find((creator) => creator.id === initialCreatorId) ?? null;

  const filtered = useMemo(() => {
    const query = normalized(search.trim());
    return creators.filter((creator) => {
      if (creator.is_active === false) return false;
      if (category !== "all" && creator.npc_category !== category) return false;
      if (ageBand !== "all" && !(creator.age_bands ?? []).includes(ageBand)) return false;
      if (npcRole !== "all" && creator.npc_role !== npcRole) return false;
      const tags = creator.interest_tags ?? [];
      if (topics.length && !topics.some((topicId) => {
        const topic = TOPIC_FILTERS.find((item) => item.id === topicId);
        return Boolean(topic && tags.some((tag) => topic.tags.some((match) => normalized(tag) === normalized(match))));
      })) return false;
      if (query) {
        const haystack = [creator.display_name, creator.bio ?? "", creator.creator_role ?? "", creator.npc_role ?? "", ...tags].join(" ");
        if (!normalized(haystack).includes(query)) return false;
      }
      return true;
    });
  }, [creators, search, category, topics, ageBand, npcRole]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function toggleTopic(topicId: string) {
    setTopics((current) => current.includes(topicId) ? current.filter((item) => item !== topicId) : [...current, topicId]);
  }

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setTopics([]);
    setAgeBand("all");
    setNpcRole("all");
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
        <span className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-900">NPC</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{current ? `${current.display_name}${current.npc_category ? " · " + (CATEGORY_LABELS[current.npc_category] ?? current.npc_category) : ""}` : "Kein NPC zugeordnet"}</span></span></span>
        <span className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[11px] font-bold text-violet-700 shadow-sm group-hover:bg-violet-50">{current ? "Ändern" : "Zuordnen"}</span>
      </button>
    </section>

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="NPC zuordnen" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div><h2 className="text-lg font-bold text-slate-950">NPC zuordnen</h2><p className="mt-0.5 text-xs text-slate-500">Finde passende Figuren über Suche, Themen und Zielgruppen.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Schließen"><X className="h-5 w-5" /></button></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, Beschreibung oder Interesse suchen …" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></div>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><SlidersHorizontal className="h-3.5 w-3.5" /> NPC-Typ</div>
            <div className="flex flex-wrap gap-1.5">{CATEGORIES.map(([value, label]) => <button key={value} type="button" onClick={() => setCategory(value)} className={"rounded-full px-3 py-1.5 text-[11px] font-semibold transition " + (category === value ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-50")}>{label}</button>)}</div>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Themen & Interessen <span className="font-normal normal-case tracking-normal">· mehrere auswählbar</span></div>
            <div className="flex flex-wrap gap-1.5">{TOPIC_FILTERS.map((topic) => <button key={topic.id} type="button" aria-pressed={topics.includes(topic.id)} onClick={() => toggleTopic(topic.id)} className={"rounded-full border px-3 py-1.5 text-[11px] font-semibold transition " + (topics.includes(topic.id) ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50")}>{topic.label}</button>)}</div>
            {topics.includes("extremism") && <p className="text-[11px] leading-4 text-amber-700">Dieser Filter zeigt nur NPCs mit ausdrücklich gepflegten Extremismus-Tags. Politische oder kontroverse Interessen allein werden nicht als extremistisch eingestuft.</p>}
          </section>

          <section className="flex flex-wrap items-end gap-3">
            <label className="min-w-[150px] flex-1 text-[11px] font-semibold text-slate-500">Geeignet für Altersgruppe<select value={ageBand} onChange={(event) => setAgeBand(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"><option value="all">Alle Altersgruppen</option>{AGE_BANDS.map(([value, label]) => <option key={value} value={value}>{label} Jahre</option>)}</select></label>
            <label className="min-w-[150px] flex-1 text-[11px] font-semibold text-slate-500">Einsatzbereich<select value={npcRole} onChange={(event) => setNpcRole(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"><option value="all">Alle Einsatzbereiche</option><option value="story">Story-NPC</option><option value="ambient">Feed-NPC</option><option value="hybrid">Story & Feed</option></select></label>
            <button type="button" onClick={resetFilters} className="rounded-xl px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50">Filter zurücksetzen</button>
          </section>

          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-600">{filtered.length} passende NPCs</p><p className="text-[10px] text-slate-400">Themenfilter werden miteinander kombiniert (ODER).</p></div>
          <div className="max-h-[34vh] space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 p-2">
            <button type="button" onClick={() => setCreatorId("")} className={"w-full rounded-xl border px-3 py-2.5 text-left text-sm " + (!creatorId ? "border-violet-300 bg-violet-50 text-violet-800" : "border-transparent text-slate-600 hover:bg-slate-50")}>Kein NPC</button>
            {filtered.map((creator) => <button key={creator.id} type="button" onClick={() => setCreatorId(creator.id)} className={"flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left " + (creatorId === creator.id ? "border-violet-300 bg-violet-50" : "border-transparent hover:bg-slate-50")}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{creator.display_name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{creator.npc_category ? CATEGORY_LABELS[creator.npc_category] ?? creator.npc_category : "NPC"}{creator.npc_role ? " · " + (ROLE_LABELS[creator.npc_role] ?? creator.npc_role) : ""}{creator.age_bands?.length ? " · " + creator.age_bands.map((band) => AGE_BANDS.find(([value]) => value === band)?.[1] ?? band).join(", ") : ""}</span>{creator.interest_tags?.length ? <span className="mt-1 block text-[10px] leading-4 text-slate-400">{creator.interest_tags.slice(0, 5).join(" · ")}{creator.interest_tags.length > 5 ? " …" : ""}</span> : null}</span>{creatorId === creator.id && <span className="shrink-0 text-xs font-bold text-violet-700">Ausgewählt</span>}
            </button>)}
            {filtered.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-500">Keine passenden NPCs gefunden. Passe die Filter an oder setze sie zurück.</p>}
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Abbrechen</button><button type="button" disabled={busy} onClick={save} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Speichert …" : "NPC speichern"}</button></div>
      </div>
    </div>}
  </>;
}
