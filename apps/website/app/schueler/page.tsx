import { ArrowRight, KeyRound, Smartphone, ShieldCheck } from "lucide-react";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

const PLAYER_URL = process.env.NEXT_PUBLIC_PLAYER_URL ?? "https://app.dr1ft.de";

export default function SchuelerPage() {
  return (
    <>
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-cyan-300 text-sm font-semibold uppercase tracking-[.18em] mb-4">Für Schüler:innen</p>
        <h1 className="font-display text-4xl sm:text-6xl font-bold max-w-3xl">Mitmachen. Scrollen. Erkennen.</h1>
        <p className="text-slate-300 text-lg max-w-2xl mt-6 leading-relaxed">
          Du brauchst keinen öffentlichen Account. Deine Lehrkraft gibt dir einen Klassen-Code, mit dem du direkt in das DR1FT-Szenario einsteigst.
        </p>

        <a href={`${PLAYER_URL}/join`} className="mt-9 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white font-semibold px-6 py-3 rounded-lg inline-flex items-center gap-2">
          Klassen-Code eingeben <ArrowRight className="w-4 h-4" />
        </a>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {[
            [KeyRound, "Klassen-Code", "Der Zugang erfolgt über den Code deiner Klasse."],
            [Smartphone, "Browser reicht", "DR1FT läuft auf Schulgeräten direkt im Browser."],
            [ShieldCheck, "Geschützter Zugang", "Du brauchst keine öffentliche Social-Media-Identität für die Lernplattform."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof KeyRound;
            return <div key={title as string} className="border border-white/10 bg-white/[.035] rounded-2xl p-6">
              <I className="w-7 h-7 text-cyan-300 mb-5" />
              <h2 className="font-display font-semibold text-lg mb-2">{title as string}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{text as string}</p>
            </div>;
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
