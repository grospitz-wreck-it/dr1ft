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
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const email = buildSyntheticEmail(cleanUsername, accessCode);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message.includes("already registered") ? "Dieser Nutzername ist in dieser Klasse schon vergeben." : signUpError.message);
      setPending(false);
      return;
    }

    const { error: joinError } = await supabase.rpc("join_class_as_student", { p_access_code: accessCode, p_display_name: displayName });
    if (joinError) {
      setError(joinError.message);
      setPending(false);
      return;
    }

    const newUserId = signUpData.user?.id;
    if (newUserId) {
      await supabase.from("user_profiles").upsert({ id: newUserId, display_name: displayName.trim(), username: cleanUsername, avatar_seed: newUserId });
    }
    router.push("/feed");
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-ink-light border border-ink-border rounded-card p-6 w-full max-w-sm space-y-4">
        <h1 className="font-display text-2xl text-paper">Klasse beitreten</h1>
        <p className="font-body text-sm text-ash">Deine Lehrkraft hat dir einen Zugangscode gegeben.</p>
        <input value={accessCode} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} placeholder="Zugangscode (z.B. AB3CD9)" required className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink" />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Anzeigename (Spitzname genügt)" required className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nutzername" required className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Passwort (mind. 6 Zeichen)" minLength={6} required className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink" />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={pending} className="w-full bg-marker text-ink font-body font-medium rounded-lg py-3 text-sm disabled:opacity-50">{pending ? "Tritt bei…" : "Beitreten"}</button>
        <p className="text-xs text-ash">Schon dabei? <a href="/login" className="underline">Zum Login</a></p>
      </form>
    </main>
  );
}
