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
    <main className="min-h-screen bg-ink flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-ink-light border border-ink-border rounded-card p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="font-display text-2xl text-paper">Login</h1>

        <input
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
          placeholder="Zugangscode deiner Klasse"
          required
          className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nutzername"
          required
          className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Passwort"
          required
          className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-marker text-ink font-body font-medium rounded-lg py-3 text-sm disabled:opacity-50"
        >
          {pending ? "Meldet an…" : "Einloggen"}
        </button>

        <p className="text-xs text-ash">
          Noch nicht dabei?{" "}
          <a href="/join" className="underline">
            Klasse beitreten
          </a>
        </p>
      </form>
    </main>
  );
}
