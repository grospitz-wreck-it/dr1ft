"use client";
// apps/player/app/login/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";

function buildSyntheticEmail(username: string, accessCode: string): string {
  const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanCode = accessCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${cleanUser}.${cleanCode}@dr1ft.local`;
}

export default function LoginPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (user) {
        router.replace("/feed");
        return;
      }
      setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const email = buildSyntheticEmail(username, accessCode);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Zugangscode, Nutzername oder Passwort stimmen nicht.");
      setPending(false);
      return;
    }

    router.push("/feed");
  }

  if (checkingSession) return null;

  return (
    <main className="min-h-screen px-4 py-8 text-paper sm:px-6 sm:py-12 safe-top safe-bottom">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl items-center justify-center">
        <section className="w-full">
          <header className="mb-6 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-[0_10px_28px_rgba(168,85,247,.28)]">
                <span className="font-display text-lg font-bold tracking-[-0.08em]">d.</span>
              </span>
              <div>
                <div className="font-display text-xl font-bold tracking-[-0.05em]">DR1FT</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ash">Medienkompetenz</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ash shadow-sm sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.12)]" />
              Schülerzugang
            </div>
          </header>

          <form onSubmit={handleSubmit} className="player-surface overflow-hidden rounded-[30px] p-5 sm:p-8">
            <div className="mb-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-100 via-violet-100 to-cyan-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                Schüler-Login
              </div>
              <h1 className="font-display text-3xl font-bold tracking-[-0.04em] text-paper sm:text-4xl">Willkommen zurück.</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-ash sm:text-[15px]">
                Melde dich mit deinem Klassen-Code, Nutzernamen und Passwort an. Danach geht es direkt in deinen Feed.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">
                  Klassen-Code
                  <span className="font-mono normal-case tracking-[0.08em] text-ash/70">z. B. AB3CD9</span>
                </span>
                <input value={accessCode} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} placeholder="AB3CD9" autoComplete="off" required className="touch-target w-full rounded-2xl border border-violet-200 bg-white px-4 py-4 font-mono text-lg font-medium uppercase tracking-[0.22em] text-paper shadow-[0_8px_24px_rgba(62,40,104,.06)] outline-none transition placeholder:text-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">Nutzername</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Dein Nutzername" autoComplete="username" required className="touch-target w-full rounded-2xl border border-violet-200 bg-white px-4 py-4 text-sm text-paper shadow-[0_8px_24px_rgba(62,40,104,.06)] outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">Passwort</span>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Dein Passwort" autoComplete="current-password" required className="touch-target w-full rounded-2xl border border-violet-200 bg-white px-4 py-4 text-sm text-paper shadow-[0_8px_24px_rgba(62,40,104,.06)] outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
              </label>
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

            <button type="submit" disabled={pending} className="mt-7 w-full rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(139,92,246,.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? "Meldet an…" : "Zum Feed"}
              {!pending && <span aria-hidden="true"> →</span>}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
