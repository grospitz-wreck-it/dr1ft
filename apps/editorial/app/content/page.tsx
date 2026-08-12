// apps/admin/app/content/page.tsx
//
// Ersetzt das bisherige Muster "pro Szenario eine eigene Seite" für den
// Überblick — bei 1000+ Content-Items muss man über ALLE Szenarien
// hinweg suchen/filtern können, nicht immer erst ein Szenario auswählen.
//
// Bewusste Entscheidung: Filter/Suche/Pagination laufen komplett über
// URL-Suchparameter und ein natives <form method="GET">. Kein Client-JS
// nötig für die Filterung selbst — schnell, funktioniert mit
// Browser-Zurück, Links sind kopier-/teilbar (z.B. "alle in_review
// Posts im Szenario X" als Link an eine Kollegin schicken).

import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { ContentTable } from "./ContentTable";
import { ContentDetailDrawer } from "./ContentDetailDrawer";

const PAGE_SIZE = 30;

const STATUS_OPTIONS = ["draft", "in_review", "approved", "live", "rejected", "archived"];
const TYPE_OPTIONS = ["post", "comment", "dm_message", "mission", "minigame", "reflection_prompt"];

interface Props {
  searchParams: {
    q?: string;
    status?: string;
    type?: string;
    scenario?: string; // scenario id, oder "ambient" für scenario_id IS NULL
    technique?: string;
    page?: string;
    item?: string; // öffnet den Detail-Drawer für diese ID
  };
}

export default async function ContentLibraryPage({ searchParams }: Props) {
  const supabase = supabaseServerClient();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("content_items")
    .select("*, scenarios(title), creators(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.q) {
    query = query.ilike("body", `%${searchParams.q}%`);
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }
  if (searchParams.type) {
    query = query.eq("type", searchParams.type);
  }
  if (searchParams.scenario === "ambient") {
    query = query.is("scenario_id", null);
  } else if (searchParams.scenario) {
    query = query.eq("scenario_id", searchParams.scenario);
  }
  if (searchParams.technique) {
    query = query.contains("manipulation_techniques", [searchParams.technique]);
  }

  const { data: rows, count } = await query;

  const { data: scenarios } = await supabase.from("scenarios").select("id, title").order("title");
  const { data: competencies } = await supabase.from("competencies").select("id, title");

  let detailItem = null;
  if (searchParams.item) {
    const { data } = await supabase
      .from("content_items")
      .select("*, scenarios(title), creators(display_name)")
      .eq("id", searchParams.item)
      .single();
    detailItem = data;
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Baut eine neue Query-String-URL, während bestehende Filter erhalten
  // bleiben — genutzt für Pagination-Links und Filter-Pills.
  function hrefWith(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged = { ...searchParams, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/content?${params.toString()}`;
  }

  return (
    <div className="flex">
      <div className="flex-1 min-w-0 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-slate-900">
            Content-Bibliothek
            <span className="text-slate-400 font-normal ml-2 text-sm">
              {count ?? 0} Einträge
            </span>
          </h1>
        </div>

        {/* Filterleiste — natives GET-Formular, kein Client-JS nötig */}
        <form
          method="GET"
          action="/content"
          className="flex flex-wrap items-center gap-2 mb-4 bg-panel border border-border rounded-lg p-3"
        >
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Volltextsuche…"
            className="border border-border rounded-md px-3 py-1.5 text-sm flex-1 min-w-[180px]"
          />
          <select name="status" defaultValue={searchParams.status ?? ""} className="border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="">Alle Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="type" defaultValue={searchParams.type ?? ""} className="border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="">Alle Typen</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="scenario" defaultValue={searchParams.scenario ?? ""} className="border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="">Alle Szenarien</option>
            <option value="ambient">Ambient (kein Szenario)</option>
            {scenarios?.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <input
            type="text"
            name="technique"
            defaultValue={searchParams.technique}
            placeholder="Technik-Tag…"
            className="border border-border rounded-md px-3 py-1.5 text-sm w-40"
          />
          <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-1.5 rounded-md">
            Filtern
          </button>
          {(searchParams.q || searchParams.status || searchParams.type || searchParams.scenario || searchParams.technique) && (
            <a href="/content" className="text-xs2 text-slate-400 hover:text-slate-600">
              Zurücksetzen
            </a>
          )}
        </form>

        <ContentTable rows={rows ?? []} hrefWith={hrefWith} />

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>
            {count ? from + 1 : 0}–{Math.min(to + 1, count ?? 0)} von {count ?? 0}
          </span>
          <div className="flex gap-2">
            <a
              href={page > 1 ? hrefWith({ page: String(page - 1) }) : undefined}
              aria-disabled={page <= 1}
              className={`px-3 py-1 rounded-md border border-border ${page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-panel"}`}
            >
              Zurück
            </a>
            <span className="px-2 py-1">{page} / {totalPages}</span>
            <a
              href={page < totalPages ? hrefWith({ page: String(page + 1) }) : undefined}
              aria-disabled={page >= totalPages}
              className={`px-3 py-1 rounded-md border border-border ${page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-panel"}`}
            >
              Weiter
            </a>
          </div>
        </div>
      </div>

      <ContentDetailDrawer item={detailItem} competencies={competencies ?? []} />
    </div>
  );
}
