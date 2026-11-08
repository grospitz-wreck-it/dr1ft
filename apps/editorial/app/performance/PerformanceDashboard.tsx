"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Database, Gauge, LockKeyhole, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";

export type ProbeResult = { name: string; status: "ok" | "warning" | "error" | "unconfigured"; latencyMs: number | null; detail: string };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}
function StatusIcon({ status }: { status: ProbeResult["status"] }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "warning" || status === "unconfigured") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-rose-600" />;
}
function StatusPill({ status }: { status: ProbeResult["status"] }) {
  const styles = { ok: "bg-emerald-50 text-emerald-700 ring-emerald-200", warning: "bg-amber-50 text-amber-700 ring-amber-200", error: "bg-rose-50 text-rose-700 ring-rose-200", unconfigured: "bg-slate-100 text-slate-600 ring-slate-200" };
  const labels = { ok: "Erreichbar", warning: "Prüfen", error: "Fehler", unconfigured: "Nicht angebunden" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[status]}`}>{labels[status]}</span>;
}

export function PerformanceDashboard({ probes, checkedAt }: { probes: ProbeResult[]; checkedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"overview" | "errors" | "security">("overview");
  const errors = probes.filter((item) => item.status === "error").length;
  const configured = probes.filter((item) => item.status !== "unconfigured").length;
  const measured = probes.filter((item) => item.latencyMs !== null);
  const averageLatency = measured.length ? measured.reduce((sum, item) => sum + (item.latencyMs ?? 0), 0) / measured.length : null;

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-violet-600">DR1FT / SYSTEMKONTROLLE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Performance & Security</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Technischer Zustand, Antwortzeiten, Fehler und sicherheitsrelevante Auffälligkeiten der DR1FT-Plattform.</p></div>
      <button type="button" onClick={() => startTransition(() => router.refresh())} disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />{pending ? "Prüfe …" : "Jetzt prüfen"}</button>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4 text-violet-600" />Live-Prüfung beim Seitenaufruf · keine historischen Messwerte</div><p className="text-xs text-slate-400">Letzte Prüfung: {formatTime(checkedAt)}</p></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Gauge className="h-4 w-4" />} label="Geprüfte Systeme" value={`${configured}/4`} detail="Aktive Health Checks" />
      <Metric icon={<AlertTriangle className="h-4 w-4" />} label="Erreichbarkeitsfehler" value={String(errors)} detail="In dieser Prüfung" />
      <Metric icon={<Clock3 className="h-4 w-4" />} label="Ø Antwortzeit" value={averageLatency === null ? "–" : `${Math.round(averageLatency)} ms`} detail="Momentaufnahme der Probes" />
      <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Security-Monitoring" value="Vorbereitung" detail="Audit-Log-Anbindung fehlt noch" />
    </section>
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5" aria-label="Performance-Bereiche">
      {([{ id: "overview", label: "Systemübersicht", icon: Gauge }, { id: "errors", label: "Fehler & Ereignisse", icon: AlertTriangle }, { id: "security", label: "Security", icon: LockKeyhole }] as const).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}
    </nav>
    {tab === "overview" && <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-base font-semibold text-slate-900">Systemverfügbarkeit</h2><p className="mt-1 text-xs text-slate-500">Erreichbarkeit der Apps und lesender Datenbankzugriff.</p></div><div className="divide-y divide-slate-100">{probes.map((probe) => <div key={probe.name} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="flex min-w-0 items-center gap-3"><StatusIcon status={probe.status} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{probe.name}</p><p className="mt-0.5 text-xs text-slate-400">{probe.detail}</p></div></div><div className="text-sm tabular-nums text-slate-600">{probe.latencyMs === null ? "–" : `${probe.latencyMs} ms`}</div><StatusPill status={probe.status} /></div>)}</div></div>
      <div className="grid gap-4 lg:grid-cols-2"><InfoCard icon={<Database className="h-4 w-4" />} title="Datenbank & Realtime" description="Der Datenbank-Check misst einen einfachen lesenden Zugriff. Realtime-Verbindungsstatus und Event-Durchsatz werden noch nicht aus dem Browser-Telemetriekanal erfasst." /><InfoCard icon={<Activity className="h-4 w-4" />} title="Performance-Metriken" description="Antwortzeiten hier sind Momentaufnahmen der Health Checks. Für echte p50/p95-Ladezeiten, API-Durchsatz und Fehlerquoten braucht DR1FT eine persistente Telemetrie-Instrumentierung." /></div>
    </section>}
    {tab === "errors" && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" /><div><h2 className="text-base font-semibold text-slate-900">Fehlerprotokoll</h2><p className="mt-1 text-sm leading-6 text-slate-500">Aktuell ist noch keine zentrale Fehlererfassung in den drei Apps angebunden. Deshalb werden hier bewusst keine Fehlerzahlen oder leeren Fehlerlisten als „alles sauber“ ausgegeben.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><SourceState title="Frontend-Fehler" detail="Browser / React Error Boundary" /><SourceState title="API-Fehler" detail="Next.js Route Handler / Server Actions" /><SourceState title="Datenbankfehler" detail="Supabase Postgres / PostgREST" /></div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Nächster Ausbauschritt: Fehlerereignisse zentral erfassen, nach App, Route, Release und Häufigkeit gruppieren und mit Stacktrace sowie Zeitverlauf darstellen. Passwörter, Tokens und personenbezogene Inhalte dürfen dabei nicht protokolliert werden.</div></section>}
    {tab === "security" && <section className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h2 className="text-base font-semibold text-amber-950">Security-Audit-Logs noch nicht verbunden</h2><p className="mt-1 text-sm leading-6 text-amber-900/80">Das Dashboard kann derzeit keine fehlgeschlagenen Logins, ungewöhnlichen IP-Wechsel, Token-Missbrauch oder auffällige API-Zugriffe zuverlässig auswerten. Die dafür nötigen geschützten Supabase- und Vercel-Logquellen sind noch nicht serverseitig integriert.</p></div></div></div>
      <div className="grid gap-4 md:grid-cols-2"><SecurityCard title="Authentifizierung" items={["Fehlgeschlagene Anmeldeversuche", "Ungewöhnliche Login-Frequenz", "Passwort-Reset- und MFA-Ereignisse"]} /><SecurityCard title="Zugriffsmuster" items={["Viele 401/403-Antworten", "Ungewöhnliche Request-Spitzen", "Zugriffe auf fremde Schul-/Klassenbereiche"]} /><SecurityCard title="API & Infrastruktur" items={["Wiederholte 4xx/5xx-Fehler", "Rate-Limit- und Bot-Auffälligkeiten", "Ungewöhnliche Server- und Datenbanklast"]} /><SecurityCard title="Berechtigungen" items={["Änderungen an Plattformrollen", "Neue Admin-Zuweisungen", "RLS- und Policy-Prüfungen"]} /></div>
      <p className="text-xs leading-5 text-slate-400">Erkennung und Alarmierung zuerst. Automatische Sperren oder Eingriffe werden nicht ohne nachvollziehbare Regeln und Freigabe aktiviert.</p>
    </section>}
    <footer className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-400"><ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />Messwerte sind Momentaufnahmen dieses Aufrufs. Für Verlauf, Schwellwerte, Benachrichtigungen und belastbare Security-Erkennung müssen die jeweiligen Datenquellen noch angebunden werden.</footer>
  </div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{icon}{label}</div><p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}
function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800">{icon}{title}</div><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>;
}
function SourceState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-500">{detail}</p><span className="mt-3 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Nicht angebunden</span></div>;
}
function SecurityCard({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex items-start gap-2 text-sm text-slate-500"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />{item}</li>)}</ul><p className="mt-4 text-[11px] font-medium text-amber-700">Messquelle noch nicht verbunden</p></div>;
}
