"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { avatarUrl } from "../lib/avatar";

type NavItem = { href: string; label: string; icon: "home" | "message" | "users" | "user" };

const NAV: NavItem[] = [
  { href: "/feed", label: "Feed", icon: "home" },
  { href: "/messages", label: "Nachrichten", icon: "message" },
  { href: "/group-chat", label: "Gruppen", icon: "users" },
  { href: "/profile", label: "Profil", icon: "user" },
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

export function PlayerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = supabaseBrowserClient();
  const [user, setUser] = useState<{ displayName: string; username: string; avatarSeed: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadProfile(authUser: { id: string; email?: string | null }) {
      const { data: profile } = await supabase.from("user_profiles").select("display_name, username, avatar_seed").eq("id", authUser.id).maybeSingle();
      if (!mounted) return;
      setUser({ displayName: profile?.display_name || authUser.email?.split("@")[0] || "DR1FT", username: profile?.username || "drifter", avatarSeed: profile?.avatar_seed || authUser.id });
    }
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) await loadProfile(authUser); else if (mounted) setUser(null);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setUser(null); return; }
      window.setTimeout(() => { void loadProfile(session.user); }, 0);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  const publicRoute = pathname === "/login" || pathname === "/register" || pathname === "/";
  const showShell = !!user && !publicRoute;

  return (
    <div className="min-h-screen">
      {showShell && <>
        <aside className="hidden lg:flex fixed z-40 inset-y-0 left-0 w-[286px] p-4 pointer-events-none">
          <div className="pointer-events-auto w-full rounded-[30px] border border-white/20 bg-[#171027]/95 text-white shadow-[0_24px_80px_rgba(42,20,75,.28)] backdrop-blur-2xl flex flex-col overflow-hidden relative">
            <div className="absolute -top-20 -right-16 w-48 h-48 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <div className="absolute bottom-20 -left-20 w-44 h-44 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative px-6 pt-6 pb-5">
              <Link href="/feed" className="group inline-flex items-center gap-3">
                <span className="grid place-items-center w-12 h-12 rounded-[17px] bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-[0_10px_28px_rgba(168,85,247,.38)] group-hover:rotate-[-4deg] group-hover:scale-105 transition duration-300"><span className="font-display text-xl font-bold tracking-[-0.08em]">d.</span></span>
                <span><span className="block font-display font-bold text-[23px] tracking-[-0.05em]">DR1FT</span><span className="block text-[10px] uppercase tracking-[0.19em] text-white/45">medienkompetenz</span></span>
              </Link>
            </div>
            <div className="relative px-3 flex-1">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Dein Space</div>
              <nav className="space-y-1.5">
                {NAV.map((item) => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} className={`group relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 ${active ? "bg-gradient-to-r from-fuchsia-500/25 via-violet-500/20 to-cyan-400/10 text-white shadow-inner" : "text-white/55 hover:bg-white/[.07] hover:text-white"}`}>
                  <span className={`grid place-items-center w-9 h-9 rounded-xl transition-all ${active ? "bg-white/10 text-cyan-200" : "bg-white/[.025] group-hover:bg-white/[.08]"}`}><Icon name={item.icon} active={active} /></span>
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.label === "Nachrichten" && <span className="ml-auto w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_0_4px_rgba(236,72,153,.10)]" />}
                  {active && <span className="absolute right-2 w-1 h-7 rounded-full bg-gradient-to-b from-fuchsia-400 to-cyan-300 shadow-[0_0_14px_rgba(34,211,238,.6)]" />}
                </Link>; })}
              </nav>
              <div className="mt-7 mx-2 rounded-[22px] p-4 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/15 to-cyan-400/10 border border-white/10">
                <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,.12),0_0_12px_rgba(110,231,183,.55)]"/><span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-white/45">DR1FT läuft</span></div>
                <p className="font-display font-semibold text-sm leading-snug text-white">Schau dich um. Nicht alles ist so, wie es aussieht.</p>
                <p className="text-[11px] text-white/45 mt-2 leading-4">Dein Feed verändert sich mit dem, was du tust.</p>
              </div>
            </div>
            <div className="relative p-3 mt-auto border-t border-white/[.06]">
              <Link href="/profile" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[.07] transition-colors">
                <span className="relative rounded-[13px] p-[2px] bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-300"><img src={avatarUrl(user.avatarSeed, 80)} alt="" className="w-10 h-10 rounded-[11px] bg-[#241a3b] object-cover" /></span>
                <div className="min-w-0 flex-1"><div className="font-medium text-sm truncate">{user.displayName}</div><div className="text-[11px] text-white/40 truncate">@{user.username}</div></div>
                <span className="text-white/35">•••</span>
              </Link>
            </div>
          </div>
        </aside>

        <div className="lg:hidden fixed z-50 top-3 left-3 right-3 pointer-events-none">
          <div className="pointer-events-auto h-14 rounded-2xl border border-white/50 bg-[#171027]/90 text-white backdrop-blur-xl shadow-[0_12px_42px_rgba(42,20,75,.25)] flex items-center justify-between px-3">
            <Link href="/feed" className="flex items-center gap-2.5"><span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 font-display font-bold">d.</span><span className="font-display font-bold tracking-[-0.04em]">DR1FT</span></Link>
            <button onClick={() => setOpen((v) => !v)} className="touch-target grid place-items-center rounded-xl hover:bg-white/10" aria-label="Navigation öffnen"><span className="text-lg">{open ? "×" : "☰"}</span></button>
          </div>
          {open && <div className="mt-2 p-2 rounded-2xl border border-white/20 bg-[#171027]/95 text-white backdrop-blur-xl shadow-xl">{NAV.map((item) => <Link onClick={() => setOpen(false)} key={item.href} href={item.href} className={`flex items-center gap-3 p-3 rounded-xl ${isActive(pathname, item.href) ? "bg-white/10" : ""}`}><Icon name={item.icon}/><span className="text-sm font-medium">{item.label}</span></Link>)}</div>}
        </div>

        <nav className="lg:hidden fixed z-40 bottom-3 left-3 right-3 pointer-events-none safe-bottom">
          <div className="pointer-events-auto mx-auto max-w-md h-[68px] rounded-[24px] border border-white/50 bg-[#171027]/92 text-white backdrop-blur-xl shadow-[0_16px_48px_rgba(42,20,75,.28)] grid grid-cols-4 p-1.5">
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
