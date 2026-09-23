import Link from "next/link";
import { Building2, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

export default function SchulenPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_35%,rgba(34,211,238,.18),transparent_35%),radial-gradient(circle_at_85%_65%,rgba(217,70,239,.14),transparent_35%)]" />
          <div className="relative max-w-6xl mx-auto px-6 py-20">
            <p className="text-cyan-300 text-sm font-semibold uppercase tracking-[.18em] mb-4">Für Schulen</p>
            <h1 className="font-display text-4xl sm:text-6xl font-bold max-w-3xl">Eine gemeinsame Plattform für Medienkompetenz.</h1>
            <p className="text-slate-300 text-lg max-w-2xl mt-6 leading-relaxed">
              DR1FT verbindet Schulleitung, Lehrkräfte und Klassen in einem geschützten Lernsystem.
              Die Schule schafft den Rahmen, Lehrkräfte steuern den Unterricht und Schüler:innen erleben die Szenarien.
            </p>
            <div className="flex flex-wrap gap-4 mt-9">
              <Link href="/preise" className="bg-white text-slate-950 font-semibold px-6 py-3 rounded-lg inline-flex items-center gap-2">Preise ansehen <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/lehrkraefte" className="border border-white/20 bg-white/5 px-6 py-3 rounded-lg">Für Lehrkräfte</Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              [Building2, "Schulverwaltung", "Schulen können ihre Organisation, Mitglieder und Zugänge zentral verwalten."],
              [Users, "Unterricht", "Lehrkräfte legen Klassen an, weisen Szenarien zu und begleiten den Lernprozess."],
              [ShieldCheck, "Geschützter Betrieb", "Schüler:innen nutzen einen Klassen-Code statt eines öffentlichen Self-Signups."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Building2;
              return <div key={title as string} className="border border-white/10 bg-white/[.035] rounded-2xl p-6">
                <I className="w-7 h-7 text-cyan-300 mb-5" />
                <h2 className="font-display font-semibold text-lg mb-2">{title as string}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{text as string}</p>
              </div>;
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
