"use client";

import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Copy,
  RefreshCw,
  Check,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { regenerateClassInstanceAccessCode } from "../app/classes/actions";

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
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" && (
        <span className={`ml-auto text-[10px] ${active ? "opacity-50" : "text-slate-400"}`}>
          {count}
        </span>
      )}
    </Link>
  );
}

export function TeacherNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState("Lehrkraft");
  const [school, setSchool] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [classAccessCode, setClassAccessCode] = useState<string | null>(null);
  const [classIdForCode, setClassIdForCode] = useState<string | null>(null);
  const [canRerollClassCode, setCanRerollClassCode] = useState(false);
  const [rerollingClassCode, setRerollingClassCode] = useState(false);
  const [copiedClassCode, setCopiedClassCode] = useState(false);
  const [classCodeError, setClassCodeError] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);

  const publicRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/update-password");

  // Account data is independent of the current route. Load it once and refresh
  // only after an explicit profile-updated event, not on every navigation.
  useEffect(() => {
    if (publicRoute) return;
    const supabase = client();
    let alive = true;

    async function loadAccountData(userId: string) {
      const [
        { data: profile },
        { data: memberships },
        { data: teacherClasses },
      ] = await Promise.all([
        supabase.from("user_profiles").select("display_name").eq("id", userId).maybeSingle(),
        supabase.from("school_memberships").select("school_id, role, created_at").eq("user_id", userId).eq("active", true).order("created_at", { ascending: true }),
        supabase.from("class_instance_memberships")
          .select("class_instance_id, class_instances(school_id)")
          .eq("user_id", userId)
          .eq("role", "teacher")
          .is("left_at", null),
      ]);
      if (!alive) return;

      setDisplayName(profile?.display_name?.trim() || null);
      const membership = memberships?.[0];
      setRole(
        membership?.role === "school_admin" ? "Schuladministration" :
        membership?.role === "school_lead" ? "Schulleitung" : "Lehrkraft"
      );

      const schoolIds = Array.from(new Set([
        ...(memberships ?? []).map((row) => row.school_id),
        ...(teacherClasses ?? []).map((row: any) => row.class_instances?.school_id),
      ].filter(Boolean)));
      const classIds = Array.from(new Set((teacherClasses ?? []).map((row) => row.class_instance_id)));

      const [schoolResult, studentResult] = await Promise.all([
        schoolIds.length
          ? supabase.from("schools").select("id, name, region").in("id", schoolIds)
          : Promise.resolve({ data: [] as any[] }),
        classIds.length
          ? supabase.from("class_instance_memberships")
              .select("user_id", { count: "exact", head: true })
              .in("class_instance_id", classIds)
              .eq("role", "student")
              .is("left_at", null)
          : Promise.resolve({ count: 0 }),
      ]);
      if (!alive) return;

      const primarySchool = (schoolResult.data ?? []).find((row: any) => row.id === schoolIds[0]);
      setSchool(primarySchool?.name ?? null);
      setRegion(primarySchool?.region ?? null);
      setStudentCount(studentResult.count ?? 0);
    }

    async function refreshAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      if (user) await loadAccountData(user.id);
    }

    void refreshAccount();
    function handleProfileUpdate() { void refreshAccount(); }
    window.addEventListener("drift:profile-updated", handleProfileUpdate);
    return () => {
      alive = false;
      window.removeEventListener("drift:profile-updated", handleProfileUpdate);
    };
  }, [publicRoute]);

  // Class-code permissions are route-specific; do not reload profile, school,
  // membership and student-count data just because the pathname changed.
  useEffect(() => {
    if (publicRoute || !userId) return;
    const classMatch = pathname.match(/^\/classes\/([^/]+)$/);
    if (!classMatch) {
      setClassAccessCode(null);
      setClassIdForCode(null);
      setCanRerollClassCode(false);
      return;
    }

    const supabase = client();
    let alive = true;
    const currentClassId = classMatch[1];
    setClassIdForCode(currentClassId);

    void (async () => {
      const { data: classRow } = await supabase
        .from("class_instances")
        .select("id,access_code,school_id")
        .eq("id", currentClassId)
        .maybeSingle();
      if (!alive) return;
      setClassAccessCode(classRow?.access_code ?? null);
      if (!classRow) {
        setCanRerollClassCode(false);
        return;
      }
      const [{ data: isPlatformAdmin }, { data: canManageSchool }, { data: canManageStudents }, { data: subscription }] = await Promise.all([
        supabase.rpc("is_platform_admin"),
        classRow.school_id ? supabase.rpc("can_manage_school", { p_school_id: classRow.school_id }) : Promise.resolve({ data: false }),
        supabase.rpc("can_manage_student_accounts", { p_class_id: currentClassId }),
        supabase.from("teacher_class_subscriptions").select("id").eq("class_instance_id", currentClassId).eq("teacher_user_id", userId).eq("is_active", true).maybeSingle(),
      ]);
      if (alive) setCanRerollClassCode(Boolean(isPlatformAdmin || canManageSchool || canManageStudents || subscription));
    })();

    return () => { alive = false; };
  }, [publicRoute, pathname, userId]);

  if (publicRoute) return null;
  const overviewActive = pathname === "/";
  const accountLabel = displayName || role;
  const avatarInitial = (displayName || email || "D").trim().charAt(0).toLocaleUpperCase("de-DE");

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
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.12em] text-transparent">Klassencode</span>
              <code className="font-mono text-sm font-semibold tracking-[0.14em] text-slate-800">{classAccessCode}</code>
              <button type="button" onClick={() => { void navigator.clipboard.writeText(classAccessCode).then(() => { setCopiedClassCode(true); window.setTimeout(() => setCopiedClassCode(false), 1400); }); }} aria-label="Klassencode kopieren" title="Klassencode kopieren" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-violet-700 transition hover:bg-violet-50">
                {copiedClassCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              {canRerollClassCode && classIdForCode && (
                <button type="button" disabled={rerollingClassCode} onClick={async () => {
                  if (!window.confirm("Neuen Klassencode generieren? Der bisherige Code wird sofort ungültig.")) return;
                  setRerollingClassCode(true);
                  setClassCodeError("");
                  try {
                    const nextCode = await regenerateClassInstanceAccessCode(classIdForCode);
                    setClassAccessCode(nextCode);
                  } catch (error) {
                    setClassCodeError(error instanceof Error ? error.message : "Klassencode konnte nicht erneuert werden.");
                  } finally {
                    setRerollingClassCode(false);
                  }
                }} aria-label="Klassencode neu generieren" title={classCodeError || "Klassencode neu generieren"} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-violet-700 transition hover:bg-violet-50 disabled:opacity-50">
                  <RefreshCw className={"h-4 w-4 " + (rerollingClassCode ? "animate-spin" : "")} />
                </button>
              )}
            </div>
          )}
          <span className="hidden max-w-[260px] truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 sm:inline-flex" title={school ? `${school}${region ? " · " + region : ""}` : "Noch keine Schule zugeordnet"}>{school ? `${school}${region ? " · " + region : ""}` : "Noch keine Schule zugeordnet"}</span>
          <button type="button" onClick={() => setAccountOpen((open) => !open)} className="editorial-avatar" aria-label="Kontomenü öffnen">{avatarInitial}</button>
          {accountOpen && (
            <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{accountLabel}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{email ?? "Konto"}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{school ?? "Noch keine Schule zugeordnet"}{region ? " · " + region : ""}</p>
              </div>
              <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-medium text-slate-500">{role}</div>
              <div className="p-1.5"><Link href="/account" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"><Settings className="h-4 w-4 text-slate-400" />Einstellungen</Link></div>
              <div className="border-t border-slate-200 p-1.5"><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"><LogOut className="h-4 w-4" />Abmelden</button></div>
            </div>
          )}
        </div>
      </header>
      <div className="editorial-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[252px] overflow-y-auto lg:block">
        <aside className="flex min-h-full w-full flex-col">
          <Link href="/" className="editorial-brand">
            <img src="/branding/drift-logo-appstore-transparent.webp" alt="" aria-hidden="true" className="h-12 w-12 shrink-0 rounded-xl object-contain" />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold tracking-tight text-slate-950">DR1FT</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">Lehrkraft Studio</span>
            </span>
          </Link>
          <div className="px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Arbeitsbereiche</div>
          <nav aria-label="Hauptnavigation" className="px-3">
            <NavItem href="/" label="Übersicht" icon={<LayoutDashboard className="h-4 w-4" />} active={overviewActive} />
            <div className="mt-1"><NavItem href="/students" label="Schüler:innen" icon={<Users className="h-4 w-4" />} active={pathname.startsWith("/students")} count={studentCount} /></div>
            <div className="mt-1"><NavItem href="/insights" label="Insights" icon={<BarChart3 className="h-4 w-4" />} active={pathname.startsWith("/insights")} /></div>
            <div className="my-2 border-t border-slate-200/80" />
            <NavItem href="/account" label="Einstellungen" icon={<Settings className="h-4 w-4" />} active={pathname.startsWith("/account")} />
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
