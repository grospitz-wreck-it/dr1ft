"use client";

import { useState } from "react";
import { Building2, LogOut, Mail, ShieldCheck, UserRound, Users } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type School = {
  id: string;
  name: string;
  region: string | null;
  email_domain: string | null;
  school_type: string | null;
  student_count: number | null;
  status: string;
  plan: string;
  funding_type: string;
};

type Member = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  active: boolean;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  teacher: "Lehrkraft",
  school_lead: "Schulleitung",
  school_admin: "Schuladmin",
};

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function SchoolAdminPortal({
  school,
  members: initialMembers,
  role,
}: {
  school: School;
  members: Member[];
  role: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState("teacher");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const supabase = client();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-school-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schoolId: school.id,
            email,
            displayName,
            role: inviteRole,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Einladung fehlgeschlagen");

      setEmail("");
      setDisplayName("");
      setInviteRole("teacher");
      setShowInvite(false);
      setMessage("Einladung versendet und Schulrolle angelegt.");

      const { data: refreshed } = await supabase.rpc("get_school_member_directory", {
        p_school_id: school.id,
      });
      setMembers(refreshed ?? members);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Einladung fehlgeschlagen");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    await client().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-panel">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-semibold text-slate-900">DR1FT</p>
            <p className="text-xs text-slate-500">Schulbereich</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-slate-600 hover:bg-canvas">
            <LogOut className="h-4 w-4" /> Abmelden
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Schulverwaltung</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{school.name}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {school.region || "Region nicht hinterlegt"}
              {school.school_type ? ` · ${school.school_type}` : ""}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            {ROLE_LABELS[role] ?? role}
          </span>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-panel p-5">
            <p className="text-xs text-slate-400">Schüler:innen</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{school.student_count?.toLocaleString("de-DE") ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel p-5">
            <p className="text-xs text-slate-400">Personen</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{members.filter((m) => m.active).length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel p-5">
            <p className="text-xs text-slate-400">Schul-Domain</p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-900">{school.email_domain ? `@${school.email_domain}` : "—"}</p>
          </div>
        </section>

        {message && <div className="mt-5 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-slate-700">{message}</div>}

        <section className="mt-8 overflow-hidden rounded-3xl border border-border bg-panel">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Schulteam</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Lehrkräfte &amp; Zugänge</h2>
              <p className="mt-1 text-sm text-slate-500">Personen und Schulrollen dieser Schule.</p>
            </div>
            <button onClick={() => setShowInvite(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
              <Mail className="h-4 w-4" /> Person einladen
            </button>
          </div>

          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-slate-500">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{member.display_name || "Name nicht hinterlegt"}</p>
                    <p className="truncate text-xs text-slate-500">{member.email || member.user_id}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-panel p-6">
            <Building2 className="h-5 w-5 text-slate-400" />
            <h2 className="mt-3 font-semibold text-slate-900">Schulprofil</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Stammdaten und Schulzugang werden von DR1FT administriert.</p>
          </div>
          <div className="rounded-3xl border border-border bg-panel p-6">
            <Users className="h-5 w-5 text-slate-400" />
            <h2 className="mt-3 font-semibold text-slate-900">Nächster Schritt</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Klassen und Lehrkraft-Zuordnungen werden im Lehrkraft-Dashboard verwaltet.</p>
          </div>
        </section>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-panel p-6 shadow-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Schulzugang</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Person einladen</h2>
            </div>
            <form onSubmit={invite} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Name<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" /></label>
              <label className="block text-sm font-medium text-slate-700">E-Mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" /></label>
              <label className="block text-sm font-medium text-slate-700">Rolle<select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"><option value="teacher">Lehrkraft</option><option value="school_lead">Schulleitung</option><option value="school_admin">Schuladmin</option></select></label>
              <p className="text-xs text-slate-400">Wenn für die Schule eine Domain hinterlegt ist, muss die E-Mail-Adresse zu dieser Domain gehören.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm">Abbrechen</button>
                <button disabled={pending} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Wird eingeladen …" : "Einladung senden"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
