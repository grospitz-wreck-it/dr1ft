import Link from "next/link";
import {
  ArrowRight,
  FileText,
  LayoutGrid,
  Route,
  Users,
} from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const statusLabel: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  live: "Live",
  rejected: "Abgelehnt",
  archived: "Archiviert",
};

const statusClass: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  in_review: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  live: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  archived: "bg-slate-100 text-slate-500",
};

export default async function EditorialDashboardPage() {
  const supabase = supabaseServerClient();

  const [contentResult, scenariosResult, missionsResult, creatorsResult, recentResult] =
    await Promise.all([
      supabase.from("content_items").select("id, status", { count: "exact", head: true }),
      supabase.from("scenarios").select("id", { count: "exact", head: true }),
      supabase.from("missions").select("id", { count: "exact", head: true }),
      supabase.from("creators").select("id", { count: "exact", head: true }),
      supabase
        .from("content_items")
        .select("id, body, type, status, created_at, scenarios(title)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const { count: contentCount } = contentResult;
  const { count: scenarioCount } = scenariosResult;
  const { count: missionCount } = missionsResult;
  const { count: creatorCount } = creatorsResult;

  const inReviewResult = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_review");

  const stats = [
    {
      label: "Content",
      value: contentCount ?? 0,
      href: "/content",
      icon: FileText,
    },
    {
      label: "Szenarien",
      value: scenarioCount ?? 0,
      href: "/scenarios",
      icon: LayoutGrid,
    },
    {
      label: "Missionen",
      value: missionCount ?? 0,
      href: "/missions",
      icon: Route,
    },
    {
      label: "Creator",
      value: creatorCount ?? 0,
      href: "/npc-dialogs",
      icon: Users,
    },
  ];

  const recent = recentResult.data ?? [];

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 md:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent mb-2">
              DR1FT · Editorial Studio
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Redaktion
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Szenarien entwickeln, Inhalte prüfen und Lernverläufe bauen.
            </p>
          </div>
          <Link
            href="/content"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Content öffnen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="group bg-panel border border-border rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                  <Icon className="w-4 h-4 text-slate-300 group-hover:text-accent" strokeWidth={1.75} />
                </div>
                <p className="text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
              </Link>
            );
          })}
        </section>

        <section className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="bg-panel border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Zuletzt bearbeitet</h2>
                <p className="text-xs text-slate-400 mt-0.5">Die neuesten Content-Elemente</p>
              </div>
              <Link href="/content" className="text-xs font-medium text-accent hover:text-accent-hover">
                Alle anzeigen →
              </Link>
            </div>

            <div className="divide-y divide-border">
              {recent.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/content?item=${item.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-canvas transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.body || "Ohne Inhalt"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.scenarios?.title ?? "Ambient"} · {item.type ?? "Content"} · {formatDate(item.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                      statusClass[item.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </Link>
              ))}

              {recent.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  Noch keine Content-Elemente vorhanden.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-panel border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Workflow</p>
                  <h2 className="text-sm font-semibold text-slate-900 mt-1">Prüfung</h2>
                </div>
                <span className="text-2xl font-semibold text-slate-900">{inReviewResult.count ?? 0}</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Content wartet aktuell auf redaktionelle Prüfung.
              </p>
              <Link
                href="/content?status=in_review"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
              >
                Prüfung öffnen <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Nächster Schritt</p>
              <h2 className="text-lg font-semibold mt-2">Szenario bauen</h2>
              <p className="text-sm text-slate-300 mt-1 leading-5">
                Ein Szenario bündelt Story, Content, Missionen und NPCs zu einem spielbaren Lernverlauf.
              </p>
              <Link
                href="/scenarios"
                className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-white hover:text-slate-200"
              >
                Szenarien öffnen <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
