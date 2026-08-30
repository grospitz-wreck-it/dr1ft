import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { SchoolAdminWorkspace } from "./SchoolAdminWorkspace";

export default async function SchoolsPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: staff } = await supabase.from("platform_staff").select("role").eq("user_id", user.id).maybeSingle();
  if (staff?.role !== "platform_admin") return <div className="p-8"><h1 className="text-lg font-semibold">Kein Zugriff</h1><p className="text-sm text-slate-500 mt-2">Nur Platform-Admins können Schulen verwalten.</p></div>;
  const { data: schools } = await supabase.from("schools").select("id, name, region, email_domain, created_at").order("name");
  return <SchoolAdminWorkspace initialSchools={schools ?? []} />;
}
