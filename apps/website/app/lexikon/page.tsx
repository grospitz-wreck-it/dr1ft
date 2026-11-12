import { createClient } from "@supabase/supabase-js";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  rhetorisch: "Rhetorische Tricks",
  sozial: "Soziale Mechanismen",
  gegenmuster: "Gegenstrategien",
};

type GlossaryEntry = {
  id: string;
  category: string | null;
  title: string;
  description: string;
  example: string | null;
};

async function loadEntries(): Promise<GlossaryEntry[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from("technique_glossary").select("*").order("category").order("title");
    if (error) {
      console.error("DR1FT Lexikon: Supabase query failed", error);
      return [];
    }
    return (data ?? []) as GlossaryEntry[];
  } catch (error) {
    console.error("DR1FT Lexikon: failed to load entries", error);
    return [];
  }
}

export default async function LexikonPage() {
  const entries = await loadEntries();
  const grouped = new Map<string, GlossaryEntry[]>();
  entries.forEach((entry) => {
    const key = entry.category ?? "sonstige";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  });

  return (
    <>
      <SiteNav />
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl font-bold mb-3">DR1FT-Lexikon</h1>
        <p className="text-ash mb-2">Generische Manipulationsmuster, wie sie in DR1FT-Szenarien vorkommen — verständlich erklärt.</p>
        <p className="text-xs text-ash/70 mb-10">
          Hinweis: Dieses Lexikon zeigt allgemeine rhetorische und soziale Muster.
          Es enthält bewusst keine realen Symbole oder Codes aus extremistischen
          Szenen — solche Inhalte sind ausschließlich redaktionell geprüft im geschützten Schulbereich verfügbar.
        </p>

        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="mb-10">
            <h2 className="font-display text-lg font-semibold mb-4">{CATEGORY_LABELS[category] ?? category}</h2>
            <div className="space-y-4">
              {items.map((entry) => (
                <div key={entry.id} className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold mb-1.5">{entry.title}</h3>
                  <p className="text-sm text-ash leading-relaxed mb-2">{entry.description}</p>
                  {entry.example && <p className="text-sm italic text-ink/70 bg-subtle rounded-lg px-3 py-2">Beispiel: {entry.example}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}

        {entries.length === 0 && <p className="text-ash text-sm">Noch keine veröffentlichten Einträge.</p>}
      </section>
      <SiteFooter />
    </>
  );
}
