import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { supabaseServerClient } from "../../../../lib/supabaseServerClient";
import { SchoolDetailWorkspace } from "./SchoolDetailWorkspace";

export default async function SchoolDetailPage({ params }: { params: { schoolId: string } }) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: staff } = await supabase.from("platform_staff").select("role").eq("user_id", user.id).maybeSingle();
  if (staff?.role !== "platform_admin") return <div className="p-8"><h1 className="text-lg font-semibold">Kein Zugriff</h1><p className="mt-2 text-sm text-slate-500">Nur Platform-Admins können Schulen verwalten.</p></div>;

  const [{ data: school }, { data: members, error: memberError }, { count: classCount }] = await Promise.all([
    supabase.from("schools").select("id, name, region, email_domain, school_type, student_count, status, plan, funding_type, internal_notes, created_at, updated_at").eq("id", params.schoolId).maybeSingle(),
    supabase.rpc("get_school_member_directory", { p_school_id: params.schoolId }),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", params.schoolId),
  ]);
  if (!school) notFound();

  const activeMembers = (members ?? []).filter((member) => member.active);
  const teacherCount = activeMembers.filter((member) => member.role === "teacher").length;
  const adminCount = activeMembers.filter((member) => member.role === "school_admin").length;
  const leadCount = activeMembers.filter((member) => member.role === "school_lead").length;

  return <main className="min-h-screen bg-canvas"><div className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><Link href="/schools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Schulen</Link><div className="mt-6 flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-panel text-slate-500 shadow-sm ring-1 ring-border"><Building2 className="h-6 w-6" /></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight text-slate-900">{school.name}</h1><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{school.status === "active" ? "Aktiv" : school.status}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{school.funding_type === "none" ? school.plan : `${school.plan} · ${school.funding_type}`}</span></div><p className="mt-1 text-sm text-slate-500">{school.region || "Region nicht hinterlegt"}{school.school_type ? ` · ${school.school_type}` : ""}</p><p className="mt-1 text-xs text-slate-400">{school.email_domain ? `@${school.email_domain}` : "Keine Schul-Domain hinterlegt"}</p></div></div>{memberError ? <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Die Personen konnten nicht geladen werden: {memberError.message}</div> : <SchoolDetailWorkspace school={school} initialMembers={members ?? []} stats={{ total: activeMembers.length, teachers: teacherCount, admins: adminCount, leads: leadCount, classes: classCount ?? 0 }} />}</div></main>;
}
