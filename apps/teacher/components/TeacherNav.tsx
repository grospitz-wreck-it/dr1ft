"use client";

import {
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  School,
  Settings,
  UserRound,
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
          ? "bg-slate-950 text-white"
          : "text-slate-600 hover:bg-canvas"
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

      const { data: membership } = await supabase
        .from("school_memberships")
        .select("school_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membership?.school_id) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("name, region")
          .eq("id", membership.school_id)
          .maybeSingle();

        setSchool(schoolData?.name ?? null);
        setRegion(schoolData?.region ?? null);
      }

      const { data: teacherClasses } = await supabase
        .from("class_instance_memberships")
        .select("class_instance_id")
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .is("left_at", null);

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
  }, [publicRoute]);

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
      <header className="relative z-30 border-b border-border bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <a href="/classes" className="flex shrink-0 items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <span className="text-[10px] font-bold tracking-[0.08em]">
                  DR1FT
                </span>
              </div>
            </a>

            <div className="hidden h-6 w-px bg-border sm:block" />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {school ?? "DR1FT Teacher"}
              </p>

              <p className="truncate text-[11px] text-slate-400">
                {region ?? "Lehrkraft"}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-canvas"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-800">
                  Lehrkraft
                </p>
                <p className="text-[11px] text-slate-400">
                  {email ?? "Konto"}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                <UserRound className="h-4 w-4" />
              </div>

              <ChevronDown
                className={`hidden h-4 w-4 text-slate-400 transition sm:block ${
                  accountOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Lehrkraft
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {school ?? "DR1FT"}
                  </p>
                </div>

                <div className="p-1.5">
                  <a
                    href="/account"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-canvas"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Einstellungen
                  </a>
                </div>

                <div className="border-t border-border p-1.5">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Abmelden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto bg-canvas px-4 py-6 lg:block">
        <aside className="w-full">
          <nav className="sticky top-5 rounded-2xl border border-border bg-white p-2 shadow-sm">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Teacher
            </p>

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

            <div className="my-2 border-t border-border" />

            <NavItem
              href="/account"
              label="Einstellungen"
              icon={<Settings className="h-4 w-4" />}
              active={pathname.startsWith("/account")}
            />
          </nav>
        </aside>
      </div>
    </>
  );
}