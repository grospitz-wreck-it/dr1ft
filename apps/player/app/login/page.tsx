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
    return () => { active = false; };
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
    <main className="dr1ft-login-screen relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="dr1ft-login-backdrop absolute inset-0 -z-20" aria-hidden="true" />
      <div className="dr1ft-login-overlay absolute inset-0 -z-10" aria-hidden="true" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center justify-center gap-5 sm:gap-6">
        <header className="flex w-full flex-col items-center text-center">
          <div className="dr1ft-login-logo-wrap mb-3 sm:mb-4" role="img" aria-label="DR1FT">
            <img
              src="/branding/drift-logo-transparent-horizontal-white.webp"
              alt="DR1FT"
              className="dr1ft-login-logo"
              fetchPriority="high"
            />
          </div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-white/80 sm:text-xs">
            Dein Space. Deine Stimme.
          </p>
        </header>

        <section className="mx-auto w-full max-w-[25rem]">
          <form
            onSubmit={handleSubmit}
            className="dr1ft-login-card space-y-3.5 rounded-[1.5rem] p-4 sm:space-y-4 sm:p-5 md:p-6"
          >
            <div className="mb-1 text-center">
              <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                Willkommen bei DR1FT
              </h1>
              <p className="mt-1.5 text-xs leading-5 text-white/65 sm:text-sm">
                Melde dich mit deinem Klassencode an.
              </p>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/85">Klassencode</span>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="z. B. UV4JZJ"
                autoCapitalize="characters"
                autoComplete="off"
                required
                className="dr1ft-login-input w-full rounded-xl px-4 py-3 text-base outline-none transition sm:py-3.5"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/85">Name</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Dein Nutzername"
                autoComplete="username"
                required
                className="dr1ft-login-input w-full rounded-xl px-4 py-3 text-base outline-none transition sm:py-3.5"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/85">Passwort</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Dein Passwort"
                autoComplete="current-password"
                required
                className="dr1ft-login-input w-full rounded-xl px-4 py-3 text-base outline-none transition sm:py-3.5"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="dr1ft-login-submit flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition duration-200 disabled:cursor-wait disabled:opacity-60 sm:min-h-13 sm:text-base"
            >
              {pending ? "Du wirst angemeldet …" : "Anmelden"}
              {!pending && <span aria-hidden="true">→</span>}
            </button>
            <p className="pt-1 text-center text-[11px] leading-5 text-white/50">Noch keinen Zugang? Frage deine Lehrkraft nach dem Klassencode.</p>
          </form>
        </section>
      </div>
      <style jsx>{`
        .dr1ft-login-screen {
          background: #08091e;
          isolation: isolate;
          padding-top: max(1.25rem, env(safe-area-inset-top));
          padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
        }
        .dr1ft-login-backdrop {
          background-image: radial-gradient(ellipse at 18% 12%, rgba(124, 58, 237, .40), transparent 42%), radial-gradient(ellipse at 84% 78%, rgba(8, 145, 178, .34), transparent 40%), linear-gradient(125deg, #08091e 0%, #17102f 48%, #081c2d 100%);
          background-size: 130% 100%;
          background-position: 0% 50%;
          transform: scale(1.06);
          animation: dr1ft-background-drift 38s ease-in-out infinite alternate;
          will-change: transform;
        }
        .dr1ft-login-overlay {
          background:
            radial-gradient(ellipse at 50% 38%, rgba(10, 8, 32, .16) 0%, rgba(10, 8, 32, .34) 58%, rgba(7, 7, 25, .58) 100%),
            linear-gradient(180deg, rgba(7, 7, 25, .16), rgba(7, 7, 25, .42));
        }
        .dr1ft-login-logo-wrap {
          position: relative;
          width: min(74vw, 27.9rem);
          aspect-ratio: 3 / 1;
          filter: drop-shadow(0 8px 30px rgba(124, 58, 237, .28));
        }
        .dr1ft-login-logo {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .dr1ft-login-card {
          background: linear-gradient(145deg, rgba(14, 12, 37, .88), rgba(24, 13, 45, .84));
          border: 1px solid rgba(196, 181, 253, .27);
          box-shadow: 0 22px 70px rgba(3, 3, 18, .34), inset 0 1px 0 rgba(255, 255, 255, .09);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .dr1ft-login-input {
          color: #f8f7ff;
          background: rgba(255, 255, 255, .075);
          border: 1px solid rgba(196, 181, 253, .25);
          min-height: 3rem;
        }
        .dr1ft-login-input::placeholder { color: rgba(226, 222, 242, .44); }
        .dr1ft-login-input:focus {
          border-color: #67e8f9;
          box-shadow: 0 0 0 3px rgba(103, 232, 249, .14);
          background: rgba(255, 255, 255, .105);
        }
        .dr1ft-login-submit {
          background: linear-gradient(100deg, #c026d3 0%, #7c3aed 52%, #0891b2 100%);
          box-shadow: 0 8px 28px rgba(124, 58, 237, .28);
        }
        .dr1ft-login-submit:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(124, 58, 237, .34);
        }
        @keyframes dr1ft-background-drift {
          from { transform: scale(1.06) translate3d(-1.1%, 0, 0); background-position: 0% 50%; }
          to { transform: scale(1.06) translate3d(1.1%, 0, 0); background-position: 100% 50%; }
        }
        @media (orientation: landscape) and (max-height: 700px) {
          .dr1ft-login-screen { padding-top: .75rem; padding-bottom: .75rem; }
          .dr1ft-login-logo-wrap { width: min(70vw, 21rem); margin-bottom: .4rem; }
        }
        @media (max-width: 639px) {
          .dr1ft-login-overlay {
            background: linear-gradient(180deg, rgba(7, 7, 25, .18), rgba(7, 7, 25, .5));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dr1ft-login-backdrop { animation: none; transform: scale(1.02); }
        }
      `}</style>
    </main>
  );
}
