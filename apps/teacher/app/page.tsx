import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  GraduationCap,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { supabaseServerClient } from "../lib/supabaseServerClient";

export default async function TeacherHomePage() {
  const supabase = supabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("class_instance_memberships")
    .select("class_instance_id, role, class_instances(id,name,is_active,grade_level,school_year,school_id)")
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

  return (
    <main className="min-h-screen">
      <section className="drift-profile-banner relative mb-5 overflow-hidden rounded-[28px] border border-violet-100/80 px-6 py-7 shadow-[0_12px_38px_rgba(93,73,180,.07)] sm:px-8 sm:py-8 lg:min-h-[278px]">
        <div className="drift-orb drift-orb-one" aria-hidden="true" />
        <div className="drift-orb drift-orb-two" aria-hidden="true" />
        <div className="drift-orb drift-orb-three" aria-hidden="true" />
        <div className="relative z-10 max-w-[54%] max-lg:max-w-[62%] max-sm:max-w-full">
          <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-violet-600">Willkommen im Lehrkraft Studio</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.08] tracking-[-.045em] text-slate-950 sm:text-4xl lg:text-[42px]">
            Dein Unterricht.<br />Mehr <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Medienkompetenz.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Verwalte deine Klassen, begleite deine Schüler:innen und behalte Lernfortschritte und Szenarien im Blick.
          </p>
          <a href="/classes" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl">
            Meine Klassen <ArrowRight className="h-4 w-4" />
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
          <Metric label="Klassen" value={activeClasses.length} detail={`davon ${activeClasses.length} aktiv`} icon={<Users />} tone="violet" href="/classes" />
          <Metric label="Schüler:innen" value={studentCount} detail="aktiv in deinen Klassen" icon={<GraduationCap />} tone="cyan" href="/students" />
          <Metric label="Klassen insgesamt" value={classes.length} detail="in deinem Lehrkraftbereich" icon={<BookOpen />} tone="pink" href="/classes" />
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.08fr]">
        <article className="drift-panel overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-600">Unterricht</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Deine Klassen</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Verwalte deine Klassen, starte neue Lernräume und weise Szenarien zu.</p>
            </div>
            <a href="/classes" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/15 transition hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Neue Klasse erstellen
            </a>
          </div>
          <div className="mt-4 space-y-2">
            {activeClasses.length ? activeClasses.slice(0, 5).map((item: any, index: number) => (
              <a key={item.id} href={`/classes/${item.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white to-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${index % 2 === 0 ? "bg-gradient-to-br from-violet-600 to-indigo-500" : "bg-gradient-to-br from-cyan-500 to-blue-500"} text-white shadow-md`}><Users className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-slate-900">{item.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">Jahrgang {item.grade_level ?? "—"} · {item.school_year}</span>
                </span>
                <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:inline-flex"><span className="mr-1.5 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />Aktiv</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
              </a>
            )) : (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-center">
                <BookOpen className="mx-auto h-7 w-7 text-violet-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Noch keine aktive Klasse.</p>
                <p className="mt-1 text-xs text-slate-500">Lege einen Lernraum an, um loszulegen.</p>
              </div>
            )}
          </div>
          <a href="/classes" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:text-violet-900">Alle Klassen anzeigen <ArrowRight className="h-3.5 w-3.5" /></a>
        </article>

        <article className="drift-panel relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -bottom-20 -right-14 h-64 w-64 rounded-full bg-violet-100/70 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-600">Analyse</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">DR1FT Insights</h2>
              <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500">Lernfortschritte, Kompetenzen und mögliche Schwierigkeiten deiner Klassen zentral auswerten.</p>
            </div>
            <a href="/insights" className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/70 px-3.5 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100">Insights öffnen <ArrowRight className="h-3.5 w-3.5" /></a>
          </div>
          <div className="relative mt-5 grid gap-3 sm:grid-cols-[1fr_132px]">
            <div className="rounded-2xl border border-slate-200/90 bg-white/85 p-3.5">
              <p className="mb-3 text-[11px] font-extrabold text-slate-700">Kompetenzbereiche</p>
              <InsightLegend tone="violet" icon="✦" label="Medienkompetenz" />
              <InsightLegend tone="cyan" icon="◎" label="Kritisches Denken" />
              <InsightLegend tone="pink" icon="◉" label="Quellenbewertung" />
              <InsightLegend tone="orange" icon="✳" label="Respekt & Vielfalt" />
              <p className="mt-3 text-[10px] leading-4 text-slate-400">Detaillierte Auswertungen findest du in DR1FT Insights.</p>
            </div>
            <div className="relative flex min-h-[170px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-3 text-center">
              <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-pink-100/80 blur-xl" />
              <div className="relative grid h-20 w-20 place-items-center rounded-full bg-[conic-gradient(from_220deg,#7c3aed_0deg,#22d3ee_170deg,#f3e8ff_171deg)] p-[5px] shadow-lg shadow-violet-500/15">
                <div className="grid h-full w-full place-items-center rounded-full bg-white"><BarChart3 className="h-7 w-7 text-violet-600" /></div>
              </div>
              <p className="relative mt-3 text-[11px] font-extrabold text-slate-700">Deine Lernanalyse</p>
              <p className="relative mt-1 text-[10px] text-slate-400">Alle Klassen im Blick</p>
            </div>
          </div>
        </article>
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
