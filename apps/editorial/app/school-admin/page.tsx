import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { SchoolAdminPortal } from "./SchoolAdminPortal";

export default async function SchoolAdminPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/school-admin");

  const { data: membership } = await supabase
    .from("school_memberships")
    .select("school_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", ["school_admin", "school_lead"])
    .maybeSingle();

  if (!membership) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="max-w-md rounded-3xl border border-border bg-panel p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">DR1FT Schulbereich</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">Kein Schulzugang</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Für dieses Konto ist keine aktive Schuladmin- oder Schulleitungsrolle hinterlegt.
          </p>
        </div>
      </main>
    );
  }

  const [{ data: school }, { data: members }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, region, email_domain, school_type, student_count, status, plan, funding_type")
      .eq("id", membership.school_id)
      .maybeSingle(),
    supabase.rpc("get_school_member_directory", { p_school_id: membership.school_id }),
  ]);

  if (!school) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="rounded-3xl border border-border bg-panel p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Schule nicht gefunden</h1>
          <p className="mt-2 text-sm text-slate-500">Die hinterlegte Schulzuordnung konnte nicht geladen werden.</p>
        </div>
      </main>
    );
  }

  return <SchoolAdminPortal school={school} members={members ?? []} role={membership.role} />;
}
