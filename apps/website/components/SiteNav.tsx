import Link from "next/link";

const PLAYER_URL = process.env.NEXT_PUBLIC_PLAYER_URL ?? "https://app.dr1ft.de";
const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL ?? "https://lehrkraft.dr1ft.de";
const EDITORIAL_URL = process.env.NEXT_PUBLIC_EDITORIAL_URL ?? "https://redaktion.dr1ft.de";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080D1D]/90 text-white backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-white shrink-0">
          DR1<span className="text-cyan-300">F</span>T
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm text-slate-400">
          <Link href="/schulen" className="hover:text-cyan-300 transition-colors">Schulen</Link>
          <Link href="/lehrkraefte" className="hover:text-cyan-300 transition-colors">Lehrkräfte</Link>
          <Link href="/schueler" className="hover:text-cyan-300 transition-colors">Schüler:innen</Link>
          <Link href="/#produkt" className="hover:text-cyan-300 transition-colors">Produkt</Link>
          <Link href="/simulation" className="hover:text-cyan-300 transition-colors">Simulation</Link>
          <Link href="/preise" className="hover:text-cyan-300 transition-colors">Preise</Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <a href={`${TEACHER_URL}/login`} className="hidden sm:inline text-sm text-slate-400 hover:text-white transition-colors">
            Login
          </a>
          <a href={`${TEACHER_URL}/signup`} className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition shadow-lg shadow-cyan-500/10">
            Demo starten
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060A16] text-slate-400">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="font-display font-bold text-white mb-2">
              DR1<span className="text-cyan-300">F</span>T
            </p>
            <p>Medienkompetenz für weiterführende Schulen.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-3">Für Schulen</p>
            <div className="space-y-2">
              <Link href="/schulen" className="block hover:text-cyan-300 transition-colors">Schullösung</Link>
              <Link href="/preise" className="block hover:text-cyan-300 transition-colors">Preise</Link>
              <a href={`${EDITORIAL_URL}/school-admin`} className="block hover:text-cyan-300 transition-colors">Schul-Admin</a>
            </div>
          </div>
          <div>
            <p className="text-white font-medium mb-3">Für Lehrkräfte</p>
            <div className="space-y-2">
              <Link href="/lehrkraefte" className="block hover:text-cyan-300 transition-colors">Lehrkraft-Bereich</Link>
              <a href={`${TEACHER_URL}/login`} className="block hover:text-cyan-300 transition-colors">Login</a>
              <a href={`${TEACHER_URL}/signup`} className="block hover:text-cyan-300 transition-colors">Registrieren</a>
            </div>
          </div>
          <div>
            <p className="text-white font-medium mb-3">Für Schüler:innen</p>
            <div className="space-y-2">
              <Link href="/schueler" className="block hover:text-cyan-300 transition-colors">So funktioniert der Zugang</Link>
              <a href={`${PLAYER_URL}/join`} className="block hover:text-cyan-300 transition-colors">Klassen-Code eingeben</a>
              <Link href="/lexikon" className="block hover:text-cyan-300 transition-colors">Lexikon</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
