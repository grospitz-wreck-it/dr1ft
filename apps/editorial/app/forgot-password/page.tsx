"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ForgotPasswordPage() {
  const supabase = supabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setPending(false);
      return;
    }

    setSent(true);
    setPending(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="bg-white border rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Passwort zurücksetzen</h1>

        {sent ? (
          <>
            <p className="text-sm text-slate-600">
              Wenn für diese E-Mail-Adresse ein Redaktion-Zugang existiert,
              wurde eine E-Mail zum Zurücksetzen des Passworts verschickt.
            </p>
            <p className="text-xs text-slate-500">
              Prüfe auch den Spam-Ordner.
            </p>
            <Link
              href="/login"
              className="block text-center text-sm text-slate-700 hover:underline"
            >
              Zurück zum Login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Gib deine E-Mail-Adresse ein. Du erhältst einen Link, mit dem du
              ein neues Passwort setzen kannst.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail"
              required
              autoComplete="email"
              className="w-full border rounded px-3 py-2 text-sm"
            />

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {pending ? "Wird verschickt…" : "Reset-E-Mail senden"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-slate-500 hover:underline"
            >
              Zurück zum Login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
