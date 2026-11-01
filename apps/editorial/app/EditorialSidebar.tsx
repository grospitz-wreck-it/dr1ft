"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Gauge, LayoutGrid, Library, MessageSquare, MessagesSquare, Sparkles, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/content", label: "Content-Bibliothek", icon: Library },
  { href: "/scenarios", label: "Szenarien", icon: LayoutGrid },
  { href: "/npc-dialogs", label: "NPC-Dialoge", icon: MessagesSquare },
  { href: "/group-chats", label: "Gruppenchats", icon: MessageSquare },
  { href: "/ambient-content", label: "Ambient-Generator", icon: Sparkles },
  { href: "/staff", label: "Redaktionsteam", icon: Users },
  { href: "/schools", label: "Schulen", icon: Building2 },
];

export function EditorialSidebar() {
  const pathname = (usePathname() ?? "/").split("?")[0].replace(/\/+$/, "") || "/";
  return <aside className="editorial-sidebar sticky top-0 flex h-screen w-[252px] shrink-0 flex-col">
    <Link href="/" className="editorial-brand">
      <img src="/branding/drift-logo-appstore-transparent.webp" alt="" aria-hidden="true" className="h-12 w-12 shrink-0 rounded-xl object-contain" />
      <span className="min-w-0"><span className="block text-[15px] font-bold tracking-tight text-slate-950">DR1FT</span><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">Content Studio</span></span>
    </Link>
    <div className="px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Arbeitsbereiche</div>
    <nav aria-label="Hauptnavigation" className="px-3"><ul className="space-y-1">{NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
      return <li key={item.href}><Link href={item.href} aria-current={active ? "page" : undefined} className={`editorial-nav-link ${active ? "editorial-nav-link-active" : ""}`}>
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} /><span className="min-w-0 flex-1">{item.label}</span>{active && <span className="editorial-nav-indicator" aria-hidden="true" />}
      </Link></li>;
    })}</ul></nav>
    <div className="mt-auto border-t border-slate-200/80 p-4"><div className="rounded-xl bg-slate-50 px-3 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold text-slate-700">Redaktionsbereich</span></div><p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">Szenarien, Lerninhalte und Prüfaktionen an einem Ort.</p></div></div>
  </aside>;
}
