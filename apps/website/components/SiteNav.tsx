// apps/website/components/SiteNav.tsx
// Login führt zur Lehrkraft-/Redaktions-App — Schüler:innen kommen über
// den Zugangscode ihrer Klasse in die Player-App.

import Link from "next/link";

const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL ?? "http://localhost:3001";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080D1D]/90 text-white backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
          DR1<span className="text-cyan-300">F</span>T
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <Link href="/#produkt" className="hover:text-cyan-300 transition-colors">Produkt</Link>
          <Link href="/lexikon" className="hover:text-cyan-300 transition-colors">Lexikon</Link>
          <Link href="/simulation" className="hover:text-cyan-300 transition-colors">Simulation</Link>
          <Link href="/preise" className="hover:text-cyan-300 transition-colors">Preise</Link>
        </nav>
        <div className="flex items-center gap-4">
          <a href={`${TEACHER_URL}/login`} className="text-sm text-slate-400 hover:text-white hidden sm:inline transition-colors">
            Login
          </a>
          <a
            href={`${TEACHER_URL}/signup`}
            className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition"
          >
            Demo anfragen
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060A16] text-slate-400">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between gap-6 text-sm">
        <div>
          <p className="font-display font-bold text-white mb-1">
            DR1<span className="text-cyan-300">F</span>T
          </p>
          <p>Medienkompetenz für weiterführende Schulen.</p>
        </div>
        <div className="flex gap-8">
          <Link href="/lexikon" className="hover:text-cyan-300 transition-colors">Lexikon</Link>
          <Link href="/simulation" className="hover:text-cyan-300 transition-colors">Simulation</Link>
          <Link href="/preise" className="hover:text-cyan-300 transition-colors">Preise</Link>
          <a href={`${TEACHER_URL}/login`} className="hover:text-cyan-300 transition-colors">Login</a>
        </div>
      </div>
    </footer>
  );
}
