import Link from "next/link";
import { Shield, Users, BookOpen, BarChart3, ArrowRight } from "lucide-react";
import { SiteNav, SiteFooter } from "../components/SiteNav";

export default function HomePage() {
  return (
    <>
      <SiteNav />

      <section className="relative isolate overflow-hidden min-h-[680px] flex items-center">
        <picture className="absolute inset-0 -z-20">
          <source media="(max-width: 767px)" srcSet="/dr1ft-hero-m.webp" />
          <img
            src="/dr1ft-hero-w.webp"
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </picture>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,10,25,.92)_0%,rgba(5,10,25,.68)_38%,rgba(10,8,24,.28)_72%,rgba(10,8,24,.62)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_45%,rgba(0,218,255,.24),transparent_38%),radial-gradient(circle_at_78%_45%,rgba(255,55,95,.22),transparent_40%)]" />

        <div className="max-w-6xl mx-auto w-full px-6 py-24">
          <div className="max-w-2xl text-white">
            <p className="inline-flex bg-cyan-300/10 border border-cyan-200/30 text-xs font-medium text-cyan-100 px-3 py-1 rounded-full mb-6 backdrop-blur">
              Medienkompetenz · NRW
            </p>
            <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02]">
              Medienkompetenz, die Schüler:innen wirklich erleben.
            </h1>
            <p className="text-lg sm:text-xl text-slate-200 max-w-xl mt-6 leading-relaxed">
              DR1FT ist ein simulierter Social-Media-Feed, in dem Schüler:innen
              Manipulation selbst erkennen lernen — statt sie nur erklärt zu bekommen.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-9">
              <Link href="/simulation" className="bg-white text-slate-950 font-semibold px-6 py-3 rounded-lg hover:bg-slate-100 flex items-center gap-2 shadow-lg shadow-cyan-950/20">
                Simulation ansehen <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/preise" className="border border-white/35 bg-white/10 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/15 backdrop-blur">
                Preise für Schulen
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-cyan-100/10 bg-slate-950 text-slate-300 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-sm">
          <span>DSGVO-konform, EU-Hosting</span>
          <span className="text-cyan-300/60">·</span>
          <span>Redaktionell geprüfter Content</span>
          <span className="text-fuchsia-300/60">·</span>
          <span>Kein Freitext-Chat mit Minderjährigen</span>
          <span className="text-cyan-300/60">·</span>
          <span>Zugang nur über Klassen-Code</span>
        </div>
      </section>

      <section id="produkt" className="bg-[#080D1D] text-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold text-center mb-3">Wie DR1FT funktioniert</h2>
          <p className="text-slate-400 text-center max-w-lg mx-auto mb-12">
            Vier Bausteine, die zusammen ein sicheres, wirksames Lernerlebnis ergeben.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, title: "Erleben statt erklären", text: "Schüler:innen scrollen durch einen echten Feed und entdecken Manipulationsmuster selbst — Reflexion folgt der Erfahrung." },
              { icon: Shield, title: "Sicher gestaltet", text: "Kein freies Kommentarfeld, kein Live-KI-Chat mit manipulativen Personas — jeder Dialog ist vorautorisiert und redaktionell geprüft." },
              { icon: Users, title: "Für die ganze Klasse", text: "Zugang über einen einfachen Klassen-Code, ohne dass Schüler:innen eine eigene E-Mail-Adresse brauchen." },
              { icon: BarChart3, title: "Fortschritt sichtbar", text: "Lehrkräfte sehen aggregierte Kompetenzentwicklung und wo die Klasse als Ganzes noch Unterstützung braucht." },
            ].map((f) => (
              <div key={f.title} className="border border-white/10 bg-white/[.035] rounded-2xl p-6 hover:border-cyan-300/30 transition-colors">
                <f.icon className="w-6 h-6 text-cyan-300 mb-4" strokeWidth={1.75} />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0D1226] text-white py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold text-center mb-12">In drei Schritten startklar</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              ["1", "Klasse anlegen", "Lehrkraft registriert sich und erstellt eine Klasse — ein Zugangscode entsteht automatisch."],
              ["2", "Szenario zuweisen", "Ein passendes Szenario wird für die Klasse freigeschaltet, kompakt oder über mehrere Tage verteilt."],
              ["3", "Feed erleben", "Schüler:innen treten mit dem Code bei und erleben das Szenario im simulierten Feed."],
            ].map(([n, title, text]) => (
              <div key={n} className="text-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-white flex items-center justify-center font-display font-bold mx-auto mb-4 shadow-lg shadow-cyan-500/15">{n}</div>
                <h3 className="font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#080D1D] text-white max-w-none px-6 py-24 text-center border-t border-white/5">
        <h2 className="font-display text-3xl font-bold mb-3">Für jede Schulgröße</h2>
        <p className="text-slate-400 mb-8 max-w-xl mx-auto">
          Schullizenzen ab 1 Klasse kostenlos testen — feste Jahrespreise je nach Schulgröße, keine Pro-Kopf-Falle.
        </p>
        <Link href="/preise" className="bg-white text-slate-950 font-semibold px-6 py-3 rounded-lg hover:bg-slate-100 inline-flex items-center gap-2">
          Preise ansehen <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <SiteFooter />
    </>
  );
}
