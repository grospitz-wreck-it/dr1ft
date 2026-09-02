"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Palette, Sparkles } from "lucide-react";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { avatarUrl } from "../../lib/avatar";

type Interest = {
  key: string;
  label: string;
  emoji: string | null;
  category: string;
};

export default function ProfilePage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const [{ data: profile, error: profileLoadError }, { data: catalog, error: catalogError }, { data: preferences, error: preferencesError }] = await Promise.all([
        supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", user.id).maybeSingle(),
        supabase.from("ambient_interests").select("key, label, emoji, category").eq("is_active", true).order("sort_order"),
        supabase.from("user_ambient_preferences").select("interest_keys").eq("user_id", user.id).maybeSingle(),
      ]);

      if (!mounted) return;

      setUserId(user.id);
      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? user.email?.split("@")[0] ?? "");
      setAvatarSeed(profile?.avatar_seed ?? user.id);
      setInterests(catalog ?? []);
      setSelectedInterests((preferences?.interest_keys ?? []).filter((key: string) => (catalog ?? []).some((interest) => interest.key === key)).slice(0, 3));
      setLoadingInterests(false);

      const loadError = profileLoadError ?? catalogError ?? preferencesError;
      if (loadError) setMessage(loadError.message);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const groupedInterests = useMemo(() => {
    return interests.reduce<Record<string, Interest[]>>((groups, interest) => {
      (groups[interest.category] ??= []).push(interest);
      return groups;
    }, {});
  }, [interests]);

  function toggleInterest(key: string) {
    setMessage(null);
    setSelectedInterests((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : current.length < 3
          ? [...current, key]
          : current,
    );
  }

  async function save() {
    if (!userId || !displayName.trim() || !username.trim()) return;

    if (selectedInterests.length !== 3) {
      setMessage("Wähle bitte genau 3 Interessen aus.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const cleanUsername = username
      .trim()
      .replace(/^@/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);

    if (!cleanUsername) {
      setSaving(false);
      setMessage("Der Nutzername enthält keine gültigen Zeichen.");
      return;
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({
        id: userId,
        display_name: displayName.trim(),
        username: cleanUsername,
        avatar_seed: avatarSeed || userId,
      });

    if (profileError) {
      setSaving(false);
      setMessage(`Profil konnte nicht gespeichert werden: ${profileError.message}`);
      return;
    }

    const { error: preferenceError } = await supabase
      .from("user_ambient_preferences")
      .upsert({
        user_id: userId,
        interest_keys: selectedInterests,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);

    if (preferenceError) {
      setMessage(`Interessen konnten nicht gespeichert werden: ${preferenceError.message}`);
      return;
    }

    setUsername(cleanUsername);
    setMessage("Profil gespeichert.");
  }

  function randomizeAvatar() {
    setAvatarSeed(`${userId ?? "dr1ft"}-${Math.random().toString(36).slice(2, 10)}`);
  }

  if (!userId) {
    return <main className="min-h-screen grid place-items-center text-[#68738a]">Profil wird geladen…</main>;
  }

  return (
    <main className="min-h-screen text-[#26324a] max-w-3xl mx-auto">
      <header className="pb-7">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#9aa3b5]">Dein DR1FT</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.045em] mt-1">Profil</h1>
        <p className="text-sm text-[#68738a] mt-2">Wie du dich zeigst. Und was in deinem Feed auftaucht.</p>
      </header>

      <section className="relative overflow-hidden rounded-[30px] bg-[#26324a] text-white p-6 md:p-8 shadow-[0_20px_60px_rgba(38,50,74,0.15)]">
        <div className="absolute -right-20 -top-24 w-64 h-64 rounded-full bg-[#789bd0]/25 blur-3xl" />
        <div className="absolute right-16 -bottom-28 w-56 h-56 rounded-full bg-[#b99bd5]/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative">
            <img src={avatarUrl(avatarSeed || userId, 220)} alt="" className="w-28 h-28 rounded-[28px] bg-white/10 ring-4 ring-white/10 object-cover" />
            <button onClick={randomizeAvatar} className="absolute -bottom-2 -right-2 grid place-items-center w-9 h-9 rounded-xl bg-white text-[#26324a] shadow-lg hover:scale-105 transition" aria-label="Avatar neu würfeln">
              <Palette className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">Dein Auftritt</p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.03em] mt-1">{displayName || "Dein Name"}</h2>
            <p className="text-sm text-white/55 mt-1">@{username.replace(/^@/, "") || "drifter"}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[26px] bg-white border border-white p-5 md:p-6 shadow-[0_12px_40px_rgba(38,50,74,0.05)]">
        <div className="flex items-center gap-2 mb-5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-[#eef2fa] text-[#789bd0]"><Sparkles className="w-4 h-4" /></span>
          <div>
            <h2 className="font-display font-semibold">Persönliche Daten</h2>
            <p className="text-[11px] text-[#9aa3b5]">Das sehen andere von dir.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-xs font-medium text-[#68738a]">
            Anzeigename
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e1e5ed] bg-[#f8f9fc] px-3.5 py-3 text-sm outline-none focus:border-[#789bd0] focus:ring-4 focus:ring-[#789bd0]/10" maxLength={40} />
          </label>
          <label className="block text-xs font-medium text-[#68738a]">
            Nutzername
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e1e5ed] bg-[#f8f9fc] px-3.5 py-3 text-sm outline-none focus:border-[#789bd0] focus:ring-4 focus:ring-[#789bd0]/10" maxLength={24} />
            <span className="block text-[10px] text-[#a0a8b7] mt-1">@{username.replace(/^@/, "")}</span>
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-[26px] bg-white border border-white p-5 md:p-6 shadow-[0_12px_40px_rgba(38,50,74,0.05)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Dein Feed</h2>
            <p className="text-sm text-[#68738a] mt-1">Wähle genau 3 Dinge, die dich wirklich interessieren.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedInterests.length === 3 ? "bg-[#dcf3e8] text-[#4d927b]" : "bg-[#eef2fa] text-[#789bd0]"}`}>
            {selectedInterests.length}/3
          </span>
        </div>

        {loadingInterests ? (
          <div className="mt-6 rounded-2xl bg-[#f8f9fc] px-4 py-8 text-center text-sm text-[#8d96a7]">Interessen werden geladen…</div>
        ) : (
          <div className="mt-5 space-y-5">
            {Object.entries(groupedInterests).map(([category, categoryInterests]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#a0a8b7]">{category}</span>
                  <span className="h-px flex-1 bg-[#edf0f5]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryInterests.map((interest) => {
                    const selected = selectedInterests.includes(interest.key);
                    const disabled = !selected && selectedInterests.length >= 3;
                    return (
                      <button
                        key={interest.key}
                        type="button"
                        onClick={() => toggleInterest(interest.key)}
                        disabled={disabled}
                        aria-pressed={selected}
                        className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-medium transition-all ${selected ? "border-[#789bd0] bg-[#eef2fa] text-[#344b72] shadow-sm -translate-y-0.5" : "border-[#e5e8ef] bg-[#fafbfc] text-[#526079] hover:border-[#cbd5e6] hover:bg-white hover:-translate-y-0.5"} ${disabled ? "opacity-45 cursor-not-allowed hover:translate-y-0" : ""}`}
                      >
                        <span aria-hidden="true">{interest.emoji}</span>
                        <span>{interest.label}</span>
                        {selected && <span className="grid place-items-center w-5 h-5 rounded-full bg-[#789bd0] text-white"><Check className="w-3 h-3" /></span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-[#8d96a7] mt-6 leading-5">Diese Auswahl beeinflusst nur, welche Ambient-Posts in deinem Feed auftauchen. Sie ist kein Lern- oder Leistungsprofil.</p>
      </section>

      {message && <div className={`mt-4 rounded-xl border px-4 py-3 text-xs ${message.includes("gespeichert") ? "bg-[#f1faf6] border-[#d8eee4] text-[#4d927b]" : "bg-white border-[#e1e5ed] text-[#68738a]"}`}>{message}</div>}

      <button onClick={save} disabled={saving || loadingInterests || selectedInterests.length !== 3} className="mt-4 w-full rounded-2xl py-3.5 bg-[#26324a] text-white font-medium text-sm shadow-[0_12px_30px_rgba(38,50,74,0.16)] hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0">
        {saving ? "Speichert…" : selectedInterests.length !== 3 ? `Noch ${3 - selectedInterests.length} Interesse${3 - selectedInterests.length === 1 ? "" : "n"} wählen` : "Profil speichern"}
      </button>

      <button onClick={() => router.push(`/profile/${userId}`)} className="mt-3 w-full flex items-center justify-center gap-2 py-3 text-xs font-medium text-[#789bd0]">
        Öffentliches Profil ansehen <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </main>
  );
}
