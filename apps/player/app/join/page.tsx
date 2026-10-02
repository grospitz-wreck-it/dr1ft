"use client";

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

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "Dieser Nutzername ist in dieser Klasse schon vergeben."
          : signUpError.message
      );
      setPending(false);
      return;
    }

    let session = signUpData.session;

    if (!session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.session) {
        setError(
          "Der Account konnte nicht automatisch angemeldet werden. Prüfe Nutzername, Passwort und Klassen-Code."
        );
        setPending(false);
        return;
      }

      session = signInData.session;
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
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ash">
                  Medienkompetenz
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ash shadow-sm sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.12)]" />
              Schülerzugang
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="player-surface overflow-hidden rounded-[30px] p-5 sm:p-8"
          >
            <div className="mb-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-100 via-violet-100 to-cyan-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                Zugang einrichten
              </div>

              <h1 className="font-display text-3xl font-bold tracking-[-0.04em] text-paper sm:text-4xl">
                Deiner Klasse beitreten.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-ash sm:text-[15px]">
                Du hast einen Klassen-Code von deiner Lehrkraft bekommen? Dann bist du hier
                richtig. Richte deinen DR1FT-Zugang ein und leg direkt los.
              </p>
            </div>

            <div className="mb-6 rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 font-display font-bold">
                  1
                </span>
                <div>
                  <p className="font-display font-semibold text-paper">Zuerst der Klassen-Code</p>
                  <p className="mt-1 text-xs leading-5 text-ash">
                    Er verbindet deinen Zugang mit dem richtigen Klassenraum.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">
                  Klassen-Code
                  <span className="font-mono normal-case tracking-[0.08em] text-ash/70">z. B. AB3CD9</span>
                </span>
                <input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="AB3CD9"
                  autoComplete="off"
                  required
                  className="touch-target w-full rounded-2xl border border-violet-200 bg-white px-4 py-4 font-mono text-lg font-medium uppercase tracking-[0.22em] text-paper shadow-[0_8px_24px_rgba(62,40,104,.06)] outline-none transition placeholder:text-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">
                  Anzeigename
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Wie sollen dich andere sehen?"
                  autoComplete="nickname"
                  required
                  className="touch-target w-full rounded-2xl border border-[#ddd8ec] bg-white/90 px-4 py-3.5 text-sm text-paper outline-none transition placeholder:text-ash/60 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
                <span className="mt-2 block text-xs text-ash">
                  Ein Klarname ist nicht nötig.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">
                  Nutzername
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Dein Login-Name"
                  autoComplete="username"
                  required
                  className="touch-target w-full rounded-2xl border border-[#ddd8ec] bg-white/90 px-4 py-3.5 text-sm text-paper outline-none transition placeholder:text-ash/60 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">
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
                  className="touch-target w-full rounded-2xl border border-[#ddd8ec] bg-white/90 px-4 py-3.5 text-sm text-paper outline-none transition placeholder:text-ash/60 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-5 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="tap-pulse touch-target social-glow mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 px-4 py-3.5 text-sm font-semibold text-white transition hover:scale-[1.01] hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-wait disabled:opacity-50 disabled:hover:scale-100"
            >
              {pending ? "Dein Zugang wird eingerichtet…" : "Klasse beitreten"}
              {!pending && <span aria-hidden="true">→</span>}
            </button>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#e5e1ef] pt-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <p className="text-xs text-ash">
                Schon dabei?
              </p>
              <a
                href="/login"
                className="text-xs font-semibold text-violet-700 underline decoration-violet-200 underline-offset-4 transition hover:text-fuchsia-600"
              >
                Zum Login →
              </a>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-ash/70">
            <span>Keine E-Mail-Adresse nötig</span>
            <span className="h-1 w-1 rounded-full bg-ash/30" />
            <span>Nur für deine Klasse</span>
            <span className="h-1 w-1 rounded-full bg-ash/30" />
            <span>Sicherer Zugang</span>
          </div>
        </section>
      </div>
    </main>
  );
}
