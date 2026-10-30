import { redirect } from "next/navigation";
import { OverviewClasses } from "./OverviewClasses";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  GraduationCap,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { supabaseServerClient } from "../lib/supabaseServerClient";

export default async function TeacherHomePage() {
  const supabase = supabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("class_instance_memberships")
    .select("class_instance_id, role, class_instances(id,name,is_active,grade_level,school_year,school_id,class_image_path)")
    .eq("role", "teacher")
    .is("left_at", null);

  const classes = (memberships ?? [])
    .map((row: any) => row.class_instances)
    .filter(Boolean);

  const classIds = classes.map((item: any) => item.id);
  const { data: schoolMemberships } = await supabase
    .from("school_memberships")
    .select("school_id, active")
    .eq("user_id", user.id)
    .eq("active", true);
  const schoolIds = Array.from(new Set([
    ...classes.map((item: any) => item.school_id),
    ...(schoolMemberships ?? []).map((membership: any) => membership.school_id),
  ].filter(Boolean)));
  const { data: schoolRows } = schoolIds.length
    ? await supabase.from("schools").select("id, name, region").in("id", schoolIds)
    : { data: [] as any[] };
  const schoolsById = new Map((schoolRows ?? []).map((school: any) => [school.id, school]));
  const linkedSchools = Array.from(schoolsById.values());

  let studentCount = 0;
  if (classIds.length) {
    const { count } = await supabase
      .from("class_instance_memberships")
      .select("user_id", { count: "exact", head: true })
      .in("class_instance_id", classIds)
      .eq("role", "student")
      .is("left_at", null);
    studentCount = count ?? 0;
  }

  const activeClasses = classes.filter((item: any) => item.is_active);
  const [{ data: studentMemberships }, { data: scenarioAssignments }] = await Promise.all([
    classIds.length ? supabase.from("class_instance_memberships").select("class_instance_id").in("class_instance_id", classIds).eq("role", "student").is("left_at", null) : Promise.resolve({ data: [] as any[] }),
    classIds.length ? supabase.from("class_instance_scenario_assignments").select("class_instance_id,scenario_id,is_active,archived_at,scenarios(id,title,cover_image_url)").in("class_instance_id", classIds).is("archived_at", null).eq("is_active", true) : Promise.resolve({ data: [] as any[] }),
  ]);
  const studentsByClass = new Map<string, number>();
  (studentMemberships ?? []).forEach((row: any) => studentsByClass.set(row.class_instance_id, (studentsByClass.get(row.class_instance_id) ?? 0) + 1));
  const assignmentsByClass = new Map<string, any[]>();
  (scenarioAssignments ?? []).forEach((row: any) => {
    const current = assignmentsByClass.get(row.class_instance_id) ?? [];
    if (row.scenarios) current.push(row.scenarios);
    assignmentsByClass.set(row.class_instance_id, current);
  });
  const overviewClasses = await Promise.all(classes.map(async (item: any) => {
    let thumbnailUrl: string | null = null;
    if (item.class_image_path) {
      const { data } = await supabase.storage.from("class-images").createSignedUrl(item.class_image_path, 60 * 60);
      thumbnailUrl = data?.signedUrl ?? null;
    }
    return {
      id: item.id, name: item.name, gradeLevel: item.grade_level, schoolYear: item.school_year,
      isActive: item.is_active, thumbnailUrl, studentCount: studentsByClass.get(item.id) ?? 0,
      missions: assignmentsByClass.get(item.id) ?? [],
    };
  }));


  return (
    <main className="min-h-screen">
      <section className="drift-profile-banner relative mb-5 overflow-hidden rounded-[28px] border border-violet-100/80 px-6 py-7 shadow-[0_12px_38px_rgba(93,73,180,.07)] sm:px-8 sm:py-8 lg:min-h-[278px]">
        <div className="drift-orb drift-orb-one" aria-hidden="true" />
        <div className="drift-orb drift-orb-two" aria-hidden="true" />
        <div className="drift-orb drift-orb-three" aria-hidden="true" />
        <div className="relative z-10 max-w-[48%] max-lg:max-w-[62%] max-sm:max-w-full">
          <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-violet-600">Willkommen im Lehrkraft Studio</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.08] tracking-[-.045em] text-slate-950 sm:text-4xl lg:text-[42px]">
            Dein Unterricht.<br />Mehr <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Medienkompetenz.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Verwalte deine Klassen, begleite deine Schüler:innen und behalte Lernfortschritte und Szenarien im Blick.
          </p>
          <a href="#deine-klassen" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl">
            Zu deinen Klassen <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="drift-hero-art absolute inset-y-0 right-0 hidden w-[48%] lg:block" aria-hidden="true">
          <div className="drift-hero-grid" />
          <div className="drift-hero-ring drift-hero-ring-a" />
          <div className="drift-hero-ring drift-hero-ring-b" />
          <div className="drift-hero-note drift-hero-note-a"><Send className="h-5 w-5" /><span>Szenarien<br />im Unterricht</span></div>
          <div className="drift-hero-note drift-hero-note-b"><Users className="h-5 w-5" /><span>Klassen<br />verwalten</span></div>
          <div className="drift-hero-note drift-hero-note-c"><BarChart3 className="h-5 w-5" /><span>Lernfortschritte<br />verfolgen</span></div>
          <div className="drift-hero-stack">
            <div className="drift-hero-tile drift-hero-tile-back"><ImageIcon /></div>
            <div className="drift-hero-tile drift-hero-tile-mid"><MessageCircle /></div>
            <div className="drift-hero-tile drift-hero-tile-front"><GraduationCap /></div>
            <span className="drift-hero-spark drift-hero-spark-one">✦</span>
            <span className="drift-hero-spark drift-hero-spark-two">✧</span>
          </div>
        </div>
      </section>

      <section className="drift-panel relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-violet-100/60 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-600">Auf einen Blick</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[28px]">Deine Übersicht</h2>
            <p className="mt-1 text-sm text-slate-500">Wichtige Informationen zu deinen Klassen, Schüler:innen und aktiven Inhalten.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-xs font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.12)]" />
            {linkedSchools.length ? linkedSchools.map((school: any) => school.name).join(" · ") : "Noch keine Schule zugeordnet"}
          </div>
        </div>
        <div className="relative mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Aktive Klassen" value={activeClasses.length} detail="bereit für den Unterricht" icon={<Users />} tone="violet" href="#deine-klassen" />
          <Metric label="Schüler:innen" value={studentCount} detail="aktiv in deinen Klassen" icon={<GraduationCap />} tone="cyan" href="/students" />
          <Metric label="Aktive Missionen" value={scenarioAssignments?.length ?? 0} detail="in deinen Klassen zugewiesen" icon={<BookOpen />} tone="pink" href="#deine-klassen" />
        </div>
      </section>

      <section id="deine-klassen" className="drift-panel mt-5 overflow-hidden p-5 sm:p-6">
        <OverviewClasses classes={overviewClasses} />
      </section>

    </main>
  );
}

function Metric({ label, value, detail, icon, tone, href }: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  tone: "violet" | "cyan" | "pink";
  href: string;
}) {
  return (
    <a href={href} className="drift-stat-card group flex items-center gap-3 border-slate-200/80 bg-white/90 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg">
      <span className={`drift-stat-icon h-14 w-14 rounded-2xl ${tone === "violet" ? "drift-violet" : tone === "cyan" ? "drift-cyan" : "drift-pink"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-extrabold leading-none tracking-tight text-slate-950">{value}</span>
        <span className="mt-1 block text-sm font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-[11px] text-slate-400">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
    </a>
  );
}

function InsightLegend({ tone, icon, label }: { tone: "violet" | "cyan" | "pink" | "orange"; icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${tone === "violet" ? "drift-violet" : tone === "cyan" ? "drift-cyan" : tone === "pink" ? "drift-pink" : "drift-orange"}`}>{icon}</span>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <span className={`ml-auto h-1.5 w-1.5 rounded-full ${tone === "violet" ? "bg-violet-500" : tone === "cyan" ? "bg-cyan-500" : tone === "pink" ? "bg-pink-500" : "bg-orange-500"}`} />
    </div>
  );
}
