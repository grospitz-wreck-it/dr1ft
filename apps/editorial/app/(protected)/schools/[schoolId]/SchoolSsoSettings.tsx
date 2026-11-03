"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";

type Config = { configured: boolean; issuerUrl: string; clientId: string; enabled: boolean; secretConfigured: boolean; updatedAt: string | null };

export function SchoolSsoSettings({ schoolId }: { schoolId: string }) {
  const [config, setConfig] = useState<Config>({ configured: false, issuerUrl: "", clientId: "", enabled: false, secretConfigured: false, updatedAt: null });
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/sso`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Einstellungen konnten nicht geladen werden.");
      setConfig((current) => ({ ...current, ...data, issuerUrl: data.issuerUrl || current.issuerUrl }));
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Laden fehlgeschlagen." }); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [schoolId]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage(null);
    try {
      const response = await fetch(`/api/schools/${schoolId}/sso`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerUrl: config.issuerUrl, clientId: config.clientId, clientSecret, enabled: config.enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      setClientSecret(""); await load();
      setMessage({ type: "success", text: "IServ-Verbindung sicher gespeichert. Der Login ist noch nicht aktiviert, bis die OIDC-Anbindung vollständig eingerichtet und getestet wurde." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Speichern fehlgeschlagen." }); }
    finally { setPending(false); }
  }

  async function remove() {
    if (!window.confirm("IServ-Verbindung und gespeichertes Client-Secret wirklich entfernen?")) return;
    setPending(true); setMessage(null);
    try {
      const response = await fetch(`/api/schools/${schoolId}/sso`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Entfernen fehlgeschlagen.");
      setConfig({ configured: false, issuerUrl: "", clientId: "", enabled: false, secretConfigured: false, updatedAt: null });
      setClientSecret("");
      setMessage({ type: "success", text: "IServ-Verbindung entfernt." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Entfernen fehlgeschlagen." }); }
    finally { setPending(false); }
  }

  return (
    <section className="mt-6 max-w-4xl space-y-5">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Externe Anmeldung</p><h2 className="mt-1 text-xl font-semibold text-slate-950">IServ verbinden</h2><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Hinterlege die Zugangsdaten deiner IServ-Instanz. Das Client-Secret wird vor der Speicherung serverseitig verschlüsselt und nie wieder im Klartext angezeigt.</p></div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${config.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{loading ? "Lädt …" : config.configured ? "Zugangsdaten hinterlegt" : "Noch nicht eingerichtet"}</span>
        </div>

        {message && <div role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message.text}</div>}

        {loading ? <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Einstellungen werden geladen …</div> : (
          <form onSubmit={save} className="mt-7 space-y-5">
            <label className="block text-sm font-medium text-slate-700">IServ-Adresse
              <input required type="url" value={config.issuerUrl} onChange={(e) => setConfig({ ...config, issuerUrl: e.target.value })} placeholder="https://schule.mein-iserv.de/iserv/" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50" />
              <span className="mt-1 block text-xs font-normal text-slate-400">Die Basisadresse der IServ-Instanz, nicht die Login- oder Callback-URL.</span>
            </label>
            <label className="block text-sm font-medium text-slate-700">Client-ID
              <input required value={config.clientId} onChange={(e) => setConfig({ ...config, clientId: e.target.value })} placeholder="Client-ID aus der IServ-Anwendungsregistrierung" autoComplete="off" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Client-Secret
              <div className="relative mt-1.5"><input value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} type={showSecret ? "text" : "password"} autoComplete="new-password" placeholder={config.secretConfigured ? "Secret hinterlegt – leer lassen, um es beizubehalten" : "Client-Secret einfügen"} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 pr-12 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50" /><button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showSecret ? "Secret verbergen" : "Secret anzeigen"}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              <span className="mt-1 block text-xs font-normal text-slate-400">{config.secretConfigured ? "Ein Secret ist sicher gespeichert. Ein neues Secret ersetzt das bisherige." : "Wird verschlüsselt gespeichert und nicht wieder ausgegeben."}</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" /><span><span className="block font-medium">Verbindung für die spätere Anmeldung freigeben</span><span className="mt-0.5 block text-xs text-slate-500">Aktiviert noch keinen Login, solange die technische OIDC-Anbindung nicht live geschaltet ist.</span></span></label>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-4 w-4" /> Verschlüsselte Speicherung · schulbezogene Berechtigungen</div>
              <div className="flex gap-2">
                {config.configured && <button type="button" disabled={pending} onClick={remove} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3.5 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Entfernen</button>}
                <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{pending ? "Speichert …" : "Zugangsdaten speichern"}</button>
              </div>
            </div>
          </form>
        )}
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-sm leading-6 text-blue-900"><p className="font-semibold">Was wird noch benötigt?</p><p className="mt-1">Die Schule registriert DR1FT einmalig in IServ unter Verwaltung → System → Single-Sign-On. Anschließend werden Client-ID und Client-Secret hier hinterlegt. Die genaue DR1FT-Weiterleitungsadresse folgt mit der vollständigen OIDC-Login-Implementierung.</p></div>
    </section>
  );
}
