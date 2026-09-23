import Link from "next/link";

const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL ?? "http://localhost:3001";
const PLAYER_URL = process.env.NEXT_PUBLIC_PLAYER_URL ?? "http://localhost:3000";

export function SiteNav() {
  return (
    <header className="border-b border-border bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight shrink-0">DR1FT</Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Link href="/#produkt" className="px-3 py-2 text-sm text-ash hover:text-ink">Produkt</Link>
          <Link href="/lexikon" className="px-3 py-2 text-sm text-ash hover:text-ink">Lexikon</Link>
          <Link href="/simulation" className="px-3 py-2 text-sm text-ash hover:text-ink">Simulation</Link>
          <Link href="/preise" className="px-3 py-2 text-sm text-ash hover:text-ink">Preise</Link>
        </nav>

        <nav aria-label="Bereiche" className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-subtle p-1">
          <a href={TEACHER_URL + "/classes"} className="role-nav role-nav-school">
            <span className="role-nav-label">Schulen</span>
            <span className="hidden xl:inline">Schul-Admin &amp; Schulleitung</span>
          </a>
          <a href={TEACHER_URL + "/login"} className="role-nav role-nav-teacher">
            <span className="role-nav-label">Lehrkräfte</span>
            <span className="hidden xl:inline">Dashboard &amp; Klassen</span>
          </a>
          <a href={PLAYER_URL + "/join"} className="role-nav role-nav-student">
            <span className="role-nav-label">Schüler:innen</span>
            <span className="hidden xl:inline">Mit Klassen-Code starten</span>
          </a>
        </nav>

        <a href={TEACHER_URL + "/signup"} className="hidden sm:inline-flex bg-ink text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-ink/90">
          Demo anfragen
        </a>
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
          <a href={TEACHER_URL + "/classes"} className="hover:text-ink">Schul-Admin</a>
          <a href={TEACHER_URL + "/login"} className="hover:text-ink">Lehrkräfte-Login</a>
          <a href={PLAYER_URL + "/join"} className="hover:text-ink">Schüler:innen</a>
        </div>
      </div>
    </footer>
  );
}