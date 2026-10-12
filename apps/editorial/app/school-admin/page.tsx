import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

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
          <p className="mt-2 text-sm leading-6 text-slate-500">Für dieses Konto ist keine aktive Schuladmin- oder Schulleitungsrolle hinterlegt.</p>
        </div>
      </main>
    );
  }

  redirect(`/schools/${membership.school_id}`);
}
