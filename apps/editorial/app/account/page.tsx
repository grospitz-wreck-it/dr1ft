"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, AtSign, Check, KeyRound, Save, UserRound, X } from "lucide-react";

function client() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export default function EditorialAccountPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = client();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { router.replace("/login?next=/account"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setEmailDraft(user.email ?? "");
      const { data } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (!alive) return;
      const currentName = data?.display_name ?? user.user_metadata?.display_name ?? "";
      setName(currentName);
      setNameDraft(currentName);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [router]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError(null); setNotice(null);
    const cleanName = nameDraft.trim();
    const cleanEmail = emailDraft.trim().toLowerCase();
    if (!cleanName) { setError("Bitte gib deinen Namen ein."); return; }
    if (!cleanEmail || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(cleanEmail)) { setError("Bitte gib eine gültige E-Mail-Adresse ein."); return; }
    setSaving(true);
    const supabase = client();
    const { error: profileError } = await supabase.from("user_profiles").upsert({ id: userId, display_name: cleanName }, { onConflict: "id" });
    if (profileError) { setError("Dein Name konnte nicht gespeichert werden: " + profileError.message); setSaving(false); return; }
    setName(cleanName); setNameDraft(cleanName);
    if (cleanEmail !== email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: cleanEmail });
      if (emailError) setError("Dein Name wurde gespeichert, aber die E-Mail-Adresse konnte nicht geändert werden: " + emailError.message);
      else { setEmailDraft(cleanEmail); setNotice("Profil gespeichert. Bitte bestätige die Änderung über den Link, den wir an deine neue E-Mail-Adresse senden."); }
    } else setNotice("Deine Profildaten wurden gespeichert.");
    window.dispatchEvent(new Event("drift:profile-updated"));
    setSaving(false);
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault(); setError(null); setNotice(null);
    if (password.length < 8) { setError("Das Passwort muss mindestens 8 Zeichen lang sein."); return; }
    if (password !== confirm) { setError("Die Passwörter stimmen nicht überein."); return; }
    setPasswordSaving(true);
    const { error: updateError } = await client().auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else { setPassword(""); setConfirm(""); setNotice("Dein Passwort wurde geändert."); }
    setPasswordSaving(false);
  }

  if (loading) return <main className="min-h-[60vh] animate-pulse rounded-3xl bg-white/60" />;
  return <main className="mx-auto min-h-screen max-w-5xl space-y-6">
    <div><a href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-violet-700"><ArrowLeft className="h-3.5 w-3.5" /> Zurück zur Redaktion</a>
      <div className="mt-5 rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg"><UserRound className="h-7 w-7" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-600">DR1FT / ACCOUNT</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Dein Konto.</h1><p className="mt-1 text-sm text-slate-600">Ein persönlicher Zugang für die DR1FT-Anwendungen.</p></div></div>
      </div>
    </div>
    {error && <div role="alert" className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><X className="h-4 w-4 shrink-0" />{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><Check className="h-4 w-4 shrink-0" />{notice}</div>}
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><UserRound className="h-5 w-5" /></span><div><h2 className="text-base font-extrabold text-slate-950">Persönliche Angaben</h2><p className="text-xs text-slate-500">Diese Daten gehören zu deinem DR1FT-Zugang.</p></div></div>
      <form onSubmit={saveProfile} className="space-y-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block"><span className="text-xs font-bold text-slate-700">Vor- und Nachname</span><span className="relative mt-2 block"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={nameDraft} onChange={e=>setNameDraft(e.target.value)} autoComplete="name" maxLength={100} required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></span></label>
          <label className="block"><span className="text-xs font-bold text-slate-700">E-Mail-Adresse</span><span className="relative mt-2 block"><AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" value={emailDraft} onChange={e=>setEmailDraft(e.target.value)} autoComplete="email" required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></span><span className="mt-1 block text-[11px] text-slate-400">Eine neue E-Mail-Adresse muss bestätigt werden.</span></label>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-5"><button type="submit" disabled={saving || (nameDraft.trim()===name && emailDraft.trim().toLowerCase()===email)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Speichert …" : "Profil speichern"}</button></div>
      </form>
    </section>
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><KeyRound className="h-5 w-5" /></span><div><h2 className="text-base font-extrabold text-slate-950">Sicherheit</h2><p className="text-xs text-slate-500">Ändere hier dein persönliches Passwort.</p></div></div>
      <form onSubmit={savePassword} className="grid gap-4 p-6 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-bold text-slate-700">Neues Passwort</span><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /><span className="mt-1 block text-[11px] text-slate-400">Mindestens 8 Zeichen.</span></label>
        <label className="block"><span className="text-xs font-bold text-slate-700">Passwort wiederholen</span><input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>
        <div className="flex justify-end border-t border-slate-100 pt-5 sm:col-span-2"><button type="submit" disabled={passwordSaving || !password || !confirm} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 disabled:opacity-50"><KeyRound className="h-4 w-4" />{passwordSaving ? "Speichert …" : "Passwort ändern"}</button></div>
      </form>
    </section>
  </main>;
}
