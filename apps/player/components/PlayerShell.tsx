"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, Sparkles, Moon, Sun } from "lucide-react";
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
  avatarSeed: string;
};

export function PlayerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = supabaseBrowserClient();
  const [user, setUser] = useState<{ displayName: string; username: string; avatarSeed: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
  const [activityRealtime, setActivityRealtime] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("dr1ft-player-theme");
    const enabled = saved === "dark";
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark-mode", enabled);
  }, []);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark-mode", next);
      window.localStorage.setItem("dr1ft-player-theme", next ? "dark" : "light");
      return next;
    });
  }

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
    let mounted = true;
    async function checkUnreadMessages() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { if (mounted) setHasUnreadMessages(false); return; }
      const { data: classInstanceId, error: classError } = await supabase.rpc("get_current_class_instance_id");
      if (classError || !classInstanceId) { if (mounted) setHasUnreadMessages(false); return; }
      const { data: deliveries, error: deliveryError } = await supabase.from("scenario_message_deliveries").select("id").eq("class_instance_id", classInstanceId).not("delivered_at", "is", null).limit(100);
      const ids = deliveryError ? [] : (deliveries ?? []).map((delivery) => delivery.id);
      const { data: reads, error: readError } = ids.length
        ? await supabase.from("scenario_message_reads").select("delivery_id").eq("user_id", authUser.id).in("delivery_id", ids)
        : { data: [], error: null };
      const { data: directUnread, error: directError } = await supabase
        .from("student_direct_messages")
        .select("id")
        .eq("class_instance_id", classInstanceId)
        .eq("recipient_id", authUser.id)
        .is("read_at", null)
        .limit(1);
      if (!mounted) return;
      const hasUnreadScenario = !deliveryError && !readError && ids.some((id) => !(reads ?? []).some((read) => read.delivery_id === id));
      const hasUnreadDirect = !directError && (directUnread ?? []).length > 0;
      setHasUnreadMessages(hasUnreadScenario || hasUnreadDirect);
    }
    void checkUnreadMessages();
    const handleMessagesRead = () => { void checkUnreadMessages(); };
    window.addEventListener("dr1ft:messages-read", handleMessagesRead);
    const interval = window.setInterval(() => { void checkUnreadMessages(); }, 15000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("dr1ft:messages-read", handleMessagesRead);
    };
  }, [supabase, pathname, user?.username]);
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
          .select("id, user_id, content_item_id, interaction_type, created_at, user_profiles(display_name, avatar_seed)")
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

      const commentActorIds = (comments ?? []).map((row: any) => typeof row.extra?.userId === "string" ? row.extra.userId : null).filter((id): id is string => Boolean(id));
      const { data: commentProfiles } = commentActorIds.length ? await supabase.from("user_profiles").select("id, avatar_seed, display_name").in("id", Array.from(new Set(commentActorIds))) : { data: [] as { id: string; avatar_seed: string | null; display_name: string | null }[] };
      const commentProfileById = new Map((commentProfiles ?? []).map((profile) => [profile.id, profile]));
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
          avatarSeed: profile?.avatar_seed || row.user_id,
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
          avatarSeed: (actorId ? commentProfileById.get(actorId)?.avatar_seed : null) || actorId || row.id,
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
        <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"} title={darkMode ? "Hellmodus" : "Dunkelmodus"} className="fixed right-4 top-4 z-[60] hidden h-11 w-11 place-items-center rounded-2xl border border-white/60 bg-white/80 text-violet-700 shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white lg:grid lg:right-8 lg:top-5">
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <aside className="player-sidebar fixed z-40 inset-y-0 left-0 w-[286px] p-4 pointer-events-none">
          <div className="pointer-events-auto w-full rounded-panel border border-white/20 bg-shell/95 text-white shadow-shell backdrop-blur-2xl flex flex-col overflow-hidden relative">
            <div className="absolute -top-20 -right-16 w-48 h-48 rounded-full bg-social-pink/25 blur-3xl" />
            <div className="absolute bottom-20 -left-20 w-44 h-44 rounded-full bg-social-blue/20 blur-3xl" />
            <div className="relative px-6 pt-6 pb-5">
              <Link href="/feed" aria-label="DR1FT – Feed" className="group inline-flex items-center gap-3">
                <img
                  src="/branding/drift-logo-appstore-transparent.webp"
                  alt=""
                  aria-hidden="true"
                  className="h-12 w-12 shrink-0 object-contain transition duration-300 group-hover:scale-[1.03]"
                  fetchPriority="high"
                />
                <span className="font-display text-[23px] font-bold tracking-[-0.04em] text-white transition-colors group-hover:text-white/90">DR1FT</span>
              </Link>
            </div>
            <div className="relative px-3 flex-1">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Dein Space</div>
              <nav className="space-y-1.5">
                {NAV.map((item) => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} className={`group relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 ${active ? "bg-gradient-to-r from-social-pink/25 via-social-violet/20 to-social-blue/10 text-white shadow-inner" : "text-white/55 hover:bg-white/[.07] hover:text-white"}`}>
                  <span className={`relative grid place-items-center w-9 h-9 rounded-xl transition-all ${active ? "bg-white/10 text-social-blue" : "bg-white/[.025] group-hover:bg-white/[.08]"}`}><Icon name={item.icon} active={active} />{item.label === "Nachrichten" && hasUnreadMessages && <span aria-label="Ungelesene Nachrichten" className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-social-pink shadow-[0_0_10px_rgba(236,72,153,.75)]" />}</span>
                  <span className="font-medium text-sm">{item.label}</span>
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
                          <span className="relative mt-0.5 h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-social-pink via-social-violet to-social-blue p-[1.5px]"><img src={avatarUrl(activity.avatarSeed, 72)} alt="" className="h-full w-full rounded-[10px] bg-shell-surface object-cover" /><span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-shell bg-shell text-cyan-200"><ActivityIcon className="h-2.5 w-2.5"/></span></span>
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

        <div className="player-mobile-header fixed inset-x-0 top-0 lg:hidden z-50 m-0 w-full rounded-none border-0 border-b border-violet-200/70 bg-white/95 text-slate-900 shadow-none backdrop-blur-xl">
          <div className="flex min-h-[68px] w-full items-center gap-2 px-3 pt-[env(safe-area-inset-top)]">
            <Link href="/feed" aria-label="DR1FT – Feed" className="flex min-w-0 shrink-0 items-center gap-1.5">
              <img src="/branding/drift-logo-appstore-transparent.webp" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
              <span className="font-display text-base font-bold tracking-[-0.05em]">DR1FT</span>
            </Link>
            <nav aria-label="Hauptnavigation" className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
              {NAV.map((item) => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition ${active ? "bg-violet-100 text-violet-900 dark:bg-violet-500/25 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-white/75 dark:hover:bg-white/10"}`}><Icon name={item.icon} active={active}/><span>{item.label}</span>{item.label === "Nachrichten" && hasUnreadMessages && <span aria-label="Ungelesene Nachrichten" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,.8)]"/>}</Link>; })}
            </nav>
            <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-violet-700 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-white/10">{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <Link href="/profile" aria-label="Mein Profil" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-300 p-[2px]">
              <img src={avatarUrl(user.avatarSeed, 80)} alt="" className="h-full w-full rounded-[10px] bg-white object-cover" />
            </Link>
          </div>
        </div>
      </>}
      <main className={showShell ? "lg:pl-[286px]" : ""}>
        <div className={showShell ? "min-h-screen px-3 pt-[76px] pb-6 sm:px-4 lg:px-8 lg:pt-8 lg:pb-8" : ""}>{children}</div>
      </main>
    </div>
  );
}
