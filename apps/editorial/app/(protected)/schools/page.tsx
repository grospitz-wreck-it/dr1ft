import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { SchoolAdminWorkspace } from "./SchoolAdminWorkspace";

export default async function SchoolsPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("platform_staff")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staff?.role !== "platform_admin") {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Kein Zugriff</h1>
        <p className="text-sm text-slate-500 mt-2">
          Nur Platform-Admins können Schulen verwalten.
        </p>
      </div>
    );
  }

  const [{ data: schools, error: schoolError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, region, email_domain, created_at")
      .order("name"),
    supabase
      .from("school_memberships")
      .select("school_id, role, active"),
  ]);

  if (schoolError) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Schulen konnten nicht geladen werden</h1>
        <p className="text-sm text-slate-500 mt-2">{schoolError.message}</p>
      </div>
    );
  }

  if (membershipError) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Schulrollen konnten nicht geladen werden</h1>
        <p className="text-sm text-slate-500 mt-2">{membershipError.message}</p>
      </div>
    );
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

  return <SchoolAdminWorkspace initialSchools={initialSchools} />;
}
