"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, Sparkles } from "lucide-react";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { avatarUrl } from "../lib/avatar";

type NavItem = { href: string; label: string; icon: "home" | "message" | "users" | "user" };

const NAV: NavItem[] = [
  { href: "/feed", label: "Feed", icon: "home" },
  { href: "/messages", label: "Nachrichten", icon: "message" },
];

function Icon({ name }: { name: NavItem["icon"]; active?: boolean }) {
  const common = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>;
  if (name === "message") return <svg {...common}><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.5-.7L4 20l1.7-3.6A7.3 7.3 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5a7.5 7.5 0 0 1 8 7Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>;
  if (name === "users") return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M17 11a4 4 0 1 0 0-8M21 21v-2a4 4 0 0 0-3-3.9"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
}

function isActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/" || pathname.startsWith("/feed");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatRelativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "gerade eben";
  if (seconds < 60) return `vor ${seconds} Sek.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  return `vor ${Math.floor(minutes / 60)} Std.`;
}

type LiveActivity = {
  id: string;
  kind: "like" | "share" | "comment";
  text: string;
  createdAt: string;
  contentItemId: string;
};

export function PlayerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = supabaseBrowserClient();
  const [user, setUser] = useState<{ displayName: string; username: string; avatarSeed: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
  const [activityRealtime, setActivityRealtime] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(authUser: { id: string; email?: string | null }) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, username, avatar_seed")
        .eq("id", authUser.id)
        .maybeSingle();
      if (!mounted) return;
      setUser({
        displayName: profile?.display_name || authUser.email?.split("@")[0] || "DR1FT",
        username: profile?.username || "drifter",
        avatarSeed: profile?.avatar_seed || authUser.id,
      });
    }

    void (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) await loadProfile(authUser);
      else if (mounted) setUser(null);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      window.setTimeout(() => { void loadProfile(session.user); }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setLiveActivity([]);
      return;
    }

    let mounted = true;

    async function loadLiveActivity(currentUserId: string) {
      const { data: classInstanceId, error: instanceError } = await supabase.rpc("get_current_class_instance_id");
      if (instanceError || !classInstanceId) {
        if (mounted) setLiveActivity([]);
        return;
      }

      const [{ data: interactions }, { data: comments }] = await Promise.all([
        supabase
          .from("user_interactions")
          .select("id, user_id, content_item_id, interaction_type, created_at, user_profiles(display_name)")
          .eq("class_instance_id", classInstanceId)
          .in("interaction_type", ["like", "share"])
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("content_items")
          .select("id, created_at, extra")
          .eq("class_instance_id", classInstanceId)
          .eq("type", "comment")
          .eq("status", "live")
          .not("parent_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      if (!mounted) return;

      const activities: LiveActivity[] = [];

      for (const row of interactions ?? []) {
        if (row.user_id === currentUserId) continue;
        const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
        const name = profile?.display_name || "Jemand aus deiner Klasse";
        const kind = row.interaction_type === "share" ? "share" : "like";
        activities.push({
          id: row.id,
          kind,
          text: kind === "share" ? `${name} hat einen Beitrag geteilt.` : `${name} gefällt ein Beitrag.`,
          createdAt: row.created_at,
          contentItemId: row.content_item_id,
        });
      }

      for (const row of comments ?? []) {
        const extra = (row.extra ?? {}) as Record<string, unknown>;
        const actorId = typeof extra.userId === "string" ? extra.userId : null;
        if (actorId === currentUserId) continue;
        const name = typeof extra.displayName === "string" && extra.displayName.trim()
          ? extra.displayName
          : "Jemand aus deiner Klasse";
        activities.push({
          id: row.id,
          kind: "comment",
          text: `${name} hat kommentiert.`,
          createdAt: row.created_at,
          contentItemId: typeof extra.parentContentItemId === "string" ? extra.parentContentItemId : row.id,
        });
      }

      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLiveActivity(activities.slice(0, 12));
    }

    let currentUserId = "";
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const poll = window.setInterval(() => {
      if (currentUserId) void loadLiveActivity(currentUserId);
    }, 5000);

    void (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !mounted) return;
      currentUserId = authUser.id;
      void loadLiveActivity(currentUserId);

      channel = supabase
        .channel("player-live-class-activity")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "content_items" }, () => {
          void loadLiveActivity(currentUserId);
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_interactions" }, () => {
          void loadLiveActivity(currentUserId);
        })
        .subscribe((status) => {
          const connected = status === "SUBSCRIBED";
          setActivityRealtime(connected);
          if (!connected && currentUserId) void loadLiveActivity(currentUserId);
        });
    })();

    return () => {
      mounted = false;
      window.clearInterval(poll);
      setActivityRealtime(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, user?.displayName]);

  const publicRoute = pathname === "/login" || pathname === "/register" || pathname === "/";
  const showShell = !!user && !publicRoute;

  return (
    <div className="min-h-screen">
      {showShell && <>
        <aside className="player-sidebar fixed z-40 inset-y-0 left-0 w-[286px] p-4 pointer-events-none">
          <div className="pointer-events-auto w-full rounded-panel border border-white/20 bg-shell/95 text-white shadow-shell backdrop-blur-2xl flex flex-col overflow-hidden relative">
            <div className="absolute -top-20 -right-16 w-48 h-48 rounded-full bg-social-pink/25 blur-3xl" />
            <div className="absolute bottom-20 -left-20 w-44 h-44 rounded-full bg-social-blue/20 blur-3xl" />
            <div className="relative px-6 pt-6 pb-5">
              <Link href="/feed" className="group inline-flex items-center gap-3">
                <span className="grid place-items-center w-12 h-12 rounded-control bg-gradient-to-br from-social-pink via-social-violet to-social-blue text-white shadow-brand group-hover:rotate-[-4deg] group-hover:scale-105 transition duration-300"><span className="font-display text-xl font-bold tracking-[-0.08em]">d.</span></span>
                <span><span className="block font-display font-bold text-[23px] tracking-[-0.05em]">DR1FT</span><span className="block text-[10px] uppercase tracking-[0.19em] text-white/45">medienkompetenz</span></span>
              </Link>
            </div>
            <div className="relative px-3 flex-1">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Dein Space</div>
              <nav className="space-y-1.5">
                {NAV.map((item) => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} className={`group relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 ${active ? "bg-gradient-to-r from-social-pink/25 via-social-violet/20 to-social-blue/10 text-white shadow-inner" : "text-white/55 hover:bg-white/[.07] hover:text-white"}`}>
                  <span className={`grid place-items-center w-9 h-9 rounded-xl transition-all ${active ? "bg-white/10 text-social-blue" : "bg-white/[.025] group-hover:bg-white/[.08]"}`}><Icon name={item.icon} active={active} /></span>
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.label === "Nachrichten" && <span className="ml-auto w-2 h-2 rounded-full bg-social-pink shadow-[0_0_0_4px_rgba(236,72,153,.10)]" />}
                  {active && <span className="absolute right-2 w-1 h-7 rounded-full bg-gradient-to-b from-social-pink to-social-blue shadow-[0_0_14px_rgba(34,211,238,.6)]" />}
                </Link>; })}
              </nav>
              <div className="relative mt-7 mx-2 h-[300px] rounded-tile border border-white/10 bg-gradient-to-br from-social-pink/15 via-social-violet/15 to-social-blue/10 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-social-pink/0 via-social-pink/60 to-social-blue/0" />
                <div className="relative px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/[.06]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative grid place-items-center w-7 h-7 rounded-lg bg-white/[.07] text-social-mint shrink-0">
                      <span className="w-2 h-2 rounded-full bg-social-mint shadow-[0_0_0_4px_rgba(110,231,183,.10),0_0_12px_rgba(110,231,183,.65)]" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-[0.14em] font-semibold text-white/45 truncate">AKTIVITÄT IN DEINER KLASSE</span>
                      <span className="block text-[10px] text-white/25 mt-0.5">{liveActivity.length ? `${liveActivity.length} aktuelle Aktivitäten` : "Noch keine neuen Aktivitäten"}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] border ${activityRealtime ? "border-social-mint/20 bg-social-mint/10 text-social-mint" : "border-white/10 bg-white/[.04] text-white/30"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activityRealtime ? "bg-emerald-300 animate-pulse" : "bg-white/25"}`} />
                    {activityRealtime ? "LIVE" : "SYNC"}
                  </span>
                </div>
                <div className="relative h-[245px] min-h-0 overflow-hidden">
                  <div className="player-activity-scroll h-full overflow-y-auto px-4 py-3" aria-live="polite">
                    {liveActivity.length ? <div className="space-y-2.5">
                      {liveActivity.map((activity) => {
                        const ActivityIcon = activity.kind === "like" ? Heart : activity.kind === "share" ? Share2 : MessageCircle;
                        return <Link
                          key={activity.id}
                          href={`/feed#post-${activity.contentItemId}`}
                          className="flex items-start gap-2.5 rounded-xl px-1 py-1.5 transition-colors hover:bg-white/[.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
                          title="Beitrag öffnen"
                        >
                          <span className="mt-0.5 grid place-items-center w-7 h-7 rounded-lg bg-white/[.07] text-cyan-200 shrink-0"><ActivityIcon className="w-3.5 h-3.5"/></span>
                          <div className="min-w-0">
                            <p className="text-xs leading-4 text-white/85">{activity.text}</p>
                            <p className="text-[10px] text-white/35 mt-0.5">{formatRelativeTime(activity.createdAt)}</p>
                          </div>
                        </Link>;
                      })}
                    </div> : <div className="h-full flex items-center justify-center text-center px-3"><div><Sparkles className="w-4 h-4 mx-auto mb-2 text-cyan-200/60"/><p className="text-xs text-white/50">Gerade ist es ruhig.</p><p className="text-[10px] text-white/25 mt-1">Neue Aktivitäten erscheinen hier live.</p></div></div>}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#2b2148]/45 to-transparent" />
                </div>
              </div>
            </div>
            <div className="relative p-3 mt-auto border-t border-white/[.06]">
              <Link href="/profile" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[.07] transition-colors">
                <span className="relative rounded-[13px] p-[2px] bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-300"><img src={avatarUrl(user.avatarSeed, 80)} alt="" className="w-10 h-10 rounded-[11px] bg-shell-surface object-cover" /></span>
                <div className="min-w-0 flex-1"><div className="font-medium text-sm truncate">{user.displayName}</div><div className="text-[11px] text-white/40 truncate">@{user.username}</div></div>
                <span className="text-white/35">•••</span>
              </Link>
            </div>
          </div>
        </aside>

        <div className="lg:hidden fixed z-50 top-3 left-3 right-3 pointer-events-none">
          <div className="pointer-events-auto h-14 rounded-2xl border border-white/50 bg-shell/90 text-white backdrop-blur-xl shadow-shell-soft flex items-center justify-between px-3">
            <Link href="/feed" className="flex items-center gap-2.5"><span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 font-display font-bold">d.</span><span className="font-display font-bold tracking-[-0.04em]">DR1FT</span></Link>
            <button onClick={() => setOpen((v) => !v)} className="touch-target grid place-items-center rounded-xl hover:bg-white/10" aria-label="Navigation öffnen"><span className="text-lg">{open ? "×" : "☰"}</span></button>
          </div>
          {open && <div className="mt-2 p-2 rounded-2xl border border-white/20 bg-shell/95 text-white backdrop-blur-xl shadow-xl">{NAV.map((item) => <Link onClick={() => setOpen(false)} key={item.href} href={item.href} className={`flex items-center gap-3 p-3 rounded-xl ${isActive(pathname, item.href) ? "bg-white/10" : ""}`}><Icon name={item.icon}/><span className="text-sm font-medium">{item.label}</span></Link>)}</div>}
        </div>

        <nav className="lg:hidden fixed z-40 bottom-3 left-3 right-3 pointer-events-none safe-bottom">
          <div className="pointer-events-auto mx-auto max-w-md h-[68px] rounded-panel border border-white/50 bg-shell/92 text-white backdrop-blur-xl shadow-shell-nav grid grid-cols-4 p-1.5">
            {NAV.map((item) => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} className={`relative rounded-[18px] grid place-items-center transition ${active ? "bg-gradient-to-br from-fuchsia-500/30 to-cyan-400/20 text-white" : "text-white/45"}`}><Icon name={item.icon} active={active}/>{active && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,.9)]"/>}</Link>; })}
          </div>
        </nav>
      </>}
      <main className={showShell ? "lg:pl-[286px]" : ""}>
        <div className={showShell ? "min-h-screen px-3 pt-[76px] pb-[96px] lg:px-8 lg:pt-8 lg:pb-8" : ""}>{children}</div>
      </main>
    </div>
  );
}
