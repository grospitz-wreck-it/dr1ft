import Link from "next/link";
import { Shield, Users, BookOpen, BarChart3, ArrowRight } from "lucide-react";
import { SiteNav, SiteFooter } from "../components/SiteNav";

export default function HomePage() {
  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="inline-block bg-subtle border border-border text-xs font-medium text-ash px-3 py-1 rounded-full mb-6">
          Entwickelt nach dem Medienkompetenzrahmen NRW
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Medienkompetenz, die Schüler:innen wirklich erleben.
        </h1>
        <p className="text-lg text-ash max-w-xl mx-auto mt-5">
          DR1FT ist ein simulierter Social-Media-Feed, in dem Schüler:innen
          Manipulation selbst erkennen lernen — statt sie nur erklärt zu bekommen.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link href="/simulation" className="bg-ink text-white font-medium px-6 py-3 rounded-lg hover:bg-ink/90 flex items-center gap-2">
            Simulation ansehen <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/preise" className="border border-border font-medium px-6 py-3 rounded-lg hover:bg-subtle">
            Preise für Schulen
          </Link>
        </div>
      </section>

      {/* Social proof / trust bar */}
      <section className="border-y border-border bg-subtle py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-sm text-ash">
          <span>DSGVO-konform, EU-Hosting</span>
          <span>·</span>
          <span>Redaktionell geprüfter Content</span>
          <span>·</span>
          <span>Kein Freitext-Chat mit Minderjährigen</span>
          <span>·</span>
          <span>Zugang nur über Klassen-Code</span>
        </div>
      </section>

      {/* Features */}
      <section id="produkt" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl font-bold text-center mb-2">Wie DR1FT funktioniert</h2>
        <p className="text-ash text-center max-w-lg mx-auto mb-12">
          Vier Bausteine, die zusammen ein sicheres, wirksames Lernerlebnis ergeben.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: BookOpen,
              title: "Erleben statt erklären",
              text: "Schüler:innen scrollen durch einen echten Feed und entdecken Manipulationsmuster selbst — Reflexion folgt der Erfahrung.",
            },
            {
              icon: Shield,
              title: "Sicher gestaltet",
              text: "Kein freies Kommentarfeld, kein Live-KI-Chat mit manipulativen Personas — jeder Dialog ist vorautoriert und redaktionell geprüft.",
            },
            {
              icon: Users,
              title: "Für die ganze Klasse",
              text: "Zugang über einen einfachen Klassen-Code, ohne dass Schüler:innen eine eigene E-Mail-Adresse brauchen.",
            },
            {
              icon: BarChart3,
              title: "Fortschritt sichtbar",
              text: "Lehrkräfte sehen aggregierte Kompetenzentwicklung und wo die Klasse als Ganzes noch Unterstützung braucht.",
            },
          ].map((f) => (
            <div key={f.title} className="border border-border rounded-xl p-5">
              <f.icon className="w-6 h-6 text-ink mb-3" strokeWidth={1.75} />
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-ash leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-subtle py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-2xl font-bold text-center mb-12">In drei Schritten startklar</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              ["1", "Klasse anlegen", "Lehrkraft registriert sich und erstellt eine Klasse — ein Zugangscode entsteht automatisch."],
              ["2", "Szenario zuweisen", "Ein passendes Szenario wird für die Klasse freigeschaltet, kompakt oder über mehrere Tage verteilt."],
              ["3", "Feed erleben", "Schüler:innen treten mit dem Code bei und erleben das Szenario im simulierten Feed."],
            ].map(([n, title, text]) => (
              <div key={n} className="text-center">
                <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-display font-bold mx-auto mb-4">
                  {n}
                </div>
                <h3 className="font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-ash">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-bold mb-3">Für jede Schulgröße</h2>
        <p className="text-ash mb-8">
          Schullizenzen ab 1 Klasse kostenlos testen — feste Jahrespreise je nach Schulgröße, keine Pro-Kopf-Falle.
        </p>
        <Link href="/preise" className="bg-ink text-white font-medium px-6 py-3 rounded-lg hover:bg-ink/90 inline-flex items-center gap-2">
          Preise ansehen <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <SiteFooter />
    </>
  );
}
