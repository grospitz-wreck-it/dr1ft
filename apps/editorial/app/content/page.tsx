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
    media?: string;
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
  if (searchParams.media === "image") {
    query = query.not("media_url", "is", null);
  } else if (searchParams.media === "text") {
    query = query.is("media_url", null);
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
    <div className="min-w-0">
      <div className="min-w-0 flex-1">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">Content-Verwaltung</div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">Content-Bibliothek</h1>
            <p className="mt-2 text-sm text-slate-500">Inhalte durchsuchen, prüfen und ihren Freigabestatus verwalten.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 sm:self-auto"><span className="text-2xl font-bold tracking-tight text-slate-950">{count ?? 0}</span><span className="text-xs font-medium text-slate-500">Einträge<br />gefunden</span></div>
        </header>

        {/* Filterleiste — natives GET-Formular, kein Client-JS nötig */}
        <form
          method="GET"
          action="/content"
          className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_18px_rgba(15,23,42,0.025)] sm:p-5"
        >
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Volltextsuche…"
            className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
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
          <select name="media" defaultValue={searchParams.media ?? ""} className="border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="">Alle Medien</option>
            <option value="image">Mit Bild</option>
            <option value="text">Nur Text</option>
          </select>
          <input
            type="text"
            name="technique"
            defaultValue={searchParams.technique}
            placeholder="Technik-Tag…"
            className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover">
            Filtern
          </button>
          {(searchParams.q || searchParams.status || searchParams.type || searchParams.scenario || searchParams.technique || searchParams.media) && (
            <a href="/content" className="text-xs2 text-slate-400 hover:text-slate-600">
              Zurücksetzen
            </a>
          )}
        </form>

        <ContentTable rows={rows ?? []} searchParams={searchParams} />

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            {count ? from + 1 : 0}–{Math.min(to + 1, count ?? 0)} von {count ?? 0}
          </span>
          <div className="flex gap-2">
            <a
              href={page > 1 ? hrefWith({ page: String(page - 1) }) : undefined}
              aria-disabled={page <= 1}
              className={`rounded-lg border border-slate-200 bg-white px-3 py-2 transition ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
            >
              Zurück
            </a>
            <span className="px-2 py-1">{page} / {totalPages}</span>
            <a
              href={page < totalPages ? hrefWith({ page: String(page + 1) }) : undefined}
              aria-disabled={page >= totalPages}
              className={`rounded-lg border border-slate-200 bg-white px-3 py-2 transition ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
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
