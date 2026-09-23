"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function client() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

export default function UpdatePasswordPage() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setError(null); if (password.length < 8) return setError("Das Passwort muss mindestens 8 Zeichen lang sein."); if (password !== confirm) return setError("Die Passwörter stimmen nicht überein."); setPending(true); const { error } = await client().auth.updateUser({ password }); if (error) setError(error.message); else router.push("/classes"); setPending(false); }
  return <main className="min-h-screen bg-canvas grid place-items-center px-4"><form onSubmit={submit} className="w-full max-w-md bg-white border border-border rounded-3xl p-7 shadow-sm space-y-5"><div><p className="text-xs uppercase tracking-[0.18em] text-indigo-600 font-semibold">DR1FT Teacher</p><h1 className="text-2xl font-semibold text-slate-900 mt-2">Neues Passwort</h1><p className="text-sm text-slate-500 mt-2">Lege ein neues Passwort für deinen Teacher-Account fest.</p></div><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Neues Passwort" className="w-full rounded-xl border border-border px-3 py-2.5 text-sm" /><input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Passwort wiederholen" className="w-full rounded-xl border border-border px-3 py-2.5 text-sm" />{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={pending} className="w-full rounded-xl bg-accent text-white py-2.5 text-sm font-medium disabled:opacity-50">{pending ? "Speichert …" : "Passwort speichern"}</button></form></main>;
}
