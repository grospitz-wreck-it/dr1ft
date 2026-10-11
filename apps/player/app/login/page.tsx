"use client";
// apps/player/app/login/page.tsx

import { useState } from "react";
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

  const [accessCode, setAccessCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  return (
    <main className="dr1ft-login-screen relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="dr1ft-login-backdrop absolute inset-0 -z-20" aria-hidden="true" />
      <div className="dr1ft-login-overlay absolute inset-0 -z-10" aria-hidden="true" />

      <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.8fr)] lg:gap-14 xl:gap-20">
        <section className="mx-auto flex w-full max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <img
            src="/branding/drift-logo-transparent-horizontal.webp"
            alt="DR1FT"
            className="dr1ft-login-logo mb-5 w-36 object-contain drop-shadow-[0_8px_28px_rgba(124,58,237,0.22)] sm:mb-7 sm:w-44 lg:mx-0 lg:w-52"
            fetchPriority="high"
          />
          <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.34em] text-cyan-200 sm:text-xs">
            Dein Space. Deine Stimme.
          </p>
          <h1 className="max-w-lg font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Sei dabei. <span className="dr1ft-login-gradient-text">Bleib du.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
            Tausche dich aus, entdecke neue Perspektiven und gestalte deinen digitalen Alltag mit.
          </p>
          <div className="mt-6 hidden items-center gap-2 sm:flex lg:mt-8">
            <span className="h-1.5 w-8 rounded-full bg-fuchsia-400" />
            <span className="h-1.5 w-5 rounded-full bg-violet-400" />
            <span className="h-1.5 w-3 rounded-full bg-cyan-300" />
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <form
            onSubmit={handleSubmit}
            className="dr1ft-login-card space-y-5 rounded-[1.75rem] p-5 sm:p-7 md:p-8"
          >
            <div className="mb-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200 sm:text-xs">
                Willkommen zurück
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Einloggen
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Melde dich mit deinem Klassencode und deinem Konto an.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-white/80 sm:text-sm">Klassenzugangscode</span>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="z. B. UV4JZJ"
                autoCapitalize="characters"
                autoComplete="off"
                required
                className="dr1ft-login-input w-full rounded-xl px-4 py-3.5 text-base outline-none transition sm:py-4"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-white/80 sm:text-sm">Nutzername</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Dein Nutzername"
                autoComplete="username"
                required
                className="dr1ft-login-input w-full rounded-xl px-4 py-3.5 text-base outline-none transition sm:py-4"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-white/80 sm:text-sm">Passwort</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Dein Passwort"
                autoComplete="current-password"
                required
                className="dr1ft-login-input w-full rounded-xl px-4 py-3.5 text-base outline-none transition sm:py-4"
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
              className="dr1ft-login-submit flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white transition duration-200 disabled:cursor-wait disabled:opacity-60 sm:min-h-14 sm:text-base"
            >
              {pending ? "Du wirst angemeldet …" : "In deinen Space"}
              {!pending && <span aria-hidden="true">→</span>}
            </button>

            <p className="border-t border-white/10 pt-4 text-center text-sm text-white/60">
              Noch nicht dabei?{" "}
              <a href="/join" className="font-semibold text-cyan-200 underline decoration-cyan-200/40 underline-offset-4 transition hover:text-white">
                Klasse beitreten
              </a>
            </p>
          </form>
          <p className="mt-4 text-center text-[11px] tracking-wide text-white/45">
            Ein sicherer Raum für Austausch und neue Perspektiven.
          </p>
        </section>
      </div>
      <style jsx>{`
        .dr1ft-login-screen {
          background: #09091d;
          isolation: isolate;
        }
        .dr1ft-login-backdrop {
          background-image: url("/branding/dr1ft-login-background.webp");
          background-size: cover;
          background-position: center;
          transform: scale(1.015);
        }
        .dr1ft-login-overlay {
          background:
            linear-gradient(90deg, rgba(7, 7, 25, .76) 0%, rgba(7, 7, 25, .48) 46%, rgba(7, 7, 25, .68) 100%),
            linear-gradient(0deg, rgba(8, 7, 26, .48), rgba(8, 7, 26, .08));
        }
        .dr1ft-login-logo {
          max-height: 11rem;
          filter: drop-shadow(0 8px 28px rgba(124, 58, 237, .16));
        }
        .dr1ft-login-gradient-text {
          background: linear-gradient(100deg, #f472d0 0%, #a78bfa 48%, #67e8f9 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .dr1ft-login-card {
          background: linear-gradient(145deg, rgba(15, 14, 39, .88), rgba(22, 15, 43, .82));
          border: 1px solid rgba(196, 181, 253, .25);
          box-shadow: 0 24px 80px rgba(3, 3, 18, .4), inset 0 1px 0 rgba(255, 255, 255, .07);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .dr1ft-login-input {
          color: #f8f7ff;
          background: rgba(255, 255, 255, .07);
          border: 1px solid rgba(196, 181, 253, .22);
          min-height: 3rem;
        }
        .dr1ft-login-input::placeholder { color: rgba(226, 222, 242, .42); }
        .dr1ft-login-input:focus {
          border-color: #67e8f9;
          box-shadow: 0 0 0 3px rgba(103, 232, 249, .13);
          background: rgba(255, 255, 255, .1);
        }
        .dr1ft-login-submit {
          background: linear-gradient(100deg, #9333ea 0%, #7c3aed 48%, #0891b2 100%);
          box-shadow: 0 8px 28px rgba(124, 58, 237, .25);
        }
        .dr1ft-login-submit:hover:not(:disabled) {
          filter: brightness(1.12);
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(124, 58, 237, .32);
        }
        @media (min-width: 1024px) and (max-height: 760px) {
          .dr1ft-login-screen { padding-top: 1.25rem; padding-bottom: 1.25rem; }
          .dr1ft-login-logo { width: 8rem; max-height: 8rem; margin-bottom: 1rem; }
        }
        @media (max-width: 639px) {
          .dr1ft-login-overlay {
            background: linear-gradient(180deg, rgba(7, 7, 25, .52), rgba(7, 7, 25, .78));
          }
        }
      `}</style>
    </main>
  );
}
