import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  LayoutGrid,
  MessagesSquare,
  MessageSquare,
  Sparkles,
  Users,
  Library,
  Building2,
} from "lucide-react";
import { supabaseServerClient } from "../lib/supabaseServerClient";
import "./globals.css";

export const metadata: Metadata = {
  title: "DR1FT — Redaktion",
};

const NAV_ITEMS = [
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
  const pathname = headers().get("x-pathname") ?? "";

  const isPublicAuthPage = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublicAuthPage) {
    return (
      <html lang="de">
        <body>{children}</body>
      </html>
    );
  }

  const isSchoolPortalPath =
    pathname === "/school-admin" ||
    pathname.startsWith("/school-admin/") ||
    /^\/schools\/[^/]+$/.test(pathname);

  if (isSchoolPortalPath) {
    const supabase = supabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: staff } = user
      ? await supabase
          .from("platform_staff")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

    if (staff?.role !== "platform_admin") {
      return (
        <html lang="de">
          <body className="font-sans">{children}</body>
        </html>
      );
    }
  }

  return (
    <html lang="de">
      <body className="font-sans">
        <div className="min-h-screen flex bg-canvas">
          <nav className="w-56 shrink-0 border-r border-border bg-panel min-h-screen sticky top-0 flex flex-col">
            <div className="px-4 py-4 border-b border-border">
              <p className="font-semibold text-sm text-slate-900">DR1FT</p>
              <p className="text-xs2 text-slate-500">Redaktion</p>
            </div>

            <ul className="flex-1 py-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-canvas hover:text-slate-900"
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </body>
    </html>
  );
}
