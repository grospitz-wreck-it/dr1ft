"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function TeacherAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState("Lehrkraft");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = client();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? "");
      const [{ data: profile }, { data: membership }] = await Promise.all([
        supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.from("school_memberships")
          .select("school_id, role")
          .eq("user_id", user.id)
          .eq("active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      setName(profile?.display_name ?? user.user_metadata?.display_name ?? "");
      if (membership?.role) setRole(membership.role === "school_admin" ? "Schuladministration" : membership.role === "school_lead" ? "Schulleitung" : "Lehrkraft");
      if (membership?.school_id) {
        const { data: schoolRow } = await supabase.from("schools").select("name, region").eq("id", membership.school_id).maybeSingle();
        setSchool(schoolRow?.name ? (schoolRow.region ? `${schoolRow.name} · ${schoolRow.region}` : schoolRow.name) : "");
      }
    })();
  }, [router]);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setPending(true);
    const { error: updateError } = await client().auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else {
      setPassword("");
      setConfirm("");
      setMessage("Passwort wurde geändert.");
    }
    setPending(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-7 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <a href="/classes" className="text-xs text-slate-400 hover:text-slate-700">← Meine Klassen</a>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-3">Mein Konto</h1>
          <p className="text-sm text-slate-500 mt-2">Deine persönlichen Daten und deine Schulzuordnung.</p>
        </div>

        <section className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Profil</h2>
            <p className="text-sm text-slate-500 mt-1">Diese Angaben werden aus deinem DR1FT-Konto und deiner Schulzuordnung übernommen.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-px bg-border">
            <Info label="Name" value={name || "—"} />
            <Info label="E-Mail" value={email || "—"} />
            <Info label="Schule" value={school || "Noch keiner Schule zugeordnet"} />
            <Info label="Rolle" value={role} />
          </div>
        </section>

        <section className="bg-white border border-border rounded-3xl shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Passwort ändern</h2>
            <p className="text-sm text-slate-500 mt-1">Verwende mindestens 8 Zeichen.</p>
          </div>
          <form onSubmit={savePassword} className="p-6 max-w-lg space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Neues Passwort</span>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Neues Passwort wiederholen</span>
              <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            <button disabled={pending} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {pending ? "Speichert …" : "Passwort ändern"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="bg-white p-5"><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-medium text-slate-900 mt-1">{value}</p></div>;
}
