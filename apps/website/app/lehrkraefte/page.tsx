import Link from "next/link";
import { BarChart3, BookOpen, Users, ArrowRight } from "lucide-react";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL ?? "https://lehrkraft.dr1ft.de";

export default function LehrkraeftePage() {
  return (
    <>
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-fuchsia-300 text-sm font-semibold uppercase tracking-[.18em] mb-4">Für Lehrkräfte</p>
        <h1 className="font-display text-4xl sm:text-6xl font-bold max-w-3xl">Unterricht steuern. Nicht nur Inhalte abspielen.</h1>
        <p className="text-slate-300 text-lg max-w-2xl mt-6 leading-relaxed">
          Im Lehrkraft-Bereich erstellst du Klassen, weist Szenarien zu und bekommst aggregierte Einblicke in den Kompetenzfortschritt.
        </p>

        <div className="flex flex-wrap gap-4 mt-9">
          <a href={`${TEACHER_URL}/signup`} className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white font-semibold px-6 py-3 rounded-lg inline-flex items-center gap-2">Kostenlos starten <ArrowRight className="w-4 h-4" /></a>
          <a href={`${TEACHER_URL}/login`} className="border border-white/20 bg-white/5 px-6 py-3 rounded-lg">Zum Login</a>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {[
            [Users, "Klassen", "Klassen anlegen und Zugangscodes für Schüler:innen erzeugen."],
            [BookOpen, "Szenarien", "Passende Szenarien für eine Klasse freischalten und den Lernablauf steuern."],
            [BarChart3, "Fortschritt", "Aggregierte Kompetenzentwicklung und Missionsfortschritt der Klasse sichtbar machen."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Users;
            return <div key={title as string} className="border border-white/10 bg-white/[.035] rounded-2xl p-6">
              <I className="w-7 h-7 text-cyan-300 mb-5" />
              <h2 className="font-display font-semibold text-lg mb-2">{title as string}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{text as string}</p>
            </div>;
          })}
        </div>

        <div className="mt-16 border border-cyan-300/20 bg-cyan-300/5 rounded-2xl p-6">
          <p className="text-sm text-slate-300">Noch keinen Zugang?</p>
          <Link href="/preise" className="text-cyan-300 font-medium inline-flex items-center gap-2 mt-2">Lizenzmodelle ansehen <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
