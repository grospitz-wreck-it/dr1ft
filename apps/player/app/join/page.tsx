"use client";

// apps/player/app/join/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";

function buildSyntheticEmail(username: string, accessCode: string): string {
  const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanCode = accessCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${cleanUser}.${cleanCode}@dr1ft.local`;
}

export default function JoinPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [accessCode, setAccessCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const email = buildSyntheticEmail(username, accessCode);

    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "Dieser Nutzername ist in dieser Klasse schon vergeben."
          : signUpError.message
      );
      setPending(false);
      return;
    }

    const { error: joinError } = await supabase.rpc("join_class_as_student", {
      p_access_code: accessCode,
      p_display_name: displayName,
    });

    if (joinError) {
      setError(joinError.message);
      setPending(false);
      return;
    }

    router.push("/feed");
  }

  return (
    <main className="min-h-screen bg-ink text-paper px-4 py-8 sm:py-12 safe-top safe-bottom">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <section className="w-full">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ash">
                DR1FT / Schülerzugang
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-growth" aria-hidden="true" />
                <span className="font-body text-xs text-ash">Klassenraum verbinden</span>
              </div>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-paper">DR1FT</span>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-card border border-ink-border bg-ink-light p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-7">
              <span className="marker-highlight font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
                Zugang einrichten
              </span>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-paper">
                Klasse beitreten
              </h1>
              <p className="mt-2 max-w-sm font-body text-sm leading-6 text-ash">
                Deine Lehrkraft hat dir einen Zugangscode gegeben. Damit verbindest du dich mit
                deinem Klassenraum.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ash">
                  Klassen-Code
                </span>
                <input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="z. B. AB3CD9"
                  autoComplete="off"
                  required
                  className="touch-target w-full rounded-lg border border-ink-border bg-ink px-3.5 py-3 font-mono text-sm uppercase tracking-[0.16em] text-paper outline-none transition placeholder:text-ash/70 focus:border-marker focus:ring-2 focus:ring-marker/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ash">
                  Anzeigename
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="z. B. Spitzname"
                  autoComplete="nickname"
                  required
                  className="touch-target w-full rounded-lg border border-ink-border bg-ink px-3.5 py-3 font-body text-sm text-paper outline-none transition placeholder:text-ash/70 focus:border-growth focus:ring-2 focus:ring-growth/20"
                />
                <span className="mt-1.5 block font-body text-xs text-ash">
                  Ein Klarname ist nicht nötig.
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ash">
                  Nutzername
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Dein Login-Name"
                  autoComplete="username"
                  required
                  className="touch-target w-full rounded-lg border border-ink-border bg-ink px-3.5 py-3 font-body text-sm text-paper outline-none transition placeholder:text-ash/70 focus:border-growth focus:ring-2 focus:ring-growth/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ash">
                  Passwort
                </span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Mindestens 6 Zeichen"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="touch-target w-full rounded-lg border border-ink-border bg-ink px-3.5 py-3 font-body text-sm text-paper outline-none transition placeholder:text-ash/70 focus:border-growth focus:ring-2 focus:ring-growth/20"
                />
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-3.5 py-3 font-body text-sm leading-5 text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="tap-pulse touch-target mt-6 w-full rounded-lg bg-marker px-4 py-3 font-body text-sm font-semibold text-ink transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-marker/50 disabled:cursor-wait disabled:opacity-50"
            >
              {pending ? "Klasse wird verbunden…" : "Klasse beitreten"}
            </button>

            <div className="mt-5 border-t border-ink-border pt-4 text-center">
              <p className="font-body text-xs text-ash">
                Schon dabei?{" "}
                <a
                  href="/login"
                  className="font-medium text-paper underline decoration-ink-border underline-offset-4 transition hover:text-marker"
                >
                  Zum Login
                </a>
              </p>
            </div>
          </form>

          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ash/70">
            Sicherer Klassen-Zugang · Keine E-Mail-Adresse erforderlich
          </p>
        </section>
      </div>
    </main>
  );
}
