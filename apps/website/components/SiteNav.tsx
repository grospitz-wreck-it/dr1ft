import Link from "next/link";

const PLAYER_URL = process.env.NEXT_PUBLIC_PLAYER_URL ?? "https://app.dr1ft.de";
const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL ?? "https://lehrkraft.dr1ft.de";
const EDITORIAL_URL = process.env.NEXT_PUBLIC_EDITORIAL_URL ?? "https://redaktion.dr1ft.de";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080D1D]/90 text-white backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link href="/" aria-label="DR1FT Startseite" className="shrink-0">
          <img src="/branding/drift-logo-transparent-horizontal-white.webp" alt="DR1FT" className="h-8 w-auto sm:h-9" />
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden lg:flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1.5 shadow-inner shadow-white/[0.025]">
          <a href={`${EDITORIAL_URL}/login?next=%2Fschool-admin`} className="group inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-cyan-300/20 hover:bg-cyan-300/[0.09] hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70 transition group-hover:bg-cyan-200 group-hover:shadow-[0_0_10px_rgba(103,232,249,.8)]" />
            Schulen
          </a>
          <a href={`${TEACHER_URL}/login`} className="group inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-violet-300/20 hover:bg-violet-300/[0.09] hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300/70 transition group-hover:bg-violet-200 group-hover:shadow-[0_0_10px_rgba(196,181,253,.8)]" />
            Lehrkräfte
          </a>
          <a href={`${PLAYER_URL}/join`} className="group inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-fuchsia-300/20 hover:bg-fuchsia-300/[0.09] hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300/70 transition group-hover:bg-fuchsia-200 group-hover:shadow-[0_0_10px_rgba(240,171,252,.8)]" />
            Schüler:innen
          </a>
          <Link href="/#produkt" className="group inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-cyan-300/20 hover:bg-cyan-300/[0.09] hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/50 transition group-hover:bg-cyan-200 group-hover:shadow-[0_0_10px_rgba(103,232,249,.8)]" />
            Produkt
          </Link>
          <Link href="/simulation" className="group inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-violet-300/20 hover:bg-violet-300/[0.09] hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300/50 transition group-hover:bg-violet-200 group-hover:shadow-[0_0_10px_rgba(196,181,253,.8)]" />
            Simulation
          </Link>
          <Link href="/preise" className="group inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-fuchsia-300/20 hover:bg-fuchsia-300/[0.09] hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300/50 transition group-hover:bg-fuchsia-200 group-hover:shadow-[0_0_10px_rgba(240,171,252,.8)]" />
            Preise
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/mitmachen" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/15 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-cyan-400/25">
            Mitmachen <span aria-hidden="true">→</span>
          </Link>
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
              <a href={`${EDITORIAL_URL}/login?next=%2Fschool-admin`} className="block hover:text-cyan-300 transition-colors">Schul-Login</a>
              <Link href="/preise" className="block hover:text-cyan-300 transition-colors">Preise</Link>
            </div>
          </div>
          <div>
            <p className="text-white font-medium mb-3">Für Lehrkräfte</p>
            <div className="space-y-2">
              <a href={`${TEACHER_URL}/login`} className="block hover:text-cyan-300 transition-colors">Lehrkraft-Login</a>
              <Link href="/mitmachen" className="block hover:text-cyan-300 transition-colors">Mitmachen</Link>
            </div>
          </div>
          <div>
            <p className="text-white font-medium mb-3">Für Schüler:innen</p>
            <div className="space-y-2">
              <a href={`${PLAYER_URL}/join`} className="block hover:text-cyan-300 transition-colors">Schüler-Zugang</a>
              <a href={`${PLAYER_URL}/join`} className="block hover:text-cyan-300 transition-colors">Klassen-Code eingeben</a>
              <Link href="/lexikon" className="block hover:text-cyan-300 transition-colors">Lexikon</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
