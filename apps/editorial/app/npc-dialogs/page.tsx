import {
  Bot,
  MessageCircle,
  Plus,
  Users,
  Link2,
  WandSparkles,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { createNpcProfile, generateNpcProfiles } from "./actions";
import { AiGenerationButton } from "../components/AiGenerationButton";

const CATEGORIES = [
  ["student", "Schüler:innen"],
  ["club", "Vereine / Gruppen"],
  ["party", "Politik / Parteien"],
  ["brand", "Brands / Unternehmen"],
  ["citizen", "Normale Leute"],
  ["influencer", "Influencer"],
  ["institution", "Institutionen"],
  ["creator", "Creator / Medien"],
  ["other", "Sonstige"],
] as const;

const AGE_BANDS = [
  ["9_11", "9–11"],
  ["12_13", "12–13"],
  ["14_15", "14–15"],
  ["16_17", "16–17"],
  ["18_plus", "18+"],
] as const;

const ROLE_LABELS: Record<string, string> = {
  ambient: "Füllmaterial",
  story: "Story-NPC",
  hybrid: "Hybrid",
};

const PAGE_SIZE = 40;

function categoryLabel(value: string) {
  return CATEGORIES.find(([key]) => key === value)?.[1] ?? value;
}

function ageLabel(value: string) {
  return AGE_BANDS.find(([key]) => key === value)?.[1] ?? value;
}

function cleanSearch(value: string) {
  return value.replace(/[%,()]/g, "").trim().slice(0, 80);
}

function queryString(params: Record<string, string | number | undefined>) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") next.set(key, String(value));
  });
  return next.toString();
}

