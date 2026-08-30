"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function client() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

export function TeacherNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const publicRoute = pathname === "/login" || pathname === "/signup" || pathname.startsWith("/reset-password") || pathname.startsWith("/update-password");

  useEffect(() => { if (!publicRoute) client().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, [publicRoute]);
  if (publicRoute) return null;

  async function logout() { await client().auth.signOut(); router.push("/login"); router.refresh(); }

  return <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75"><div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4"><a href="/classes" className="flex items-center gap-2.5"><span className="h-8 w-8 rounded-xl bg-slate-950 text-white grid place-items-center text-xs font-bold">D</span><span className="font-semibold tracking-tight text-slate-900">DR1FT</span><span className="hidden sm:inline text-xs text-slate-400 border-l border-border pl-2">Teacher</span></a><nav className="hidden md:flex items-center gap-1"><a href="/classes" className={`px-3 py-2 rounded-lg text-sm ${pathname.startsWith("/classes") ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>Dashboard</a></nav><div className="flex items-center gap-3"><div className="hidden sm:block text-right"><p className="text-xs font-medium text-slate-700 truncate max-w-52">{email ?? "Teacher"}</p><p className="text-[11px] text-slate-400">Lehrkraft</p></div><button type="button" onClick={logout} className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">Abmelden</button></div></div></header>;
}
