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
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-lg p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold">Login</h1>

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
          placeholder="Passwort"
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Meldet an…" : "Einloggen"}
        </button>

        <p className="text-xs text-gray-500">
          Neu hier? <a href="/signup" className="underline">Account erstellen</a>
        </p>
      </form>
    </main>
  );
}
