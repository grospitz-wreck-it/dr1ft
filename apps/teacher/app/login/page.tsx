"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowserClient() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

export default function LoginPage() {
  const supabase = supabaseBrowserClient(); const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError(null); setPending(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) { setError(error.message); setPending(false); return; } router.push("/classes"); router.refresh(); }
  return <main className="min-h-screen bg-canvas grid place-items-center px-4"><form onSubmit={handleSubmit} className="w-full max-w-md bg-white border border-border rounded-3xl p-7 shadow-xl shadow-slate-200/50 space-y-5"><div><p className="text-xs uppercase tracking-[0.18em] text-indigo-600 font-semibold">DR1FT Teacher</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-2">Willkommen zurück</h1><p className="text-sm text-slate-500 mt-2">Melde dich mit deiner von der Schule bereitgestellten E-Mail-Adresse an.</p></div><label className="block"><span className="text-xs font-medium text-slate-600">Schul-E-Mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vorname.nachname@schule.de" required className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" /></label><label className="block"><span className="text-xs font-medium text-slate-600">Passwort</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" required className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm" /></label>{error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}<button type="submit" disabled={pending} className="w-full rounded-xl bg-accent hover:bg-accent-hover text-white py-2.5 text-sm font-medium disabled:opacity-50">{pending ? "Meldet an …" : "Einloggen"}</button><a href="/reset-password" className="block text-center text-sm text-slate-500 hover:text-slate-900">Passwort vergessen?</a><p className="text-xs text-slate-400 text-center pt-2 border-t border-border">Teacher-Accounts werden von der zuständigen Schul- oder DR1FT-Administration angelegt.</p></form></main>;
}
