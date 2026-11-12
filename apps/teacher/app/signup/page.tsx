"use client";
// apps/admin/app/signup/page.tsx
// Lehrkräfte legen selbst einen Account an — Redaktions-Rechte
// (platform_staff) werden davon getrennt vergeben (siehe /editorial/staff),
// ein Signup hier macht jemanden NICHT automatisch zur Redaktion.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function SignupPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmHint, setConfirmHint] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    // Wenn E-Mail-Bestätigung in den Supabase-Auth-Einstellungen aktiv ist,
    // gibt es hier noch keine Session -> Hinweis statt Redirect.
    if (!data.session) {
      setConfirmHint(true);
      setPending(false);
      return;
    }

    router.push("/classes");
  }

  if (confirmHint) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <p className="text-sm text-gray-700 max-w-sm text-center">
          Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir
          geschickt haben, und logge dich danach ein.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-lg p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold">Account erstellen</h1>
        <p className="text-xs text-gray-500">Für Lehrkräfte und Redaktion.</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail"
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort (mind. 6 Zeichen)"
          minLength={6}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Erstellt…" : "Account erstellen"}
        </button>

        <p className="text-xs text-gray-500">
          Schon dabei? <a href="/login" className="underline">Einloggen</a>
        </p>
      </form>
    </main>
  );
}
