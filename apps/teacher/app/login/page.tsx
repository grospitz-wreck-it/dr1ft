"use client";
// apps/admin/app/login/page.tsx
// Für Lehrkräfte und Redaktion — normale E-Mail-Anmeldung, da Erwachsene.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function LoginPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    router.push("/classes");
  }

  return (
    <main className="dr1ft-login-screen relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
      <div className="dr1ft-login-backdrop absolute inset-0 -z-20" aria-hidden="true" />
      <div className="dr1ft-login-overlay absolute inset-0 -z-10" aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-5 sm:gap-6">
        <header className="flex w-full flex-col items-center text-center">
          <img src="/branding/drift-logo-transparent-vertical.webp" alt="DR1FT" className="mb-2 h-auto w-[min(52vw,12rem)] object-contain drop-shadow-[0_8px_30px_rgba(124,58,237,0.3)]" fetchPriority="high" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-white/80 sm:text-xs">Lehrkraft Studio</p>
        </header>
        <section className="w-full max-w-[25rem]">
          <form onSubmit={handleSubmit} className="dr1ft-login-card space-y-3.5 rounded-[1.5rem] p-4 sm:space-y-4 sm:p-5 md:p-6">
            <div className="mb-1 text-center">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Willkommen zurück</h1>
              <p className="mt-1.5 text-xs leading-5 text-white/65 sm:text-sm">Melde dich mit deinem DR1FT-Konto an.</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/85">E-Mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@schule.de" autoComplete="username" required className="dr1ft-login-input w-full rounded-xl px-4 py-3 text-base outline-none transition sm:py-3.5" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/85">Passwort</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dein Passwort" autoComplete="current-password" required className="dr1ft-login-input w-full rounded-xl px-4 py-3 text-base outline-none transition sm:py-3.5" />
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200">{error}</p>}
            <button type="submit" disabled={pending} className="dr1ft-login-submit flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition duration-200 disabled:cursor-wait disabled:opacity-60 sm:text-base">
              {pending ? "Du wirst angemeldet …" : "Anmelden"} {!pending && <span aria-hidden="true">→</span>}
            </button>
            <p className="text-center text-xs text-white/55">Neu hier? <a href="/signup" className="text-white/80 underline underline-offset-4 hover:text-white">Account erstellen</a></p>
          </form>
        </section>
      </div>
      <style jsx>{`
        .dr1ft-login-screen { background:#08091e; isolation:isolate; }
        .dr1ft-login-backdrop { background-image:url("/branding/dr1ft-login-background.webp"); background-size:cover; background-position:center; transform:scale(1.06); animation:dr1ft-background-drift 38s ease-in-out infinite alternate; will-change:transform; }
        .dr1ft-login-overlay { background:radial-gradient(ellipse at 50% 38%,rgba(10,8,32,.16) 0%,rgba(10,8,32,.34) 58%,rgba(7,7,25,.58) 100%),linear-gradient(180deg,rgba(7,7,25,.16),rgba(7,7,25,.42)); }
        .dr1ft-login-card { background:linear-gradient(145deg,rgba(14,12,37,.88),rgba(24,13,45,.84)); border:1px solid rgba(196,181,253,.27); box-shadow:0 22px 70px rgba(3,3,18,.34),inset 0 1px 0 rgba(255,255,255,.09); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); }
        .dr1ft-login-input { color:#f8f7ff; background:rgba(255,255,255,.075); border:1px solid rgba(196,181,253,.25); min-height:3rem; }
        .dr1ft-login-input::placeholder { color:rgba(226,222,242,.44); }
        .dr1ft-login-input:focus { border-color:#67e8f9; box-shadow:0 0 0 3px rgba(103,232,249,.14); background:rgba(255,255,255,.105); }
        .dr1ft-login-submit { background:linear-gradient(100deg,#c026d3 0%,#7c3aed 52%,#0891b2 100%); box-shadow:0 8px 28px rgba(124,58,237,.28); }
        .dr1ft-login-submit:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); box-shadow:0 12px 32px rgba(124,58,237,.34); }
        @keyframes dr1ft-background-drift { from {transform:scale(1.06) translate3d(-1.1%,0,0)} to {transform:scale(1.06) translate3d(1.1%,0,0)} }
        @media (prefers-reduced-motion:reduce) { .dr1ft-login-backdrop { animation:none; transform:scale(1.02); } }
      `}</style>
    </main>
  );
}
