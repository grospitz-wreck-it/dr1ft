import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { SchoolAdminWorkspace } from "./SchoolAdminWorkspace";
import { SchoolDirectoryShell } from "./SchoolDirectoryShell";

export default async function SchoolsPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase.from("platform_staff").select("role").eq("user_id", user.id).maybeSingle();
  if (staff?.role !== "platform_admin") {
    return <div className="p-8"><h1 className="text-lg font-semibold">Kein Zugriff</h1><p className="mt-2 text-sm text-slate-500">Nur Platform-Admins können Schulen verwalten.</p></div>;
  }

  const [{ data: schools, error: schoolError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from("schools").select("id, name, region, email_domain, school_type, student_count, status, plan, funding_type, created_at, updated_at").order("name"),
    supabase.from("school_memberships").select("school_id, role, active"),
  ]);

  if (schoolError || membershipError) {
    const error = schoolError ?? membershipError;
    return <div className="p-8"><h1 className="text-lg font-semibold">Schulen konnten nicht geladen werden</h1><p className="mt-2 text-sm text-slate-500">{error?.message}</p></div>;
  }

  const counts = new Map<string, { total: number; admins: number; teachers: number }>();
  for (const membership of memberships ?? []) {
    if (!membership.active) continue;
    const current = counts.get(membership.school_id) ?? { total: 0, admins: 0, teachers: 0 };
    current.total += 1;
    if (membership.role === "school_admin" || membership.role === "school_lead") current.admins += 1;
    if (membership.role === "teacher") current.teachers += 1;
    counts.set(membership.school_id, current);
  }

  const initialSchools = (schools ?? []).map((school) => ({
    ...school,
    memberCount: counts.get(school.id)?.total ?? 0,
    adminCount: counts.get(school.id)?.admins ?? 0,
    teacherCount: counts.get(school.id)?.teachers ?? 0,
  }));

  return <SchoolDirectoryShell><main className="min-h-screen bg-[#f7f8fc]"><div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10"><div className="mb-8 flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700"><Building2 className="h-3.5 w-3.5" /> DR1FT · Plattform</div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Schulen verwalten</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Schulprofile, Zugänge und Nutzung an einem zentralen Ort.</p></div><div className="text-xs text-slate-400">Plattformverwaltung <span className="mx-1.5">/</span> <span className="font-medium text-slate-600">Schulen</span></div></div><SchoolAdminWorkspace initialSchools={initialSchools} /></div></main></SchoolDirectoryShell>;
}
