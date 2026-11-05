"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { EditorialSidebar } from "./EditorialSidebar";

function client() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
export function EditorialAppShell({ children }: { children: ReactNode }) {
  const pathname = (usePathname() ?? "/").split("?")[0].replace(/\\/+$/, "") || "/";
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const isPublicAuthPage = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const isSchoolWorkspace = pathname.startsWith("/schools/");

  useEffect(() => {
    if (isPublicAuthPage) return;
    const supabase = client();
    let alive = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!alive || !user) return;
      setEmail(user.email ?? null);
      const { data } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (alive) setDisplayName(data?.display_name?.trim() || null);
    });
    return () => { alive = false; };
  }, [isPublicAuthPage]);

  async function logout() {
    await client().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (isPublicAuthPage || isSchoolWorkspace) return <>{children}</>;

  const label = displayName || email || "Mein Konto";
  const initial = (displayName || email || "D").charAt(0).toLocaleUpperCase("de-DE");
  return (
    <div className="min-h-screen flex bg-canvas">
      <EditorialSidebar />
      <div className="editorial-main min-w-0 flex-1">
        <header className="editorial-topbar">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">DR1FT / REDAKTION</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Lerninhalte gestalten</p>
          </div>
          <div className="relative flex items-center gap-3">
            <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 sm:inline-flex">Content Studio</span>
            <button type="button" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} aria-label="Kontomenü öffnen" className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-violet-50">
              <span className="editorial-avatar">{initial}</span><ChevronDown className={`h-4 w-4 text-slate-400 transition ${accountOpen ? "rotate-180" : ""}`} />
            </button>
            {accountOpen && <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3"><p className="truncate text-sm font-semibold text-slate-900">{label}</p><p className="mt-0.5 truncate text-xs text-slate-400">{email ?? "DR1FT-Konto"}</p></div>
              <div className="p-1.5"><a href="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"><Settings className="h-4 w-4 text-slate-400" />Mein Konto & Einstellungen</a></div>
              <div className="border-t border-slate-100 p-1.5"><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"><LogOut className="h-4 w-4" />Abmelden</button></div>
            </div>}
          </div>
        </header>
        <main className="editorial-content">{children}</main>
      </div>
    </div>
  );
}
