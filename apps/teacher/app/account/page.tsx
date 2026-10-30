"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, AtSign, BadgeCheck, Building2, Check, KeyRound, LockKeyhole, Mail, Save, ShieldCheck, UserRound, X } from "lucide-react";

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function TeacherAccountPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState("Lehrkraft");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = client();
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setEmailDraft(user.email ?? "");
      const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.from("school_memberships").select("school_id,role,active").eq("user_id", user.id).eq("active", true).order("created_at", { ascending: true }),
      ]);
      if (!alive) return;
      const displayName = profile?.display_name ?? user.user_metadata?.display_name ?? "";
      setName(displayName);
      setNameDraft(displayName);
      const membership = memberships?.[0];
      if (membership?.role) setRole(membership.role === "school_admin" ? "Schuladministration" : membership.role === "school_lead" ? "Schulleitung" : "Lehrkraft");
      if (membership?.school_id) {
        const { data: schoolRow } = await supabase.from("schools").select("name,region").eq("id", membership.school_id).maybeSingle();
        if (alive) setSchool(schoolRow?.name ? (schoolRow.region ? schoolRow.name + " · " + schoolRow.region : schoolRow.name) : "");
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [router]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const cleanName = nameDraft.trim();
    const cleanEmail = emailDraft.trim().toLowerCase();
    if (!cleanName) { setError("Bitte gib deinen Namen ein."); return; }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("Bitte gib eine gültige E-Mail-Adresse ein."); return; }
    setSavingProfile(true);
    const supabase = client();
    const { error: profileError } = await supabase.from("user_profiles").upsert({ id: userId, display_name: cleanName }, { onConflict: "id" });
    if (profileError) {
      setError("Dein Name konnte nicht gespeichert werden: " + profileError.message);
      setSavingProfile(false);
      return;
    }
    if (cleanEmail !== email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: cleanEmail });
      if (emailError) {
        setError("Dein Name wurde gespeichert, aber die E-Mail-Adresse konnte nicht geändert werden: " + emailError.message);
        setName(cleanName);
        setNameDraft(cleanName);
        setSavingProfile(false);
        return;
      }
      setNotice("Profil gespeichert. Bitte bestätige die Änderung über den Link, den wir an deine neue E-Mail-Adresse senden.");
      setName(cleanName);
      setNameDraft(cleanName);
    } else {
      setNotice("Deine Profildaten wurden gespeichert.");
      setName(cleanName);
      setNameDraft(cleanName);
    }
    setSavingProfile(false);
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) { setError("Das Passwort muss mindestens 8 Zeichen lang sein."); return; }
    if (password !== confirm) { setError("Die Passwörter stimmen nicht überein."); return; }
    setPending(true);
    const { error: updateError } = await client().auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else { setPassword(""); setConfirm(""); setNotice("Dein Passwort wurde geändert."); }
    setPending(false);
  }

  if (loading) return <main className="min-h-[70vh]"><div className="mx-auto max-w-5xl animate-pulse space-y-5"><div className="h-8 w-52 rounded-xl bg-violet-100" /><div className="h-48 rounded-3xl bg-white" /><div className="h-64 rounded-3xl bg-white" /></div></main>;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <a href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-violet-700"><ArrowLeft className="h-3.5 w-3.5" /> Zur Übersicht</a>
          <div className="mt-5 overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"><UserRound className="h-8 w-8" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-violet-600">DR1FT / LEHRKRAFT STUDIO</p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Dein Konto.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Verwalte deine persönlichen Angaben und behalte deine Schulzuordnung im Blick.</p>
              </div>
              <div className="sm:ml-auto"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-2 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Konto aktiv</span></div>
            </div>
          </div>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><X className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

        <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 sm:px-7">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><UserRound className="h-5 w-5" /></span>
            <div><h2 className="text-base font-extrabold text-slate-950">Persönliche Angaben</h2><p className="mt-0.5 text-xs text-slate-500">Diese Daten gehören zu deinem persönlichen DR1FT-Zugang.</p></div>
          </div>
          <form onSubmit={saveProfile} className="space-y-5 p-6 sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block"><span className="text-xs font-bold text-slate-700">Vor- und Nachname</span><span className="relative mt-2 block"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} autoComplete="name" maxLength={100} required placeholder="Dein Name" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></span></label>
              <label className="block"><span className="text-xs font-bold text-slate-700">E-Mail-Adresse</span><span className="relative mt-2 block"><AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} autoComplete="email" required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></span><span className="mt-1.5 block text-[11px] text-slate-400">Bei einer Änderung ist eine Bestätigung per E-Mail erforderlich.</span></label>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-slate-400">Deine Änderungen wirken sich auf dein DR1FT-Konto aus.</p><button type="submit" disabled={savingProfile || (nameDraft.trim() === name && emailDraft.trim().toLowerCase() === email)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{savingProfile ? "Speichert …" : "Profil speichern"}</button></div>
          </form>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 sm:px-7"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Building2 className="h-5 w-5" /></span><div><h2 className="text-base font-extrabold text-slate-950">Schulzuordnung & Rolle</h2><p className="mt-0.5 text-xs text-slate-500">Wird durch die Einladung und Verwaltung deiner Schule festgelegt.</p></div><span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-500"><LockKeyhole className="h-3 w-3" /> Verwaltet</span></div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            <div className="bg-white p-5 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Zugeordnete Schule</p><p className="mt-2 text-sm font-bold text-slate-900">{school || "Noch keiner Schule zugeordnet"}</p><p className="mt-1 text-xs leading-5 text-slate-500">Die Schuladministration kann deine Zuordnung verwalten.</p></div>
            <div className="bg-white p-5 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Deine Rolle</p><p className="mt-2 text-sm font-bold text-slate-900">{role}</p><p className="mt-1 text-xs leading-5 text-slate-500">Deine Berechtigungen ergeben sich aus deiner Schulmitgliedschaft.</p></div>
          </div>
          {!school && <div className="border-t border-amber-100 bg-amber-50/70 px-5 py-4 text-xs leading-5 text-amber-800"><strong>Noch keiner Schule zugeordnet.</strong> Wenn du per Einladung einer Schule beitreten solltest, prüfe bitte, ob du die Einladung mit genau dieser E-Mail-Adresse angenommen hast. Andernfalls bitte den Schuladmin, deine Mitgliedschaft zu prüfen.</div>}
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 sm:px-7"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-pink-600"><KeyRound className="h-5 w-5" /></span><div><h2 className="text-base font-extrabold text-slate-950">Sicherheit</h2><p className="mt-0.5 text-xs text-slate-500">Ändere hier dein persönliches Passwort.</p></div></div>
          <form onSubmit={savePassword} className="grid gap-4 p-6 sm:grid-cols-2 sm:p-7">
            <label className="block"><span className="text-xs font-bold text-slate-700">Neues Passwort</span><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /><span className="mt-1.5 block text-[11px] text-slate-400">Mindestens 8 Zeichen.</span></label>
            <label className="block"><span className="text-xs font-bold text-slate-700">Passwort wiederholen</span><input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="inline-flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Dein Passwort wird sicher über DR1FT Auth aktualisiert.</p><button type="submit" disabled={pending || !password || !confirm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 disabled:opacity-50"><KeyRound className="h-4 w-4" />{pending ? "Speichert …" : "Passwort ändern"}</button></div>
          </form>
        </section>
        <p className="px-1 pb-4 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-slate-300">DR1FT · Dein Lernraum. Deine Perspektive.</p>
      </div>
    </main>
  );
}
