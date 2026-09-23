"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ResetPasswordPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    const prepare = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setError("Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.");
      }

      setReady(true);
    };

    prepare();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setError(null);
        setReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setPending(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    await supabase.auth.signOut();
    setSaved(true);
    setPending(false);
  }

  if (saved) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="bg-white border rounded-lg p-6 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold">Passwort geändert</h1>
          <p className="text-sm text-slate-600">
            Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt mit
            dem neuen Passwort anmelden.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full bg-black text-white rounded px-4 py-2 text-sm"
          >
            Zum Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="bg-white border rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Neues Passwort</h1>

        {!ready ? (
          <p className="text-sm text-slate-500">Reset-Link wird geprüft…</p>
        ) : error && !password ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <Link
              href="/forgot-password"
              className="block text-center text-sm text-slate-600 hover:underline"
            >
              Neuen Reset-Link anfordern
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Vergib ein neues Passwort für deinen Redaktion-Zugang.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Neues Passwort"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border rounded px-3 py-2 text-sm"
            />

            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Passwort wiederholen"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border rounded px-3 py-2 text-sm"
            />

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {pending ? "Wird gespeichert…" : "Passwort speichern"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
