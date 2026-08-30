"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { avatarUrl } from "../../lib/avatar";

type Interest = { key: string; label: string; emoji: string | null; category: string };

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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      const [{ data: profile }, { data: catalog }, { data: preferences }] = await Promise.all([
        supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", user.id).maybeSingle(),
        supabase.from("ambient_interests").select("key, label, emoji, category").eq("is_active", true).order("sort_order"),
        supabase.from("user_ambient_preferences").select("interest_keys").eq("user_id", user.id).maybeSingle(),
      ]);

      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? user.email?.split(".")[0] ?? "");
      setAvatarSeed(profile?.avatar_seed ?? user.id);
      setInterests(catalog ?? []);
      setSelectedInterests((preferences?.interest_keys ?? []).slice(0, 3));
    })();
  }, [router]);

  function toggleInterest(key: string) {
    setSelectedInterests((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : current.length < 3
          ? [...current, key]
          : current
    );
  }

  async function save() {
    if (!userId || !displayName.trim() || !username.trim()) return;
    setSaving(true);
    setMessage(null);
    const cleanUsername = username.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");

    const [{ error: profileError }, { error: preferenceError }] = await Promise.all([
      supabase.from("user_profiles").upsert({ id: userId, display_name: displayName.trim(), username: cleanUsername, avatar_seed: avatarSeed || userId }),
      supabase.from("user_ambient_preferences").upsert({ user_id: userId, interest_keys: selectedInterests, onboarding_completed: true, updated_at: new Date().toISOString() }),
    ]);

    setSaving(false);
    const error = profileError ?? preferenceError;
    setMessage(error ? error.message : "Profil & Ambient-Interessen gespeichert.");
    if (!error) setUsername(cleanUsername);
  }

  function randomizeAvatar() {
    setAvatarSeed(`${userId ?? "dr1ft"}-${Math.random().toString(36).slice(2, 10)}`);
  }

  if (!userId) return <main className="min-h-screen bg-ink flex items-center justify-center text-ash">Profil wird geladen…</main>;

  return (
    <main className="min-h-screen bg-ink text-paper px-4 py-8">
      <div className="max-w-md mx-auto space-y-4">
        <button onClick={() => router.back()} className="text-xs text-ash mb-2">← Zurück</button>

        <section className="bg-ink-light border border-ink-border rounded-card p-6">
          <div className="flex items-center gap-4 mb-7">
            <img src={avatarUrl(avatarSeed || userId, 180)} alt="" className="w-24 h-24 rounded-full bg-paper" />
            <div>
              <h1 className="font-display text-2xl">Dein Profil</h1>
              <p className="text-sm text-ash">So sehen dich deine Mitschüler:innen.</p>
              <button onClick={randomizeAvatar} className="mt-2 text-xs text-marker hover:underline">Neuen Avatar würfeln</button>
            </div>
          </div>

          <label className="block text-xs text-ash mb-1">Anzeigename</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg px-3 py-3 mb-4 bg-paper text-ink" maxLength={40} />

          <label className="block text-xs text-ash mb-1">Nutzername</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg px-3 py-3 bg-paper text-ink" maxLength={24} />
          <p className="text-[11px] text-ash mt-1">@{username.replace(/^@/, "")}</p>
        </section>

        <section className="bg-ink-light border border-ink-border rounded-card p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-xl">Dein Feed</h2>
              <p className="text-sm text-ash mt-1">Wähle bis zu 3 Dinge, die dich wirklich interessieren.</p>
            </div>
            <span className="text-xs text-marker font-medium">{selectedInterests.length}/3</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            {interests.map((interest) => {
              const selected = selectedInterests.includes(interest.key);
              return (
                <button
                  key={interest.key}
                  type="button"
                  onClick={() => toggleInterest(interest.key)}
                  className={`text-left rounded-xl border px-3 py-3 transition ${selected ? "border-marker bg-marker/10" : "border-ink-border bg-ink hover:border-ash"}`}
                >
                  <div className="text-lg">{interest.emoji}</div>
                  <div className="text-sm mt-1">{interest.label}</div>
                  {selected && <div className="text-[10px] text-marker mt-1">✓ im Feed</div>}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-ash mt-4 leading-5">
            Diese Auswahl wird später genutzt, um Ambient-Posts individuell zu mischen.
            Sie ist kein Lern- oder Leistungsprofil.
          </p>
        </section>

        {message && <p className="text-xs text-ash px-1">{message}</p>}

        <button onClick={save} disabled={saving} className="w-full rounded-lg py-3 bg-marker text-ink font-medium disabled:opacity-50">
          {saving ? "Speichert…" : "Profil speichern"}
        </button>
      </div>
    </main>
  );
}
