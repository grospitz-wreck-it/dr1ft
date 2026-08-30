"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function client() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

export default function ResetPasswordPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setPending(true); setError(null); const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/update-password` }); if (error) setError(error.message); else setSent(true); setPending(false); }
  return <main className="min-h-screen bg-canvas grid place-items-center px-4"><form onSubmit={submit} className="w-full max-w-md bg-white border border-border rounded-3xl p-7 shadow-sm space-y-5"><div><p className="text-xs uppercase tracking-[0.18em] text-indigo-600 font-semibold">DR1FT Teacher</p><h1 className="text-2xl font-semibold text-slate-900 mt-2">Passwort zurücksetzen</h1><p className="text-sm text-slate-500 mt-2">Wir schicken dir einen sicheren Link an deine hinterlegte Schul-E-Mail-Adresse.</p></div>{sent ? <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">Falls ein Account zu dieser Adresse gehört, wurde eine E-Mail zum Zurücksetzen versendet.</div> : <><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Schul-E-Mail" className="w-full rounded-xl border border-border px-3 py-2.5 text-sm" />{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={pending} className="w-full rounded-xl bg-accent text-white py-2.5 text-sm font-medium disabled:opacity-50">{pending ? "Wird gesendet …" : "Reset-Link senden"}</button></>}<a href="/login" className="block text-center text-sm text-slate-500 hover:text-slate-900">← Zurück zum Login</a></form></main>;
}
