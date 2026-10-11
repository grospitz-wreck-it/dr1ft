import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  LayoutGrid,
  Gauge,
  MessagesSquare,
  MessageSquare,
  Sparkles,
  Users,
  Library,
  Building2,
} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DR1FT — Redaktion",
};

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

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = headers();
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const host =
    requestHeaders.get("x-dr1ft-host") ??
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "";
  const hostname = host.split(",")[0].trim().split(":")[0].toLowerCase();
  const schoolHost = (process.env.SCHOOL_HOST ?? "schule.dr1ft.de").toLowerCase();

  const isPublicAuthPage = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // The school portal renders its own navigation. Keep it outside the editorial shell
  // so school admins never get two sidebars when arriving via schule.dr1ft.de.
  const isSchoolDetailPage = pathname.startsWith("/schools/") && pathname !== "/schools";

  if (isPublicAuthPage || hostname === schoolHost || isSchoolDetailPage) {
    return (
      <html lang="de">
        <body className="font-sans">{children}</body>
      </html>
    );
  }

  return (
    <html lang="de">
      <body className="font-sans">
        <div className="min-h-screen flex bg-canvas">
          <aside className="editorial-sidebar sticky top-0 flex h-screen w-[252px] shrink-0 flex-col">
            <Link href="/" className="editorial-brand">
              <span className="editorial-brand-mark">d.</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold tracking-tight text-slate-950">DR1FT</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">Content Studio</span>
              </span>
            </Link>

            <div className="px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Arbeitsbereiche</div>
            <nav aria-label="Hauptnavigation" className="px-3">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`editorial-nav-link ${active ? "editorial-nav-link-active" : ""}`}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                        <span className="min-w-0 flex-1">{item.label}</span>
                        {active && <span className="editorial-nav-indicator" aria-hidden="true" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-auto border-t border-slate-200/80 p-4">
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700">Redaktionsbereich</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">Szenarien, Lerninhalte und Prüfaktionen an einem Ort.</p>
              </div>
            </div>
          </aside>

          <div className="editorial-main min-w-0 flex-1">
            <header className="editorial-topbar">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">DR1FT / REDAKTION</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Lerninhalte gestalten</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 sm:inline-flex">Content Studio</span>
                <span className="editorial-avatar" aria-label="DR1FT Redaktion">D</span>
              </div>
            </header>
            <main className="editorial-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
