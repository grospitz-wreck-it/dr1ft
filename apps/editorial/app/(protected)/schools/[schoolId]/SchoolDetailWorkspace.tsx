"use client";

import { useState } from "react";
import { Check, Mail, MoreHorizontal, Plus, ShieldCheck, UserRound, UserRoundCog, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type School = { id: string; name: string; region: string | null; email_domain: string | null; created_at: string };
type Member = { id: string; user_id: string; email: string | null; display_name: string | null; role: string; active: boolean; created_at: string };

type Stats = { total: number; teachers: number; admins: number; leads: number };

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const ROLE_LABELS: Record<string, string> = {
  teacher: "Lehrkraft",
  school_lead: "Schulleitung",
  school_admin: "Schuladmin",
};

export function SchoolDetailWorkspace({
  school,
  initialMembers,
  stats,
}: {
  school: School;
  initialMembers: Member[];
  stats: Stats;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [tab, setTab] = useState<"overview" | "people">("overview");
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("teacher");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeMembers = members.filter((member) => member.active);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setPendingId("invite");
    setMessage(null);
    try {
      const supabase = client();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-school-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId: school.id, email, displayName, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Einladung fehlgeschlagen");
      setEmail("");
      setDisplayName("");
      setRole("teacher");
      setShowInvite(false);
      setMessage("Einladung versendet und Schulrolle angelegt.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Einladung fehlgeschlagen");
    } finally {
      setPendingId(null);
    }
  }

  async function changeRole(member: Member, nextRole: string) {
    if (nextRole === member.role) return;
    setPendingId(member.id);
    setMessage(null);
    const supabase = client();
    const { error } = await supabase.from("school_memberships").update({ role: nextRole }).eq("id", member.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role: nextRole } : item));
      setMessage(`${member.display_name || member.email || "Person"} ist jetzt ${ROLE_LABELS[nextRole]}.`);
    }
    setPendingId(null);
  }

  async function setActive(member: Member, active: boolean) {
    setPendingId(member.id);
    setMessage(null);
    const supabase = client();
    const { error } = await supabase.from("school_memberships").update({ active }).eq("id", member.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, active } : item));
      setMessage(active ? "Person wieder aktiviert." : "Person deaktiviert.");
    }
    setPendingId(null);
  }

  async function remove(member: Member) {
    if (!window.confirm(`${member.display_name || member.email || "Diese Person"} wirklich aus der Schule entfernen?`)) return;
    setPendingId(member.id);
    setMessage(null);
    const supabase = client();
    const { error } = await supabase.from("school_memberships").delete().eq("id", member.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setMessage("Person aus der Schule entfernt.");
    }
    setPendingId(null);
  }

  return (
    <>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Personen", stats.total],
          ["Lehrkräfte", stats.teachers],
          ["Schuladmins", stats.admins],
          ["Schulleitung", stats.leads],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-panel p-5">
            <p className="text-xs font-medium text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 flex items-center gap-6 border-b border-border">
        <button type="button" onClick={() => setTab("overview")} className={`border-b-2 px-1 pb-3 text-sm font-medium ${tab === "overview" ? "border-accent text-slate-900" : "border-transparent text-slate-500"}`}>Übersicht</button>
        <button type="button" onClick={() => setTab("people")} className={`border-b-2 px-1 pb-3 text-sm font-medium ${tab === "people" ? "border-accent text-slate-900" : "border-transparent text-slate-500"}`}>Personen &amp; Rollen</button>
      </div>

      {message && <div className="mt-5 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-slate-700">{message}</div>}

      {tab === "overview" ? (
        <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-3xl border border-border bg-panel p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-slate-500"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold text-slate-900">Schulprofil</h2>
                <p className="mt-1 text-sm text-slate-500">Die wichtigsten Verwaltungsinformationen auf einen Blick.</p>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs text-slate-400">Schulname</dt><dd className="mt-1 text-sm font-medium text-slate-800">{school.name}</dd></div>
              <div><dt className="text-xs text-slate-400">Region</dt><dd className="mt-1 text-sm font-medium text-slate-800">{school.region || "—"}</dd></div>
              <div><dt className="text-xs text-slate-400">Schul-Domain</dt><dd className="mt-1 text-sm font-medium text-slate-800">{school.email_domain ? `@${school.email_domain}` : "Nicht hinterlegt"}</dd></div>
              <div><dt className="text-xs text-slate-400">Aktive Personen</dt><dd className="mt-1 text-sm font-medium text-slate-800">{activeMembers.length}</dd></div>
            </dl>
          </div>
          <div className="rounded-3xl border border-border bg-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Administration</p>
            <h2 className="mt-2 font-semibold text-slate-900">Personen verwalten</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Rollen, Aktivität und Zugänge dieser Schule zentral verwalten.</p>
            <button type="button" onClick={() => { setTab("people"); setShowInvite(true); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Person einladen
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-border bg-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-slate-900">Personen &amp; Rollen</h2><p className="mt-1 text-sm text-slate-500">{activeMembers.length} aktive Personen in dieser Schule.</p></div>
            <button type="button" onClick={() => setShowInvite(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Person einladen</button>
          </div>
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className={`flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between ${member.active ? "" : "bg-canvas/60"}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-slate-500"><UserRound className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{member.display_name || "Name nicht hinterlegt"}</p>
                    <p className="truncate text-xs text-slate-500">{member.email || member.user_id}</p>
                  </div>
                  {!member.active && <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">Deaktiviert</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <select
                    disabled={pendingId === member.id}
                    value={member.role}
                    onChange={(e) => changeRole(member, e.target.value)}
                    className="rounded-lg border border-border bg-panel px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    <option value="teacher">Lehrkraft</option>
                    <option value="school_lead">Schulleitung</option>
                    <option value="school_admin">Schuladmin</option>
                  </select>
                  <button type="button" disabled={pendingId === member.id} onClick={() => setActive(member, !member.active)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-canvas disabled:opacity-50">
                    {member.active ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button type="button" disabled={pendingId === member.id} onClick={() => remove(member)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50" title="Aus Schule entfernen">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {members.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Noch keine Personen zugeordnet.</div>}
          </div>
        </section>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-panel p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{school.name}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Person einladen</h2></div>
              <button type="button" onClick={() => setShowInvite(false)} className="rounded-lg p-2 text-slate-400 hover:bg-canvas"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-3 text-sm text-slate-500">Die E-Mail-Adresse muss zur hinterlegten Schul-Domain passen.</p>
            <form onSubmit={invite} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Name<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" placeholder="Vor- und Nachname" /></label>
              <label className="block text-sm font-medium text-slate-700">Schul-E-Mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" placeholder={`name@${school.email_domain || "schule.de"}`} /></label>
              <label className="block text-sm font-medium text-slate-700">Rolle<select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"><option value="teacher">Lehrkraft</option><option value="school_lead">Schulleitung</option><option value="school_admin">Schuladmin</option></select></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600">Abbrechen</button>
                <button disabled={pendingId === "invite"} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Mail className="h-4 w-4" />{pendingId === "invite" ? "Wird gesendet …" : "Einladung senden"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
