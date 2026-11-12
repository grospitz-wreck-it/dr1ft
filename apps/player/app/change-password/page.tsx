"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function getSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Dein neues Passwort muss mindestens 8 Zeichen lang sein."); return; }
    if (password !== confirmPassword) { setError("Die beiden Passwörter stimmen nicht überein."); return; }
    setPending(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/complete-student-password-change`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Passwort konnte nicht geändert werden.");
      await supabase.auth.refreshSession();
      router.replace("/feed");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Passwort konnte nicht geändert werden.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-violet-200/20 bg-slate-900 p-7 text-white shadow-2xl">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-violet-300">DR1FT · erster Login</p>
          <h1 className="mt-2 text-2xl font-bold">Dein eigenes Passwort</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Dein Startpasswort ist nur einmal gültig. Lege jetzt ein persönliches Passwort fest, das nur du kennst.</p></div>
        <label className="block text-sm font-medium">Neues Passwort
          <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300" />
        </label>
        <label className="block text-sm font-medium">Neues Passwort wiederholen
          <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300" />
        </label>
        {error && <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50">{pending ? "Wird gespeichert …" : "Passwort festlegen und weiter"}</button>
      </form>
    </main>
  );
}
