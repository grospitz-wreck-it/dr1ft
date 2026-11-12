"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Mail, MessageSquareText } from "lucide-react";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

export default function MitmachenPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Die Nachricht konnte nicht gesendet werden.");
      setStatus({ type: "success", text: "Danke für deine Nachricht! Wir melden uns so bald wie möglich." });
      setName("");
      setEmail("");
      setMessage("");
      setWebsite("");
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Das hat leider nicht geklappt. Bitte versuche es später erneut.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="relative isolate min-h-[calc(100vh-76px)] overflow-hidden bg-[#080D1D] px-6 py-16 text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,.13),transparent_32rem),radial-gradient(circle_at_90%_45%,rgba(217,70,239,.12),transparent_30rem)]" />
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <section className="pt-2">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.16em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Gemeinsam Medienkompetenz stärken
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Mitmachen bei <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">DR1FT.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Du möchtest DR1FT an deiner Schule einsetzen, mit uns zusammenarbeiten oder mehr über das Projekt erfahren? Schreib uns. Wir freuen uns, von dir zu hören.
            </p>
            <div className="mt-9 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <div className="rounded-xl bg-cyan-300/10 p-3 text-cyan-200"><Mail className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold text-white">Direkter Kontakt</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">Deine Anfrage landet bei unserem Team. Wir melden uns persönlich zurück.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
            <div className="mb-7">
              <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20 p-3 text-cyan-200"><MessageSquareText className="h-5 w-5" /></div>
              <h2 className="font-display text-2xl font-bold">Schreib uns</h2>
              <p className="mt-2 text-sm text-slate-400">Fülle die Felder aus – wir kümmern uns um den Rest.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoComplete="name" placeholder="Wie dürfen wir dich nennen?" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">E-Mail-Adresse</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="du@beispiel.de" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Deine Nachricht</span>
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={10} maxLength={5000} rows={6} placeholder="Worum geht es bei deiner Anfrage?" className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10" />
                <span className="mt-1.5 block text-right text-xs text-slate-500">{message.length}/5000</span>
              </label>
              <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                <label>Bitte leer lassen<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
              </div>
              {status && (
                <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-rose-300/20 bg-rose-300/10 text-rose-200"}`}>
                  {status.type === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{status.text}</span>
                </div>
              )}
              <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-3.5 font-semibold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
                {pending ? "Nachricht wird gesendet …" : "Anfrage senden"} {!pending && <ArrowRight className="h-4 w-4" />}
              </button>
              <p className="text-xs leading-relaxed text-slate-500">Wir verwenden deine Angaben ausschließlich, um deine Anfrage zu beantworten.</p>
            </form>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