export default async function NpcDialogsOverviewPage({
  searchParams = {},
}: {
  searchParams?: {
    error?: string;
    generated?: string;
    q?: string;
    category?: string;
    role?: string;
    age?: string;
    interest?: string;
    story?: string;
    dialogs?: string;
    status?: string;
    sort?: string;
    page?: string;
  };
}) {
  const supabase = supabaseServerClient();

  const q = cleanSearch(String(searchParams.q ?? ""));
  const category = CATEGORIES.some(([value]) => value === searchParams.category)
    ? String(searchParams.category)
    : "";
  const role = ["ambient", "story", "hybrid"].includes(String(searchParams.role ?? ""))
    ? String(searchParams.role)
    : "";
  const age = AGE_BANDS.some(([value]) => value === searchParams.age)
    ? String(searchParams.age)
    : "";
  const interest = cleanSearch(String(searchParams.interest ?? ""));
  const storyFilter = ["with", "without"].includes(String(searchParams.story ?? ""))
    ? String(searchParams.story)
    : "";
  const dialogFilter = ["with", "without"].includes(String(searchParams.dialogs ?? ""))
    ? String(searchParams.dialogs)
    : "";
  const status = ["active", "inactive"].includes(String(searchParams.status ?? ""))
    ? String(searchParams.status)
    : "";
  const sort = ["name", "newest", "oldest"].includes(String(searchParams.sort ?? ""))
    ? String(searchParams.sort)
    : "newest";
  const requestedPage = Math.max(1, Number.parseInt(String(searchParams.page ?? "1"), 10) || 1);

  const [
    { data: storyLinksForFilter },
    { data: dialogsForFilter },
    { data: interestRows },
    { count: storyCount },
    { count: totalDialogCount },
  ] = await Promise.all([
    storyFilter
      ? supabase.from("npc_story_links").select("creator_id")
      : Promise.resolve({ data: null }),
    dialogFilter
      ? supabase.from("npc_dialogs").select("creator_id")
      : Promise.resolve({ data: null }),
    supabase.from("creators").select("interest_tags").eq("kind", "npc").limit(1000),
    supabase.from("npc_story_links").select("id", { count: "exact", head: true }),
    supabase.from("npc_dialogs").select("id", { count: "exact", head: true }),
  ]);

  const storyIds = (storyLinksForFilter ?? []).map((row: any) => row.creator_id).filter((id: any, index: number, all: any[]) => all.indexOf(id) === index);
  const dialogIds = (dialogsForFilter ?? []).map((row: any) => row.creator_id).filter((id: any, index: number, all: any[]) => all.indexOf(id) === index);

  const emptyFilter =
    (storyFilter === "with" && storyIds.length === 0) ||
    (dialogFilter === "with" && dialogIds.length === 0);

  let creators: any[] = [];
  let total = 0;

  if (!emptyFilter) {
    let creatorsQuery = supabase
      .from("creators")
      .select(
        "id, display_name, handle, bio, persona, npc_category, npc_role, interest_tags, age_bands, story_role, is_active, created_at",
        { count: "exact" },
      )
      .eq("kind", "npc");

    if (q) {
      creatorsQuery = creatorsQuery.or(
        `display_name.ilike.%${q}%,handle.ilike.%${q}%,bio.ilike.%${q}%,story_role.ilike.%${q}%`,
      );
    }
    if (category) creatorsQuery = creatorsQuery.eq("npc_category", category);
    if (role) creatorsQuery = creatorsQuery.eq("npc_role", role);
    if (age) creatorsQuery = creatorsQuery.overlaps("age_bands", [age]);
    if (interest) creatorsQuery = creatorsQuery.contains("interest_tags", [interest]);
    if (status === "active") creatorsQuery = creatorsQuery.eq("is_active", true);
    if (status === "inactive") creatorsQuery = creatorsQuery.eq("is_active", false);

    if (storyFilter === "with") {
      creatorsQuery = creatorsQuery.in("id", storyIds);
    } else if (storyFilter === "without" && storyIds.length > 0) {
      creatorsQuery = creatorsQuery.not("id", "in", `(${storyIds.join(",")})`);
    }

    if (dialogFilter === "with") {
      creatorsQuery = creatorsQuery.in("id", dialogIds);
    } else if (dialogFilter === "without" && dialogIds.length > 0) {
      creatorsQuery = creatorsQuery.not("id", "in", `(${dialogIds.join(",")})`);
    }

    if (sort === "name") {
      creatorsQuery = creatorsQuery.order("display_name", { ascending: true });
    } else if (sort === "oldest") {
      creatorsQuery = creatorsQuery.order("created_at", { ascending: true });
    } else {
      creatorsQuery = creatorsQuery.order("created_at", { ascending: false });
    }

    const safePage = requestedPage;
    const from = (safePage - 1) * PAGE_SIZE;
    const { data, count } = await creatorsQuery.range(from, from + PAGE_SIZE - 1);
    creators = data ?? [];
    total = count ?? 0;
  }

  const currentPage = total === 0 ? 1 : Math.min(requestedPage, Math.ceil(total / PAGE_SIZE));
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const creatorIds = creators.map((npc) => npc.id);

  const [{ data: links }, { data: dialogs }] = creatorIds.length
    ? await Promise.all([
        supabase.from("npc_story_links").select("id, creator_id, scenario_id, age_band, role_label, story_arc_id").in("creator_id", creatorIds),
        supabase.from("npc_dialogs").select("id, creator_id, title, age_band, scenario_id, status").in("creator_id", creatorIds),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }];

  const linkCount = new Map<string, number>();
  (links ?? []).forEach((row: any) => linkCount.set(row.creator_id, (linkCount.get(row.creator_id) ?? 0) + 1));

  const dialogCount = new Map<string, number>();
  (dialogs ?? []).forEach((row: any) => dialogCount.set(row.creator_id, (dialogCount.get(row.creator_id) ?? 0) + 1));

  const interestOptions = [...new Set(
    (interestRows ?? [])
      .flatMap((row: any) => Array.isArray(row.interest_tags) ? row.interest_tags : [])
      .map(String)
      .filter(Boolean),
  )]
    .sort((a, b) => a.localeCompare(b, "de"))
    .slice(0, 40);

  const filterParams = {
    q,
    category,
    role,
    age,
    interest,
    story: storyFilter,
    dialogs: dialogFilter,
    status,
    sort,
  };

  const pageHref = (page: number) =>
    `/npc-dialogs?${queryString({ ...filterParams, page })}`;

  const activeFilterCount = [category, role, age, interest, storyFilter, dialogFilter, status]
    .filter(Boolean).length + (q ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest mb-2">
              <Users className="w-4 h-4" /> Figurenwelt
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">NPCs & Dialoge</h1>
            <p className="text-slate-500 mt-2 max-w-3xl">
              Wiederverwendbare Figuren mit stabiler Identität, Interessen, Persona und Story-Einsatz.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <strong className="text-slate-800">{total}</strong> Treffer
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <strong className="text-slate-800">{storyCount ?? 0}</strong> Story-Verknüpfungen
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <strong className="text-slate-800">{totalDialogCount ?? 0}</strong> Dialoge
            </span>
          </div>
        </header>

        {searchParams.generated && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ {searchParams.generated} NPCs wurden erstellt und in der Bibliothek gespeichert.
          </div>
        )}

        {searchParams.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {searchParams.error}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <WandSparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">NPC-Grundrauschen erzeugen</h2>
              <p className="text-sm text-slate-500 mt-1">
                Erzeuge stapelweise Figuren. Die KI erstellt das Autorenprofil; Persona und Stil werden dauerhaft gespeichert.
              </p>
            </div>
          </div>

          <form action={generateNpcProfiles} className="p-6 grid lg:grid-cols-[1fr_1fr] gap-6">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-[1fr_120px] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">RUBRIK</label>
                  <select name="category" defaultValue="citizen" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">ANZAHL</label>
                  <select name="amount" defaultValue="6" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    {[3, 6, 9, 12].map((n) => <option key={n} value={n}>{n} NPCs</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">OPTIONALER BRIEF</label>
                <textarea
                  name="brief"
                  rows={3}
                  placeholder="z. B. gemischte Schulklasse, Fußballfans, lokale Nachbarschaft, unterschiedliche Mediennutzung …"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-y outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600">ALTERSBÄNDER</label>
                  <span className="text-[11px] text-slate-400">Einsatzbereiche</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AGE_BANDS.map(([value, label]) => (
                    <label key={value} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" name="ageBands" value={value} defaultChecked />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-800">Gespeichert wird</div>
                <div>• kurze Bio und Interessen</div>
                <div>• Sprachstil, typische Muster und Eigenheiten</div>
                <div>• wiederkehrende Details für stabile KI-Prompts</div>
                <div>• Altersbereiche und mögliche Story-Rolle</div>
              </div>

              <AiGenerationButton
                idleLabel="NPCs generieren"
                pendingLabel="NPCs werden generiert …"
                pendingSteps={[
                  "Gemini wird angefragt …",
                  "KI erstellt die NPC-Profile …",
                  "Antwort wird geprüft …",
                  "NPC-Profile werden gespeichert …",
                ]}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
              />
            </div>
          </form>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div>
                  <h2 className="font-semibold text-slate-900">NPC-Bibliothek</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Suchen, filtern und gezielt Figuren für Storys auswählen.</p>
                </div>
              </div>

              <form method="get" className="flex-1 xl:max-w-3xl xl:ml-auto">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      name="q"
                      defaultValue={q}
                      placeholder="Name, Handle, Bio oder Story-Rolle suchen …"
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium">
                    <Search className="w-4 h-4" /> Suchen
                  </button>
                </div>
              </form>

              <details className="relative">
                <summary className="list-none cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-accent text-white text-[10px] min-w-5 h-5 px-1 flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </summary>

                <form method="get" className="absolute right-0 z-20 mt-2 w-[min(92vw,620px)] bg-white border border-slate-200 rounded-2xl shadow-xl p-4">
                  <input type="hidden" name="q" value={q} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className="text-xs text-slate-500">
                      Kategorie
                      <select name="category" defaultValue={category} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="">Alle</option>
                        {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Rolle
                      <select name="role" defaultValue={role} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="">Alle</option>
                        <option value="ambient">Füllmaterial</option>
                        <option value="story">Story-NPC</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Altersband
                      <select name="age" defaultValue={age} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="">Alle</option>
                        {AGE_BANDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Interesse
                      <select name="interest" defaultValue={interest} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="">Alle</option>
                        {interestOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Story
                      <select name="story" defaultValue={storyFilter} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="">Egal</option>
                        <option value="with">Mit Story-Verknüpfung</option>
                        <option value="without">Ohne Story-Verknüpfung</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Dialoge
                      <select name="dialogs" defaultValue={dialogFilter} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="">Egal</option>
                        <option value="with">Mit Dialog</option>
                        <option value="without">Ohne Dialog</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Status
                      <select name="status" defaultValue={status} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="">Alle</option>
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Sortierung
                      <select name="sort" defaultValue={sort} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800">
                        <option value="newest">Neueste zuerst</option>
                        <option value="oldest">Älteste zuerst</option>
                        <option value="name">Name A–Z</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <a href="/npc-dialogs" className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
                      <X className="w-3 h-3" /> Filter zurücksetzen
                    </a>
                    <button className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium">Filter anwenden</button>
                  </div>
                </form>
              </details>

              <details className="relative">
                <summary className="list-none cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Plus className="w-4 h-4" /> Manuell
                </summary>
                <form action={createNpcProfile} className="absolute right-0 z-20 mt-2 w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input name="displayName" required placeholder="Name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input name="handle" placeholder="@handle" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <select name="category" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" defaultValue="citizen">
                    {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <textarea name="bio" placeholder="Kurze Bio" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="interests" placeholder="Interessen, kommasepariert" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="styleNotes" placeholder="Sprachstil / Eigenheiten" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <button className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm">NPC anlegen</button>
                </form>
              </details>
            </div>
          </div>

          {interestOptions.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mr-1">Interessen</span>
              {interestOptions.slice(0, 14).map((value) => {
                const active = interest === value;
                return (
                  <a
                    key={value}
                    href={`/npc-dialogs?${queryString({ ...filterParams, interest: active ? undefined : value, page: 1 })}`}
                    className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${active ? "border-accent bg-accent text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-accent hover:text-accent"}`}
                  >
                    {value}
                  </a>
                );
              })}
            </div>
          )}

          <div className="hidden lg:grid grid-cols-[minmax(230px,1.6fr)_150px_minmax(220px,1.5fr)_150px_90px] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Figur</span>
            <span>Kategorie</span>
            <span>Interessen</span>
            <span>Einsatz</span>
            <span className="text-right">Nutzung</span>
          </div>

          <div className="divide-y divide-slate-100">
            {creators.map((npc: any) => {
              const interests = Array.isArray(npc.interest_tags) ? npc.interest_tags : [];
              const ages = Array.isArray(npc.age_bands) ? npc.age_bands : [];
              const isActive = npc.is_active !== false;
              return (
                <a
                  key={npc.id}
                  href={`/npc-dialogs/${npc.id}`}
                  className="grid lg:grid-cols-[minmax(230px,1.6fr)_150px_minmax(220px,1.5fr)_150px_90px] gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <Bot className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-sm text-slate-900 truncate">{npc.display_name}</span>
                      <span className="text-xs text-slate-400 truncate">{npc.handle}</span>
                    </div>
                    {npc.bio && <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">{npc.bio}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ages.slice(0, 5).map((band: string) => (
                        <span key={band} className="text-[10px] rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500">{ageLabel(band)}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start lg:pt-0.5">
                    <span className="text-xs rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 h-fit">{categoryLabel(npc.npc_category)}</span>
                  </div>

                  <div className="flex flex-wrap content-start gap-1.5">
                    {interests.slice(0, 8).map((tag: string) => (
                      <span key={tag} className={`text-[10px] rounded-full border px-2 py-1 ${interest === tag ? "border-accent bg-accent/5 text-accent" : "border-slate-200 bg-white text-slate-500"}`}>{tag}</span>
                    ))}
                    {interests.length > 8 && <span className="text-[10px] text-slate-400 py-1">+{interests.length - 8}</span>}
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-slate-700">{ROLE_LABELS[npc.npc_role] ?? npc.npc_role}</span>
                    {npc.story_role && <span className="text-[11px] text-slate-400 line-clamp-2">{npc.story_role}</span>}
                  </div>

                  <div className="flex lg:justify-end items-start gap-3 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1" title="Story-Verknüpfungen"><Link2 className="w-3 h-3" />{linkCount.get(npc.id) ?? 0}</span>
                    <span className="inline-flex items-center gap-1" title="Dialoge"><MessageCircle className="w-3 h-3" />{dialogCount.get(npc.id) ?? 0}</span>
                  </div>
                </a>
              );
            })}
          </div>

          {!creators.length && (
            <div className="text-center py-14 text-sm text-slate-500">
              <Bot className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-medium text-slate-700 mt-3">{activeFilterCount ? "Keine NPCs für diese Filter." : "Noch keine NPCs."}</p>
              <p className="text-xs mt-1">{activeFilterCount ? "Filter zurücksetzen oder Suche ändern." : "Erzeuge zuerst ein Grundrauschen."}</p>
            </div>
          )}

          {total > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Seite {currentPage} von {pageCount} · {total} NPCs</span>
              <div className="flex items-center gap-1">
                {currentPage > 1 ? (
                  <a href={pageHref(currentPage - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                    <ChevronLeft className="w-3.5 h-3.5" /> Zurück
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 px-2.5 py-1.5 text-slate-300"><ChevronLeft className="w-3.5 h-3.5" /> Zurück</span>
                )}
                {currentPage < pageCount ? (
                  <a href={pageHref(currentPage + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                    Weiter <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 px-2.5 py-1.5 text-slate-300">Weiter <ChevronRight className="w-3.5 h-3.5" /></span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
