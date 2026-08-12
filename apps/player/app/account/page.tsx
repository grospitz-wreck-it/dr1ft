"use client";
// apps/player/app/account/page.tsx
// Selbst-Service-Passwortänderung — wichtig direkt nach einem
// lehrkraft-ausgelösten Reset (siehe apps/admin ResetPasswordButton),
// damit das Temp-Passwort nicht dauerhaft aktiv bleibt.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";

export default function AccountPage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Mindestens 6 Zeichen.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-ink-light border border-ink-border rounded-card p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="font-display text-2xl text-paper">Passwort ändern</h1>

        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Neues Passwort"
          minLength={6}
          required
          className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Neues Passwort wiederholen"
          minLength={6}
          required
          className="w-full rounded-lg px-3 py-2 text-sm bg-paper text-ink"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-growth">Gespeichert!</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-marker text-ink font-body font-medium rounded-lg py-3 text-sm disabled:opacity-50"
        >
          {pending ? "Speichert…" : "Speichern"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/feed")}
          className="w-full text-ash text-xs underline"
        >
          Zurück zum Feed
        </button>
      </form>
    </main>
  );
}
