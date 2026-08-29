"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../lib/supabaseBrowserClient";
import { avatarUrl } from "../../lib/avatar";

export default function ProfilePage() {
  const supabase = supabaseBrowserClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("");
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
      const { data } = await supabase
        .from("user_profiles")
        .select("display_name, username, avatar_seed")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setUsername(data?.username ?? user.email?.split(".")[0] ?? "");
      setAvatarSeed(data?.avatar_seed ?? user.id);
    })();
  }, [router]);

  async function save() {
    if (!userId || !displayName.trim() || !username.trim()) return;
    setSaving(true);
    setMessage(null);
    const cleanUsername = username.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ id: userId, display_name: displayName.trim(), username: cleanUsername, avatar_seed: avatarSeed || userId });
    setSaving(false);
    setMessage(error ? error.message : "Profil gespeichert.");
    if (!error) setUsername(cleanUsername);
  }

  function randomizeAvatar() {
    setAvatarSeed(`${userId ?? "dr1ft"}-${Math.random().toString(36).slice(2, 10)}`);
  }

  if (!userId) return <main className="min-h-screen bg-ink flex items-center justify-center text-ash">Profil wird geladen…</main>;

  return (
    <main className="min-h-screen bg-ink text-paper px-4 py-8">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.back()} className="text-xs text-ash mb-6">← Zurück</button>
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

          {message && <p className="text-xs text-ash mt-4">{message}</p>}

          <button onClick={save} disabled={saving} className="mt-6 w-full rounded-lg py-3 bg-marker text-ink font-medium disabled:opacity-50">
            {saving ? "Speichert…" : "Profil speichern"}
          </button>
        </section>
      </div>
    </main>
  );
}
