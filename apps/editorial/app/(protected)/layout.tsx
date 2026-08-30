import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  MessagesSquare,
  MessageSquare,
  Route,
  Sparkles,
  Users,
  Library,
  Home,
  School,
} from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { SignOutButton } from "./SignOutButton";

const NAV_ITEMS = [
  { href: "/", label: "Übersicht", icon: Home },
  { href: "/content", label: "Content-Bibliothek", icon: Library },
  { href: "/scenarios", label: "Szenarien", icon: LayoutGrid },
  { href: "/missions", label: "Missionen & Arcs", icon: Route },
  { href: "/npc-dialogs", label: "NPC-Dialoge", icon: MessagesSquare },
  { href: "/group-chats", label: "Gruppenchats", icon: MessageSquare },
  { href: "/ambient-content", label: "Ambient-Generator", icon: Sparkles },
  { href: "/staff", label: "Redaktionsteam", icon: Users },
  { href: "/schools", label: "Schulen & Rollen", icon: School },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: staffRow } = await supabase
    .from("platform_staff")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staffRow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas font-sans">
        <div className="text-center max-w-sm px-6">
          <p className="text-lg font-semibold text-slate-900 mb-2">
            Kein Zugriff
          </p>
          <p className="text-sm text-slate-500">
            Dieser Bereich ist der Redaktion vorbehalten. Falls du Lehrkraft
            bist, nutze bitte die separate Lehrkraft-Anwendung.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-canvas">
      <nav className="w-60 shrink-0 border-r border-border bg-panel min-h-screen sticky top-0 flex flex-col">
        <div className="px-4 py-5 border-b border-border">
          <Link href="/" className="block">
            <p className="font-semibold text-sm text-slate-900">DR1FT</p>
            <p className="text-xs2 text-slate-500">Redaktion</p>
          </Link>
        </div>

        <ul className="flex-1 py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-canvas hover:text-slate-900 transition"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border px-4 py-4">
          <p className="text-[11px] text-slate-400">Angemeldet als</p>
          <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
            {user.email ?? "Redaktion"}
          </p>
          <SignOutButton />
        </div>
      </nav>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
