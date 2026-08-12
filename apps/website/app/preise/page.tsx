import { Check } from "lucide-react";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL ?? "http://localhost:3001";

const TIERS = [
  {
    name: "Pilot",
    price: "kostenlos",
    period: "90 Tage",
    features: ["1 Klasse", "1 Szenario", "Lehrer-Dashboard"],
  },
  {
    name: "Schullizenz S",
    price: "ab 350 €",
    period: "pro Jahr",
    features: ["bis 300 Schüler:innen", "Volle Szenario-Bibliothek", "Notenbuch & Engpass-Analyse"],
    highlighted: true,
  },
  {
    name: "Schullizenz M/L",
    price: "individuell",
    period: "auf Anfrage",
    features: ["ab 300 Schüler:innen", "Jahrgangs-Auswertung", "Priorisierter Support"],
  },
];

export default function PreisePage() {
  return (
    <>
      <SiteNav />
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-center mb-3">Preise für Schulen</h1>
        <p className="text-ash text-center max-w-lg mx-auto mb-12">
          Feste Jahrespreise nach Schulgröße statt Pro-Kopf-Abrechnung —
          damit die ganze Klasse teilnehmen kann, nicht nur ein Teil.
        </p>

        <div className="grid sm:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-6 border ${tier.highlighted ? "border-ink shadow-lg" : "border-border"}`}
            >
              <h2 className="font-display font-semibold mb-1">{tier.name}</h2>
              <p className="text-2xl font-bold">{tier.price}</p>
              <p className="text-xs text-ash mb-4">{tier.period}</p>
              <ul className="space-y-2 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-growth shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href={`${TEACHER_URL}/signup`}
                className={`block text-center text-sm font-medium py-2.5 rounded-lg ${
                  tier.highlighted ? "bg-ink text-white" : "border border-border"
                }`}
              >
                {tier.price === "kostenlos" ? "Kostenlos starten" : "Anfragen"}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-ash mt-10">
          Für Schulträger und Verbünde mehrerer Schulen erstellen wir ein
          individuelles Angebot. Illustrative Preise, finale Konditionen auf Anfrage.
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
