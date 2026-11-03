"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Heart, MessageCircle, Share2, Sparkles, Moon, Sun, X } from "lucide-react";
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
  const supabase = useMemo(() => supabaseBrowserClient(), []);
  const [user, setUser] = useState<{ id: string; displayName: string; username: string; avatarSeed: string } | null>(null);
  const activeScenarioIdRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
  const [activityRealtime, setActivityRealtime] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("dr1ft-player-theme");
    const enabled = saved === "dark";
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark-mode", enabled);
  }, []);

  useEffect(() => {
    if (!activityOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActivityOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activityOpen]);

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
        id: authUser.id,
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
    if (previousUserIdRef.current && previousUserIdRef.current !== (user?.id ?? null)) activeScenarioIdRef.current = null;
    previousUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let classInstanceId: string | null = null;
    let recordingDisabled = false;
    let sending = false;
    let lastTickAt = performance.now();
    let lastActivityAt = lastTickAt;
    let lastTickVisible = document.visibilityState === "visible";
    const idleTimeoutMs = 90_000;
    const learningCards = new Map<string, string>();
    const pendingMs = new Map<string, { activityType: "feed" | "other" | "learning_cards"; scenarioId: string | null; milliseconds: number }>();
    const queuedEvents: Array<{ eventId: string; activityType: "feed" | "other" | "learning_cards"; scenarioId: string | null; durationSeconds: number }> = [];

    function createEventId() {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function currentContext() {
      if (learningCards.size) {
        const scenarioIds = new Set(learningCards.values());
        return { activityType: "learning_cards" as const, scenarioId: scenarioIds.size === 1 ? Array.from(scenarioIds)[0] : null };
      }
      return {
        activityType: pathname.startsWith("/feed") ? "feed" as const : "other" as const,
        scenarioId: activeScenarioIdRef.current,
      };
    }

    function accrue(now: number, visible = document.visibilityState === "visible") {
      if (visible && lastTickVisible) {
        const activeUntil = Math.min(now, lastActivityAt + idleTimeoutMs);
        const milliseconds = Math.max(0, activeUntil - lastTickAt);
        if (milliseconds > 0) {
          const context = currentContext();
          const key = `${context.activityType}:${context.scenarioId ?? "general"}`;
          const current = pendingMs.get(key) ?? { ...context, milliseconds: 0 };
          current.milliseconds += milliseconds;
          pendingMs.set(key, current);
        }
      }
      lastTickAt = now;
      lastTickVisible = visible;
    }

    function queueCompletedIntervals() {
      for (const [key, pending] of pendingMs) {
        const wholeSeconds = Math.min(60, Math.floor(pending.milliseconds / 1000));
        if (wholeSeconds < 1) continue;
        const eventId = createEventId();
        queuedEvents.push({ eventId, activityType: pending.activityType, scenarioId: pending.scenarioId, durationSeconds: wholeSeconds });
        pending.milliseconds -= wholeSeconds * 1000;
        if (pending.milliseconds <= 0) pendingMs.delete(key);
      }
    }

    async function persistQueuedEvents() {
      if (!classInstanceId || recordingDisabled || sending || cancelled) return;
      queueCompletedIntervals();
      if (!queuedEvents.length) return;
      sending = true;
      const events = queuedEvents.slice();
      for (const event of events) {
        let error: { code?: string } | null = null;
        try {
          ({ error } = await supabase.rpc("record_student_activity_time_v1", {
            p_event_id: event.eventId,
            p_class_id: classInstanceId,
            p_activity_type: event.activityType,
            p_duration_seconds: event.durationSeconds,
            p_scenario_id: event.scenarioId,
          }));
        } catch {
          break;
        }
        if (error) {
          if (error.code === "PGRST202" || error.code === "42883") {
            recordingDisabled = true;
            queuedEvents.length = 0;
          }
          break;
        }
        const index = queuedEvents.findIndex((queued) => queued.eventId === event.eventId);
        if (index >= 0) queuedEvents.splice(index, 1);
      }
      sending = false;
    }

    function handleInput() {
      const now = performance.now();
      if (document.visibilityState !== "visible") return;
      accrue(now, true);
      lastActivityAt = now;
    }

    function handleVisibilityChange() {
      const now = performance.now();
      if (document.visibilityState === "hidden") {
        accrue(now, true);
        void persistQueuedEvents();
      } else {
        lastTickAt = now;
        lastActivityAt = now;
        lastTickVisible = true;
      }
    }

    function handleLearningCardVisibility(event: Event) {
      const detail = (event as CustomEvent<{ cardId?: string; scenarioId?: string; visible?: boolean }>).detail;
      if (!detail?.cardId) return;
      accrue(performance.now());
      if (detail.visible && detail.scenarioId) learningCards.set(detail.cardId, detail.scenarioId);
      else learningCards.delete(detail.cardId);
      void persistQueuedEvents();
    }

    function handleScenarioStarted(event: Event) {
      const detail = (event as CustomEvent<{ scenarioId?: string | null; scenarioIds?: string[] }>).detail;
      accrue(performance.now());
      const ids = detail?.scenarioIds ?? [];
      activeScenarioIdRef.current = ids.length === 1 ? ids[0] : detail?.scenarioId ?? null;
      void persistQueuedEvents();
    }

    void (async () => {
      const { data, error } = await supabase.rpc("get_current_class_instance_id");
      if (cancelled || error || !data) return;
      classInstanceId = data as string;
      lastTickAt = performance.now();
      lastActivityAt = lastTickAt;
      lastTickVisible = document.visibilityState === "visible";
    })();

    const activityEvents = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
    activityEvents.forEach((type) => window.addEventListener(type, handleInput, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("dr1ft:learning-card-visibility", handleLearningCardVisibility);
    window.addEventListener("dr1ft:scenario-started", handleScenarioStarted);
    const interval = window.setInterval(() => {
      accrue(performance.now());
      void persistQueuedEvents();
    }, 15_000);

    return () => {
      accrue(performance.now());
      void persistQueuedEvents();
      cancelled = true;
      window.clearInterval(interval);
      activityEvents.forEach((type) => window.removeEventListener(type, handleInput));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("dr1ft:learning-card-visibility", handleLearningCardVisibility);
      window.removeEventListener("dr1ft:scenario-started", handleScenarioStarted);
    };
  }, [supabase, pathname, user?.id]);

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
              <span className="hidden font-display text-base font-bold tracking-[-0.05em] sm:inline">DR1FT</span>
            </Link>
            <nav aria-label="Hauptnavigation" className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
              {NAV.map((item) => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-1.5 text-[11px] font-semibold shadow-sm transition sm:px-2 ${active ? "border-transparent bg-gradient-to-br from-fuchsia-600 via-violet-600 to-cyan-600 text-white shadow-violet-500/25" : "border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-400/30 dark:bg-[#29213d] dark:text-violet-100 dark:hover:border-violet-300/60 dark:hover:bg-[#382b50]"}`}><Icon name={item.icon} active={active}/><span className="hidden sm:inline">{item.label}</span>{item.label === "Nachrichten" && hasUnreadMessages && <span aria-label="Ungelesene Nachrichten" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,.8)]"/>}</Link>; })}
            </nav>
            <button type="button" onClick={() => setActivityOpen((value) => !value)} aria-label={`Aktivitätsfeed${liveActivity.length ? `, ${liveActivity.length} Aktivitäten` : ""}`} aria-expanded={activityOpen} aria-haspopup="dialog" className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-sm transition ${activityOpen ? "border-transparent bg-gradient-to-br from-fuchsia-600 via-violet-600 to-cyan-600 text-white shadow-violet-500/25" : "border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-400/30 dark:bg-[#29213d] dark:text-cyan-200 dark:hover:border-cyan-300/50 dark:hover:bg-[#382b50]"}`}><Activity className="h-5 w-5" />{liveActivity.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white dark:bg-cyan-400 dark:ring-[#171126]" />}</button>
            <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-200 bg-violet-50 text-violet-900 shadow-sm transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-400/30 dark:bg-[#29213d] dark:text-cyan-200 dark:hover:border-cyan-300/50 dark:hover:bg-[#382b50]">{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <Link href="/profile" aria-label="Mein Profil" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-300 p-[2px]">
              <img src={avatarUrl(user.avatarSeed, 80)} alt="" className="h-full w-full rounded-[10px] bg-white object-cover" />
            </Link>
          </div>
        </div>
        {activityOpen && <>
          <button type="button" className="fixed inset-0 z-[65] bg-slate-950/20 lg:hidden" aria-label="Aktivitätsfeed schließen" onClick={() => setActivityOpen(false)} />
          <section role="dialog" aria-modal="true" aria-label="Aktivität in deiner Klasse" className="player-mobile-activity fixed inset-x-2 top-[calc(76px+env(safe-area-inset-top))] z-[70] max-h-[min(68vh,520px)] overflow-hidden rounded-2xl border shadow-2xl lg:hidden">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><div><h2 className="text-sm font-bold">Aktivität in deiner Klasse</h2><p className="mt-0.5 text-[11px] opacity-70">{liveActivity.length ? `${liveActivity.length} aktuelle Aktivitäten` : "Noch keine neuen Aktivitäten"} · {activityRealtime ? "Live" : "Sync"}</p></div><button type="button" onClick={() => setActivityOpen(false)} aria-label="Aktivitätsfeed schließen" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl opacity-70 hover:bg-black/5 dark:hover:bg-white/10"><X className="h-4 w-4" /></button></div>
            <div className="player-mobile-activity-list overflow-y-auto p-3" aria-live="polite">{liveActivity.length ? <div className="space-y-1">{liveActivity.map((activity) => { const ActivityIcon = activity.kind === "like" ? Heart : activity.kind === "share" ? Share2 : MessageCircle; return <Link key={activity.id} href={`/feed#post-${activity.contentItemId}`} onClick={() => setActivityOpen(false)} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-violet-50 dark:hover:bg-white/[.06]"><span className="relative mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-social-pink via-social-violet to-social-blue p-[1.5px]"><img src={avatarUrl(activity.avatarSeed, 72)} alt="" className="h-full w-full rounded-[10px] object-cover" /><span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border bg-violet-950 text-cyan-200"><ActivityIcon className="h-2.5 w-2.5" /></span></span><span className="min-w-0 flex-1"><span className="block text-xs leading-4">{activity.text}</span><span className="mt-1 block text-[10px] opacity-60">{formatRelativeTime(activity.createdAt)}</span></span></Link>; })}</div> : <div className="px-4 py-10 text-center"><Sparkles className="mx-auto mb-2 h-5 w-5 opacity-50" /><p className="text-sm font-medium">Gerade ist es ruhig.</p><p className="mt-1 text-xs opacity-60">Neue Aktivitäten erscheinen hier live.</p></div>}</div>
          </section>
        </>}
      </>}
      <main className={showShell ? "lg:pl-[286px]" : ""}>
        <div className={showShell ? "min-h-screen px-3 pt-[76px] pb-6 sm:px-4 lg:px-8 lg:pt-8 lg:pb-8" : ""}>{children}</div>
      </main>
    </div>
  );
}
