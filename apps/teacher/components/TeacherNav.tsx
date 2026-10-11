"use client";

import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  School,
  Settings,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

type NavItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  count?: number;
};

function NavItem({ href, label, icon, active, count }: NavItemProps) {
  return (
    <a
      href={href}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-violet-50 text-violet-700"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span>{label}</span>

      {typeof count === "number" && (
        <span className={`ml-auto text-[10px] ${active ? "opacity-50" : "text-slate-400"}`}>
          {count}
        </span>
      )}
    </a>
  );
}

export function TeacherNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [classCount, setClassCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [classAccessCode, setClassAccessCode] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const publicRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/update-password");

  useEffect(() => {
    if (publicRoute) return;

    const supabase = client();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);

      if (!user) return;
      const classMatch = pathname.match(/^\/classes\/([^/]+)$/);
      if (classMatch) {
        const { data: classRow } = await supabase
          .from("class_instances")
          .select("access_code")
          .eq("id", classMatch[1])
          .maybeSingle();
        setClassAccessCode(classRow?.access_code ?? null);
      } else {
        setClassAccessCode(null);
      }


      const { data: schoolMemberships } = await supabase
        .from("school_memberships")
        .select("school_id, created_at")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: true });

      const { data: teacherClasses } = await supabase
        .from("class_instance_memberships")
        .select("class_instance_id, class_instances(school_id)")
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .is("left_at", null);

      const schoolIds = Array.from(new Set([
        ...(schoolMemberships ?? []).map((row) => row.school_id),
        ...(teacherClasses ?? []).map((row: any) => row.class_instances?.school_id),
      ].filter(Boolean)));

      if (schoolIds.length) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("id, name, region")
          .in("id", schoolIds);
        const primarySchool = (schoolData ?? []).find((row) => row.id === schoolIds[0]);
        setSchool(primarySchool?.name ?? null);
        setRegion(primarySchool?.region ?? null);
      }

      const classIds = Array.from(
        new Set((teacherClasses ?? []).map((row) => row.class_instance_id)),
      );

      setClassCount(classIds.length);

      if (classIds.length) {
        const { count } = await supabase
          .from("class_instance_memberships")
          .select("user_id", { count: "exact", head: true })
          .in("class_instance_id", classIds)
          .eq("role", "student")
          .is("left_at", null);

        setStudentCount(count ?? 0);
      }
    })();
  }, [publicRoute, pathname]);

  if (publicRoute) return null;

  const overviewActive = pathname === "/";
  const classesActive =
    pathname === "/classes" ||
    pathname.startsWith("/classes/") ||
    pathname.startsWith("/grades");

  async function logout() {
    await client().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="editorial-topbar relative z-30 lg:ml-[252px]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">DR1FT / LEHRKRAFT</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">Unterricht gestalten</p>
        </div>
        <div className="relative flex items-center gap-3">
          {classAccessCode && (
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:flex">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Klassencode</span>
              <code className="font-mono text-sm font-semibold tracking-[0.14em] text-slate-800">{classAccessCode}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(classAccessCode)} className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">Kopieren</button>
            </div>
          )}
          <span className="hidden max-w-[260px] truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 sm:inline-flex" title={school ? `${school}${region ? " · " + region : ""}` : "Noch keine Schule zugeordnet"}>{school ? `${school}${region ? " · " + region : ""}` : "Noch keine Schule zugeordnet"}</span>
          <button type="button" onClick={() => setAccountOpen((open) => !open)} className="editorial-avatar" aria-label="Kontomenü öffnen">D</button>
          {accountOpen && (
            <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Lehrkraft</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{email ?? "Konto"}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{school ?? "DR1FT"}{region ? " · " + region : ""}</p>
              </div>
              <div className="p-1.5"><a href="/account" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"><Settings className="h-4 w-4 text-slate-400" />Einstellungen</a></div>
              <div className="border-t border-slate-200 p-1.5"><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"><LogOut className="h-4 w-4" />Abmelden</button></div>
            </div>
          )}
        </div>
      </header>
      <div className="editorial-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[252px] overflow-y-auto lg:block">
        <aside className="flex min-h-full w-full flex-col">
          <a href="/" className="editorial-brand">
            <img src="/branding/drift-logo-appstore-transparent.webp" alt="" aria-hidden="true" className="h-12 w-12 shrink-0 rounded-xl object-contain" />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold tracking-tight text-slate-950">DR1FT</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">Lehrkraft Studio</span>
            </span>
          </a>
          <div className="px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Arbeitsbereiche</div>
          <nav aria-label="Hauptnavigation" className="px-3">

            <NavItem
              href="/"
              label="Übersicht"
              icon={<LayoutDashboard className="h-4 w-4" />}
              active={overviewActive}
            />

            <div className="mt-1">
              <NavItem
                href="/classes"
                label="Klassen"
                icon={<School className="h-4 w-4" />}
                active={classesActive}
                count={classCount}
              />
            </div>

            <div className="mt-1">
              <NavItem
                href="/students"
                label="Schüler:innen"
                icon={<Users className="h-4 w-4" />}
                active={pathname.startsWith("/students")}
                count={studentCount}
              />
            </div>

            <div className="mt-1">
              <NavItem
                href="/insights"
                label="Insights"
                icon={<BarChart3 className="h-4 w-4" />}
                active={pathname.startsWith("/insights")}
              />
            </div>

            <div className="my-2 border-t border-slate-200/80" />

            <NavItem
              href="/account"
              label="Einstellungen"
              icon={<Settings className="h-4 w-4" />}
              active={pathname.startsWith("/account")}
            />
          </nav>
          <div className="mt-auto border-t border-slate-200/80 p-4">
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold text-slate-700">Lehrkraftbereich</span></div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">Klassen, Schüler:innen und Lernfortschritte an einem Ort.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}