"use client";

import { useState } from "react";

export function AddStudentForm({
  classId,
}: {
  classId: string;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setTempPassword(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-student-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getAccessToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ classId, displayName, username, password: password || undefined }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Schüler-Account konnte nicht angelegt werden");
        return;
      }

      setTempPassword(data.tempPassword);
      setDisplayName("");
      setUsername("");
      setPassword("");
      window.location.reload();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen");
    } finally {
      setPending(false);
    }
  }

  async function getAccessToken(): Promise<string> {
    const { createBrowserClient } = await import("@supabase/ssr");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-md"
      >
        + Schüler:in hinzufügen
      </button>
    );
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">Schüler:in hinzufügen</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 underline">
          Schließen
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Anzeigename, z.B. Max"
          required
          maxLength={80}
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nutzername, z.B. max23"
          required
          minLength={2}
          maxLength={32}
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Passwort (optional, mind. 6 Zeichen)"
          minLength={6}
          className="border border-border rounded-md px-3 py-2 text-sm sm:col-span-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md disabled:opacity-50 sm:col-span-2"
        >
          {pending ? "Wird angelegt…" : "Schüler:in anlegen"}
        </button>
      </form>

      {tempPassword && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Login-Daten notieren:</strong> Das Passwort wird hier einmalig angezeigt.
          <div className="mt-1 font-mono font-semibold">{tempPassword}</div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
