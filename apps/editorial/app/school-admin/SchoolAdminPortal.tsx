"use client";

import { useState } from "react";
import { Building2, GraduationCap, LogOut, Mail, ShieldCheck, UserRound, Users } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type School = {
  id: string; name: string; region: string | null; email_domain: string | null;
  school_type: string | null; student_count: number | null; status: string;
  plan: string; funding_type: string;
};
type Member = {
  id: string; user_id: string; email: string | null; display_name: string | null;
  role: string; active: boolean; created_at: string;
};
type SchoolClass = {
  id: string; name: string; grade_level: number | null; school_year: string;
  access_code: string | null; is_active: boolean; created_at: string;
  teacherNames: string[]; studentCount: number;
};

const ROLE_LABELS: Record<string, string> = {
  teacher: "Lehrkraft", school_lead: "Schulleitung", school_admin: "Schuladmin",
};

function client() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export function SchoolAdminPortal({
  school, members: initialMembers, classes: initialClasses, role,
}: {
  school: School; members: Member[]; classes: SchoolClass[]; role: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [classes] = useState(initialClasses);
  const [tab, setTab] = useState<"overview" | "classes" | "people" | "account">("overview");
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState(""); const [displayName, setDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState("teacher"); const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault(); setPending(true); setMessage(null);
    try {
      const supabase = client();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-school-user`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school.id, email, displayName, role: inviteRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Einladung fehlgeschlagen");
      setEmail(""); setDisplayName(""); setInviteRole("teacher"); setShowInvite(false);
      setMessage("Einladung versendet und Schulrolle angelegt.");
      const { data: refreshed } = await supabase.rpc("get_school_member_directory", { p_school_id: school.id });
      setMembers(refreshed ?? members);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Einladung fehlgeschlagen"); }
    finally { setPending(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setMessage(null);
    if (password.length < 8) return setMessage("Das Passwort muss mindestens 8 Zeichen lang sein.");
    if (password !== confirm) return setMessage("Die Passwörter stimmen nicht überein.");
    setPending(true);
    const { error } = await client().auth.updateUser({ password });
    setPending(false);
    if (error) setMessage(error.message);
    else { setPassword(""); setConfirm(""); setMessage("Passwort wurde geändert."); }
  }

  async function signOut() {
    await client().auth.signOut(); window.location.href = "/login";
  }

  const activeMembers = members.filter((m) => m.active);
  const activeClasses = classes.filter((c) => c.is_active);
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <main className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">D</div>
            <div><p className="font-semibold text-slate-900">DR1FT</p><p className="text-xs text-slate-500">Schulbereich</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500">{school.name}</span>
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Abmelden</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Schulverwaltung</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{school.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{school.region || "Region nicht hinterlegt"}{school.school_type ? ` · ${school.school_type}` : ""}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"><ShieldCheck className="h-3.5 w-3.5" />{ROLE_LABELS[role] ?? role}</span>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Schüler:innen" value={school.student_count ?? totalStudents} />
          <Kpi label="Lehrkräfte" value={activeMembers.filter((m) => m.role === "teacher").length} />
          <Kpi label="Klassen" value={classes.length} />
          <Kpi label="Aktive Klassen" value={activeClasses.length} />
          <Kpi label="Aktive Personen" value={activeMembers.length} />
        </section>

        <nav className="mt-8 flex flex-wrap gap-6 border-b border-border">
          {([["overview","Übersicht"],["classes","Klassen"],["people","Personen & Rollen"],["account","Mein Konto"]] as const).map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)} className={`border-b-2 px-1 pb-3 text-sm font-medium ${tab === key ? "border-accent text-slate-900" : "border-transparent text-slate-500"}`}>{label}</button>
          ))}
        </nav>

        {message && <div className="mt-5 rounded-xl border border-border bg-white px-4 py-3 text-sm text-slate-700">{message}</div>}

        {tab === "overview" && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-3xl border border-border bg-white p-6">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500"><Building2 className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Schulprofil</h2><p className="mt-1 text-sm text-slate-500">Stammdaten und aktueller DR1FT-Zugang.</p></div></div>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <Info label="Schulform" value={school.school_type || "Nicht hinterlegt"} />
                <Info label="Region" value={school.region || "—"} />
                <Info label="Schul-Domain" value={school.email_domain ? `@${school.email_domain}` : "Nicht hinterlegt"} />
                <Info label="Plan" value={school.plan} />
              </dl>
            </div>
            <div className="rounded-3xl border border-border bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Schnellzugriff</p>
              <h2 className="mt-2 font-semibold text-slate-900">Schulbetrieb</h2>
              <div className="mt-5 space-y-2">
                <button onClick={() => setTab("classes")} className="w-full rounded-xl border border-border px-4 py-3 text-left text-sm hover:bg-slate-50"><span className="font-medium">Klassen verwalten</span><span className="block text-xs text-slate-400 mt-0.5">{classes.length} Klassen · {totalStudents} Schüler:innen</span></button>
                <button onClick={() => { setTab("people"); setShowInvite(true); }} className="w-full rounded-xl border border-border px-4 py-3 text-left text-sm hover:bg-slate-50"><span className="font-medium">Lehrkraft einladen</span><span className="block text-xs text-slate-400 mt-0.5">Neue Zugänge für das Schulteam</span></button>
              </div>
            </div>
          </section>
        )}

        {tab === "classes" && (
          <section className="mt-6">
            <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Schulbetrieb</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Klassen</h2><p className="mt-1 text-sm text-slate-500">Alle Klassen dieser Schule mit Lehrkraft, Schülerzahl und Status.</p></div>
            {classes.length === 0 ? <div className="rounded-3xl border border-dashed border-border bg-white p-12 text-center"><GraduationCap className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium text-slate-800">Noch keine Klassen</p><p className="mt-1 text-sm text-slate-500">Klassen werden im Lehrkraft-Bereich angelegt.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map((c) => <div key={c.id} className="rounded-3xl border border-border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{c.name}</h3><p className="mt-1 text-sm text-slate-500">Jahrgang {c.grade_level ?? "—"} · {c.school_year}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.is_active ? "Aktiv" : "Pausiert"}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Schüler:innen</p><p className="mt-1 text-xl font-semibold">{c.studentCount}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Zugangscode</p><p className="mt-1 font-mono text-sm font-semibold tracking-wider">{c.access_code ?? "—"}</p></div></div><div className="mt-4"><p className="text-xs text-slate-400">Lehrkraft</p><p className="mt-1 text-sm text-slate-700">{c.teacherNames.length ? c.teacherNames.join(", ") : "Noch nicht zugeordnet"}</p></div><a href={`${process.env.NEXT_PUBLIC_TEACHER_URL ?? "/classes"}/${c.id}`} className="mt-5 inline-flex rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">Klasse öffnen</a></div>)}</div>}
          </section>
        )}

        {tab === "people" && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-white">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Schulteam</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Lehrkräfte & Zugänge</h2><p className="mt-1 text-sm text-slate-500">{activeMembers.length} aktive Personen.</p></div><button onClick={() => setShowInvite(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"><Mail className="h-4 w-4" /> Person einladen</button></div>
            <div className="divide-y divide-border">{members.map((member) => <div key={member.id} className="flex items-center justify-between gap-4 p-5"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{member.display_name || "Name nicht hinterlegt"}</p><p className="truncate text-xs text-slate-500">{member.email || member.user_id}</p></div></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{ROLE_LABELS[member.role] ?? member.role}</span></div>)}</div>
          </section>
        )}

        {tab === "account" && (
          <section className="mt-6 max-w-2xl rounded-3xl border border-border bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Mein Konto</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Passwort ändern</h2><p className="mt-2 text-sm text-slate-500">Mindestens 8 Zeichen.</p>
            <form onSubmit={changePassword} className="mt-6 space-y-4"><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Neues Passwort" className="w-full rounded-xl border border-border px-3 py-2.5 text-sm" /><input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Neues Passwort wiederholen" className="w-full rounded-xl border border-border px-3 py-2.5 text-sm" /><button disabled={pending} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Speichert …" : "Passwort ändern"}</button></form>
          </section>
        )}
      </div>

      {showInvite && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-border bg-white p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Schulzugang</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Person einladen</h2><form onSubmit={invite} className="mt-6 space-y-4"><label className="block text-sm font-medium">Name<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium">E-Mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium">Rolle<select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"><option value="teacher">Lehrkraft</option><option value="school_lead">Schulleitung</option><option value="school_admin">Schuladmin</option></select></label><p className="text-xs text-slate-400">Wenn eine Schul-Domain hinterlegt ist, muss die E-Mail-Adresse zu dieser Domain gehören.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowInvite(false)} className="rounded-xl border border-border px-4 py-2.5">Abbrechen</button><button disabled={pending} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Wird eingeladen …" : "Einladung senden"}</button></div></form></div></div>}
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">{label}</p><p className="mt-1.5 text-2xl font-semibold text-slate-900">{value.toLocaleString("de-DE")}</p></div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>;
}
