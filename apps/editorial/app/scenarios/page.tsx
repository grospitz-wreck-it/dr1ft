import { BookOpen, ChevronRight, FilePlus2, Sparkles, Users, Route, Clock3 } from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { createScenario, generateScenarioDraft } from "./actions";

const AGE_BANDS = [
  ["12_13", "12–13", "Frühe Teenager"],
  ["14_15", "14–15", "Mittlere Teenager"],
  ["16_17", "16–17", "Ältere Jugendliche"],
  ["18_plus", "18+", "Erwachsene / ältere Lernende"],
] as const;

const STATUS: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  live: "Aktiv",
  rejected: "Überarbeiten",
  archived: "Archiv",
};

function groupKey(scenario: any) {
  return scenario.scenario_group || scenario.slug || scenario.id;
}

export default async function ScenariosPage({
  searchParams = {},
}: {
  searchParams?: { group?: string; generationError?: string };
}) {
  const supabase = supabaseServerClient();

  const [{ data: scenarios }, { data: missions }, { data: contentItems }] = await Promise.all([
    supabase.from("scenarios").select("*").order("created_at", { ascending: false }),
    supabase.from("missions").select("id, scenario_id, status"),
    supabase.from("content_items").select("id, scenario_id"),
  ]);

  const rows = scenarios ?? [];
  const grouped = new Map<string, any[]>();

  for (const scenario of rows) {
    const key = groupKey(scenario);
    const list = grouped.get(key) ?? [];
    list.push(scenario);
    grouped.set(key, list);
  }

  const families = Array.from(grouped.entries()).map(([key, variants]) => {
    const first = variants[0];
    const familyMissions = (missions ?? []).filter((mission) =>
      variants.some((variant) => variant.id === mission.scenario_id)
    );
    const familyContent = (contentItems ?? []).filter((item) =>
      variants.some((variant) => variant.id === item.scenario_id)
    );
    return {
      key,
      title: first.title?.replace(/\s*[–-]\s*(12–13|14–15|16–17|18\+).*$/i, "") || first.title,
      description: first.description?.split("\n\nLernziele")[0] || "",
      variants,
      missionCount: familyMissions.length,
      contentCount: familyContent.length,
    };
  });

  const selectedFamily = searchParams.group
    ? families.find((family) => family.key === searchParams.group)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-7">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest mb-2">
              <BookOpen className="w-4 h-4" /> Lernfälle
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Szenarien</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Ein Thema, mehrere Altersvarianten. Die redaktionelle Oberfläche führt dich vom
              Lernziel über den Ablauf bis zu Missionen und Inhalten.
            </p>
          </div>
          <a
            href="#scenario-studio"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            <Sparkles className="w-4 h-4" /> Mit KI entwerfen
          </a>
        </header>

        <section id="scenario-studio" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Neues Szenario als KI-Entwurf</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Fülle nur den groben Brief aus. DR1FT erstellt daraus Altersvarianten,
                  einen Ablauf und erste Missionen. Alles bleibt zunächst Entwurf.
                </p>
              </div>
            </div>
          </div>

          <form action={generateScenarioDraft} className="p-6 grid lg:grid-cols-[1.15fr_.85fr] gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">THEMA</label>
                <input
                  name="topic"
                  required
                  placeholder="z. B. Fake News erkennen"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">DEIN KURZER BRIEF</label>
                <textarea
                  name="brief"
                  rows={6}
                  placeholder="Was soll passieren? Was sollen Jugendliche lernen? Gibt es einen bestimmten Alltagsschauplatz, eine Plattform oder Vorgabe?"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent resize-y"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Stichpunkte reichen. Die KI formuliert daraus den redaktionellen Entwurf.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">BESONDERE VORGABEN</label>
                <textarea
                  name="constraints"
                  rows={3}
                  placeholder="Optional: keine realen Personen, Schulchat statt TikTok, eher sachlich …"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent resize-y"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">ALTERSVARIANTEN</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {AGE_BANDS.map(([value, label, hint]) => (
                    <label key={value} className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" name="ageBands" value={value} defaultChecked={value !== "18_plus"} className="mt-1" />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">{label}</span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">UMFANG</label>
                  <select name="duration" defaultValue="standard" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="short">Kurz · 5–10 Min.</option>
                    <option value="standard">Standard · 15–20 Min.</option>
                    <option value="intensive">Intensiv · 25–35 Min.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">TON</label>
                  <select name="tone" defaultValue="realistic" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="realistic">realistisch</option>
                    <option value="neutral">sachlich</option>
                    <option value="emotional">emotional</option>
                    <option value="light">locker / leicht</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-800">Die KI erstellt</div>
                <div className="flex items-center gap-2"><FilePlus2 className="w-3.5 h-3.5" /> eine Variante je Altersgruppe</div>
                <div className="flex items-center gap-2"><Route className="w-3.5 h-3.5" /> einen ersten Ablauf</div>
                <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> 2–4 konkrete Missionen</div>
                <div className="flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" /> alles als Entwurf</div>
              </div>

              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
                <Sparkles className="w-4 h-4" /> Szenario-Draft erstellen
              </button>
            </div>
          </form>
        </section>

        {searchParams.generationError && (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-700">KI-Entwurf fehlgeschlagen</div>
            <div className="mt-1 text-sm text-red-800 break-words">{searchParams.generationError}</div>
          </section>
        )}

        {selectedFamily && (
          <section className="rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">Neu erstellt</div>
            <div className="mt-1 text-sm text-slate-700">
              <strong>{selectedFamily.title}</strong> wurde als Szenario-Familie angelegt.
              Öffne eine Altersvariante, um Ablauf und Missionen zu bearbeiten.
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-slate-900">Deine Szenarien</h2>
              <p className="text-xs text-slate-500 mt-1">{families.length} Themen · {rows.length} Altersvarianten</p>
            </div>
          </div>

          <div className="space-y-3">
            {families.map((family) => (
              <article key={family.key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{family.title}</h3>
                    {family.description && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{family.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{family.variants.length} Altersvarianten</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{family.missionCount} Missionen</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{family.contentCount} Inhalte</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {family.variants.map((variant) => (
                      <a
                        key={variant.id}
                        href={`/scenarios/${variant.id}`}
                        className="group rounded-xl border border-slate-200 px-3 py-2 hover:border-accent hover:bg-accent/5 min-w-[115px]"
                      >
                        <div className="text-xs font-semibold text-slate-800">{AGE_BANDS.find(([value]) => value === variant.age_band)?.[1] ?? variant.age_rating}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{STATUS[variant.status ?? "draft"] ?? "Entwurf"}</div>
                        <div className="text-xs text-accent mt-1 flex items-center gap-1">Bearbeiten <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" /></div>
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}

            {families.length === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
                <BookOpen className="w-7 h-7 mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-700 mt-3">Noch kein Szenario vorhanden</p>
                <p className="text-xs text-slate-500 mt-1">Starte oben mit einem kurzen Brief.</p>
              </div>
            )}
          </div>
        </section>

        <details className="bg-white border border-slate-200 rounded-2xl">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-slate-700">
            Szenario ohne KI manuell anlegen
          </summary>
          <form action={createScenario} className="px-5 pb-5 pt-1 grid md:grid-cols-3 gap-3">
            <input name="title" placeholder="Titel" required className="border border-slate-200 rounded-xl px-3 py-2 text-sm md:col-span-2" />
            <select name="ageRating" defaultValue="12_plus" className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <option value="all_ages">Alle Altersgruppen</option>
              <option value="12_plus">12+</option>
              <option value="16_plus">16+</option>
            </select>
            <textarea name="description" placeholder="Kurzbeschreibung" className="border border-slate-200 rounded-xl px-3 py-2 text-sm md:col-span-3" />
            <button type="submit" className="md:col-span-3 bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-medium">Anlegen</button>
          </form>
        </details>
      </div>
    </div>
  );
}
