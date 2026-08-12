import { createClient } from "@supabase/supabase-js";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

function supabasePublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  rhetorisch: "Rhetorische Tricks",
  sozial: "Soziale Mechanismen",
  gegenmuster: "Gegenstrategien",
};

export default async function LexikonPage() {
  const supabase = supabasePublicClient();
  const { data: entries } = await supabase
    .from("technique_glossary")
    .select("*")
    .order("category")
    .order("title");

  const grouped = new Map<string, any[]>();
  (entries ?? []).forEach((e) => {
    const key = e.category ?? "sonstige";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  });

  return (
    <>
      <SiteNav />
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl font-bold mb-3">DR1FT-Lexikon</h1>
        <p className="text-ash mb-2">
          Generische Manipulationsmuster, wie sie in DR1FT-Szenarien vorkommen —
          verständlich erklärt.
        </p>
        <p className="text-xs text-ash/70 mb-10">
          Hinweis: Dieses Lexikon zeigt allgemeine rhetorische und soziale Muster.
          Es enthält bewusst keine realen Symbole oder Codes aus extremistischen
          Szenen — solche Inhalte sind ausschließlich redaktionell geprüft im
          geschützten Schulbereich verfügbar.
        </p>

        {[...grouped.entries()].map(([category, items]) => (
          <div key={category} className="mb-10">
            <h2 className="font-display text-lg font-semibold mb-4">
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="space-y-4">
              {items.map((e) => (
                <div key={e.id} className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold mb-1.5">{e.title}</h3>
                  <p className="text-sm text-ash leading-relaxed mb-2">{e.description}</p>
                  {e.example && (
                    <p className="text-sm italic text-ink/70 bg-subtle rounded-lg px-3 py-2">
                      Beispiel: {e.example}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {(!entries || entries.length === 0) && (
          <p className="text-ash text-sm">Noch keine veröffentlichten Einträge.</p>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
