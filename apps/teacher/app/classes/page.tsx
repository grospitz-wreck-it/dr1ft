import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { createClass } from "./actions";
import { ClassDashboard } from "./ClassDashboard";

export default async function TeacherClassesPage() {
  const supabase = supabaseServerClient();
  const { data: memberships } = await supabase.from("class_instance_memberships")
    .select("class_instance_id, role, class_instances(id,name,access_code,is_active,grade_level,school_year,school_id)")
    .in("role", ["teacher","school_admin"]).is("left_at", null);
  const { data: studentMemberships } = await supabase.from("class_instance_memberships")
    .select("class_instance_id").eq("role","student").is("left_at",null);

  const countByClass = new Map<string,number>();
  (studentMemberships??[]).forEach((m:any)=>countByClass.set(m.class_instance_id,(countByClass.get(m.class_instance_id)??0)+1));
  const classes = (memberships??[]).map((m:any)=>m.class_instances).filter(Boolean)
    .map((c:any)=>({...c,student_count:countByClass.get(c.id)??0}))
    .sort((a:any,b:any)=>String(b.school_year).localeCompare(String(a.school_year)));

  const schoolId = classes[0]?.school_id ?? null;
  const { data: school } = schoolId
    ? await supabase.from("schools").select("id,name,region").eq("id",schoolId).maybeSingle()
    : { data: null };

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-7 md:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <ClassDashboard classes={classes} schoolName={school?.name ?? null} />
        <section id="new-class" className="scroll-mt-24">
          <div className="mb-3"><h2 className="text-lg font-semibold text-slate-900">Neue Klasse anlegen</h2><p className="text-sm text-slate-500 mt-1">Die Klasse wird als eigene Klasseninstanz für das ausgewählte Schuljahr angelegt und deiner Schule zugeordnet.</p></div>
          <form action={createClass} className="bg-white border border-border rounded-2xl p-5 md:p-6 shadow-sm grid gap-4 sm:grid-cols-2 max-w-3xl">
            <input type="text" name="name" placeholder="Klassenname, z. B. 9b" required className="sm:col-span-2 rounded-xl border border-border px-3 py-2.5 text-sm" />
            <input type="number" name="gradeLevel" placeholder="Jahrgang, z. B. 9" min={1} max={13} className="rounded-xl border border-border px-3 py-2.5 text-sm" />
            <input type="text" name="schoolYear" defaultValue="2026/27" placeholder="Schuljahr, z. B. 2026/27" className="rounded-xl border border-border px-3 py-2.5 text-sm" />
            <button type="submit" className="sm:col-span-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2.5">Klasse anlegen</button>
          </form>
        </section>
      </div>
    </div>
  );
}
