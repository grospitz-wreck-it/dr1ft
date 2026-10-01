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

  const [{ data: school }, { data: members, error: memberError }, { data: instances }] = await Promise.all([
    supabase.from("schools").select("id, name, region, email_domain, school_type, street, house_number, postal_code, city, phone, website, student_count, status, plan, funding_type, internal_notes, created_at, updated_at").eq("id", params.schoolId).maybeSingle(),
    supabase.rpc("get_school_member_directory", { p_school_id: params.schoolId }),
    supabase.from("class_instances").select("id, name, grade_level, school_year, access_code, is_active, created_at").eq("school_id", params.schoolId).order("school_year", { ascending: false }).order("name"),
  ]);

  const classIds = (instances ?? []).map((item) => item.id);
  const { data: instanceMembers } = classIds.length
    ? await supabase.from("class_instance_memberships").select("class_instance_id, user_id, role, left_at, user_profiles(display_name)").in("class_instance_id", classIds).is("left_at", null)
    : { data: [] };

  const { data: scenarioAssignments } = classIds.length
    ? await supabase.from("class_instance_scenario_assignments").select("class_instance_id, scenario_id, assigned_at").in("class_instance_id", classIds)
    : { data: [] };

  const scenarioIds = [...new Set((scenarioAssignments ?? []).map((item) => item.scenario_id))];
  const { data: scenarios } = scenarioIds.length
    ? await supabase.from("scenarios").select("id, title, description, age_rating, is_active").in("id", scenarioIds)
    : { data: [] };

  const teachersByClass = new Map<string, string[]>();
  const studentsByClass = new Map<string, number>();
  const scenarioById = new Map((scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  const assignmentByClass = new Map<string, { id: string; title: string; description: string | null; age_rating: string; is_active: boolean; assigned_at: string }>();

  for (const assignment of scenarioAssignments ?? []) {
    const scenario = scenarioById.get(assignment.scenario_id);
    if (scenario) {
      assignmentByClass.set(assignment.class_instance_id, {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        age_rating: scenario.age_rating,
        is_active: scenario.is_active,
        assigned_at: assignment.assigned_at,
      });
    }
  }

  for (const membership of instanceMembers ?? []) {
    if (membership.role === "teacher" || membership.role === "school_admin" || membership.role === "school_lead") {
      const names = teachersByClass.get(membership.class_instance_id) ?? [];
      const profile = membership.user_profiles as { display_name?: string | null } | null;
      if (profile?.display_name) names.push(profile.display_name);
      teachersByClass.set(membership.class_instance_id, names);
    }
    if (membership.role === "student") {
      studentsByClass.set(membership.class_instance_id, (studentsByClass.get(membership.class_instance_id) ?? 0) + 1);
    }
  }

  const schoolClasses = (instances ?? []).map((item) => ({
    ...item,
    teachers: teachersByClass.get(item.id) ?? [],
    student_count: studentsByClass.get(item.id) ?? 0,
    scenario: assignmentByClass.get(item.id) ?? null,
  }));
  if (!school) notFound();

  const activeMembers = (members ?? []).filter((member) => member.active);
  const teacherCount = activeMembers.filter((member) => member.role === "teacher").length;
  const adminCount = activeMembers.filter((member) => member.role === "school_admin").length;
  const leadCount = activeMembers.filter((member) => member.role === "school_lead").length;
  const activeClasses = schoolClasses.filter((item) => item.is_active).length;

  return <main className="min-h-screen bg-canvas"><div className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><Link href="/schools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Schulen</Link><div className="mt-6 flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-panel text-slate-500 shadow-sm ring-1 ring-border"><Building2 className="h-6 w-6" /></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight text-slate-900">{school.name}</h1><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{school.status === "active" ? "Aktiv" : school.status}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{school.funding_type === "none" ? school.plan : `${school.plan} · ${school.funding_type}`}</span></div><p className="mt-1 text-sm text-slate-500">{school.region || "Region nicht hinterlegt"}{school.school_type ? ` · ${school.school_type}` : ""}</p><p className="mt-1 text-xs text-slate-400">{school.email_domain ? `@${school.email_domain}` : "Keine Schul-Domain hinterlegt"}</p></div></div><section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Schüler:innen", school.student_count?.toLocaleString("de-DE") ?? "—"],["Lehrkräfte", String(teacherCount)],["Klassen", String(schoolClasses.length)],["Aktive Klassen", String(activeClasses)]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-border bg-panel px-5 py-4 shadow-sm"><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div>)}</section>{memberError ? <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Die Personen konnten nicht geladen werden: {memberError.message}</div> : <SchoolDetailWorkspace school={school} initialMembers={members ?? []} initialClasses={schoolClasses} stats={{ total: activeMembers.length, teachers: teacherCount, admins: adminCount, leads: leadCount, classes: schoolClasses.length }} />}</div></main>;
}
