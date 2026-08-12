// apps/website/components/SiteNav.tsx
// Login führt zur Lehrkraft-/Redaktions-App (apps/admin) — Schüler:innen
// kommen nicht über die öffentliche Homepage rein, sondern über den
// Zugangscode ihrer Klasse (siehe apps/player/app/join).

import Link from "next/link";

const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL ?? "http://localhost:3001";

export function SiteNav() {
  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          DR1FT
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ash">
          <Link href="/#produkt" className="hover:text-ink">Produkt</Link>
          <Link href="/lexikon" className="hover:text-ink">Lexikon</Link>
          <Link href="/simulation" className="hover:text-ink">Simulation</Link>
          <Link href="/preise" className="hover:text-ink">Preise</Link>
        </nav>
        <div className="flex items-center gap-4">
          <a href={`${TEACHER_URL}/login`} className="text-sm text-ash hover:text-ink hidden sm:inline">
            Login
          </a>
          <a
            href={`${TEACHER_URL}/signup`}
            className="bg-ink text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-ink/90"
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
    <footer className="border-t border-border mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between gap-6 text-sm text-ash">
        <div>
          <p className="font-display font-bold text-ink mb-1">DR1FT</p>
          <p>Medienkompetenz für weiterführende Schulen.</p>
        </div>
        <div className="flex gap-8">
          <Link href="/lexikon" className="hover:text-ink">Lexikon</Link>
          <Link href="/simulation" className="hover:text-ink">Simulation</Link>
          <Link href="/preise" className="hover:text-ink">Preise</Link>
          <a href={`${TEACHER_URL}/login`} className="hover:text-ink">Login</a>
        </div>
      </div>
    </footer>
  );
}
