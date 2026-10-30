"use client";

import { useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowUpRight, Award, BarChart3, CheckCircle2,
  ClipboardCheck, MessageSquare, Search, ShieldCheck, Target, Users
} from "lucide-react";

type Student = { user_id: string; display_name: string | null; username: string | null; avatar_seed?: string | null };
type StudentRow = { name: string; competencies: Record<string, number>; completed: number; total: number };
type Evidence = { responses: number; assessed: number; successful: number; notYet: number };
type Competency = { competency_id: string; competency_title: string; avg_level: number; student_count: number };
type Bottleneck = { mission_id: string; mission_title: string; completion_rate: number; completed_count: number; student_count: number };

export function ClassLearningInsights({
  students, studentRows, competencyTitles, evidence, competencies, bottlenecks,
  average, completed, total, classId
}: {
  students: Student[];
  studentRows: Record<string, StudentRow>;
  competencyTitles: string[];
  evidence: Evidence;
  competencies: Competency[];
  bottlenecks: Bottleneck[];
  average: number | null;
  completed: number;
  total: number;
  classId: string;
}) {
  const [query, setQuery] = useState("");
  const visibleStudents = useMemo(() => students.filter((student) => {
    const name = student.display_name || student.username || "Schüler:in";
    return name.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de"));
  }), [students, query]);

  const hasCompetencies = competencies.length > 0;
  const studentAvatarUrl = (seed: string | null | undefined, size = 96) => {
    const styles = ["voxel-art", "adventurer", "adventurer-neutral", "avataaars", "bottts", "fun-emoji", "lorelei", "micah", "miniavs", "personas", "pixel-art-neutral", "thumbs"];
    const value = seed || "dr1ft";
    const separator = value.indexOf("::");
    const candidate = separator > 0 ? value.slice(0, separator) : "";
    const style = styles.includes(candidate) ? candidate : "voxel-art";
    const avatarSeed = separator > 0 && styles.includes(candidate) ? value.slice(separator + 2) || "dr1ft" : value;
    return "https://api.dicebear.com/10.x/" + style + "/svg?seed=" + encodeURIComponent(avatarSeed) + "&size=" + size + "&animationVariant=medium&borderRadius=18";
  };
  const hasEvidence = evidence.responses > 0 || evidence.assessed > 0;
  const completionRate = total > 0 ? Math.round(completed / total * 100) : null;

  return (
    <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(34,45,90,.07)]">
      <header className="relative overflow-hidden border-b border-slate-100 bg-[linear-gradient(110deg,#fff_0%,#faf9ff_58%,#f0fbff_100%)] px-6 py-6 sm:px-8">
        <div className="pointer-events-none absolute -right-8 -top-16 h-44 w-44 rounded-full border border-violet-200/60" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-32 w-32 rounded-full border border-cyan-200/60" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.2em] text-violet-600"><span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.8)]" /> DR1FT Insights</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Lernreporting der Klasse</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">Kompetenzentwicklung, Missionsfortschritt und mögliche Lernhürden dieser Klasseninstanz. Nur für berechtigte Lehrkräfte sichtbar.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-violet-600" /> Klassenbezogene Auswertung
          </div>
        </div>
      </header>

      <div className="grid gap-4 bg-slate-50/70 p-4 sm:p-5 xl:grid-cols-[1fr_1.05fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Award className="h-5 w-5" /></span>
            <div><h3 className="text-sm font-bold text-slate-900">Challenge- und Lernnachweise</h3><p className="text-xs text-slate-400">Bearbeitung und validierte Bewertungen</p></div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Antworten abgegeben", value: evidence.responses, icon: MessageSquare, tone: "bg-sky-50 text-sky-600" },
              { label: "Geprüfte Anforderungen", value: evidence.assessed || "—", icon: ClipboardCheck, tone: "bg-violet-50 text-violet-600" },
              { label: "Erfolgreich erfüllt", value: evidence.assessed ? evidence.successful : "—", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
              { label: "Noch nicht erfüllt", value: evidence.assessed ? evidence.notYet : "—", icon: Activity, tone: "bg-amber-50 text-amber-600" },
            ].map((item) => {
              const Icon = item.icon;
              return <div key={item.label} className="min-w-0 rounded-xl bg-slate-50/80 p-3">
                <span className={"mb-3 flex h-8 w-8 items-center justify-center rounded-lg " + item.tone}><Icon className="h-4 w-4" /></span>
                <p className="text-2xl font-bold tracking-tight text-slate-950">{item.value}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.label}</p>
              </div>;
            })}
          </div>
          <div className="mt-4 flex gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>Abgegebene Antworten zählen als Bearbeitung, nicht automatisch als fachlicher Erfolg. Geprüfte Anforderungen beruhen auf validierten Bewertungen. {evidence.assessed === 0 ? "Für diese Klasse liegen aktuell keine validierten Bewertungsereignisse vor; Erfolgs- und Misserfolgswerte bleiben daher offen." : "Erfolgs- und Misserfolgswerte zeigen ausschließlich validierte Bewertungen."}</p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#fff_0%,#fbf7ff_48%,#f1fbff_100%)] p-5 text-slate-900 shadow-[0_10px_30px_rgba(124,58,237,.07)]">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-cyan-200/50" /><div className="pointer-events-none absolute -right-4 bottom-[-5rem] h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-200/30 via-violet-200/20 to-cyan-200/30 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-100 text-violet-600 shadow-sm"><BarChart3 className="h-5 w-5" /></span>
              <div><h3 className="text-sm font-bold">Kompetenzentwicklung · Klassendurchschnitt</h3><p className="text-xs text-slate-500">Gespeicherte Kompetenz-Level · Skala 0–5</p></div>
            </div>
            <span className="hidden rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-xs font-medium text-violet-600 shadow-sm sm:inline-flex">Aktueller Stand</span>
          </div>
          {hasCompetencies ? <div className="relative mt-6 space-y-4">
            {competencies.map((item, index) => {
              const value = Math.max(0, Math.min(5, Number(item.avg_level ?? 0)));
              const width = value / 5 * 100;
              const gradients = ["from-violet-400 to-fuchsia-300", "from-sky-400 to-cyan-300", "from-pink-400 to-fuchsia-300", "from-indigo-400 to-violet-300"];
              return <div key={item.competency_id}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{item.competency_title}</span><span className="shrink-0 font-semibold tabular-nums text-violet-700">Ø {value.toFixed(1)} / 5</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80"><div className={"h-full rounded-full bg-gradient-to-r " + gradients[index % gradients.length]} style={{ width: width + "%" }} /></div>
                <p className="mt-1 text-[10px] text-slate-400">{item.student_count} Schüler:innen mit Daten</p>
              </div>;
            })}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-violet-100 pt-4">
              <div className="rounded-xl border border-white/90 bg-white/75 px-3 py-2 shadow-sm"><p className="text-[10px] text-slate-400">Ø Kompetenz</p><p className="text-lg font-bold">{average === null ? "—" : average.toFixed(1) + " / 5"}</p></div>
              <div className="rounded-xl bg-white/[.07] px-3 py-2"><p className="text-[10px] text-indigo-200/60">Missionen abgeschlossen</p><p className="text-lg font-bold">{total ? completed + " / " + total : "—"}</p></div>
              <div className="rounded-xl bg-white/[.07] px-3 py-2"><p className="text-[10px] text-indigo-200/60">Abschlussquote</p><p className="text-lg font-bold">{completionRate === null ? "—" : completionRate + "%"}</p></div>
            </div>
          </div> : <div className="relative mt-6 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-white/75 px-5 text-center">
            <Target className="h-7 w-7 text-violet-400" /><p className="mt-3 text-sm font-semibold text-slate-800">Noch keine Kompetenzdaten vorhanden</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Sobald Kompetenz-Level gespeichert wurden, erscheinen sie hier als Klassenübersicht.</p>
          </div>}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600"><Activity className="h-5 w-5" /></span>
              <div><h3 className="text-sm font-bold text-slate-900">Wo gibt es Schwierigkeiten?</h3><p className="mt-1 text-xs leading-5 text-slate-500">Missionen mit niedriger Abschlussquote sind mögliche Ansatzpunkte für Wiederholung oder gemeinsame Reflexion.</p></div>
            </div>
            {bottlenecks.length ? <div className="grid gap-2 sm:grid-cols-2">
              {bottlenecks.map((item) => {
                const rate = Math.max(0, Math.min(100, Number(item.completion_rate ?? 0) * 100));
                const tone = rate < 40 ? "from-rose-500 to-orange-400" : rate < 70 ? "from-amber-400 to-yellow-300" : "from-emerald-400 to-cyan-300";
                return <div key={item.mission_id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-800">{item.mission_title}</span><span className="font-bold tabular-nums text-slate-600">{Math.round(rate)}%</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className={"h-full rounded-full bg-gradient-to-r " + tone} style={{ width: rate + "%" }} /></div>
                  <p className="mt-1 text-[10px] text-slate-400">{item.completed_count ?? "—"} von {item.student_count ?? "—"} abgeschlossen</p>
                </div>;
              })}
            </div> : <div className="flex items-center gap-3 rounded-xl bg-violet-50/80 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600"><Target className="h-4 w-4" /></span>
              <div><p className="text-xs font-semibold text-slate-800">Noch keine auswertbaren Missionsabschlüsse.</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">Sobald Missionen abgeschlossen werden, erscheinen mögliche Lernhürden hier.</p></div>
            </div>}
          </div>
        </section>
      </div>

      <section className="border-t border-slate-100">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><Users className="h-5 w-5" /></span>
            <div><h3 className="text-sm font-bold text-slate-950">Fortschritt pro Schüler:in</h3><p className="mt-1 text-xs leading-5 text-slate-500">Gespeicherte Kompetenz-Level und Missionsfortschritt. Einzelne Klicks oder Likes gelten nicht als Kompetenzgewinn.</p></div>
          </div>
          <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:w-64">
            <Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Schüler:in suchen …" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400" />
          </label>
        </div>
        <div className="overflow-x-auto px-4 pb-3 sm:px-6">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <thead><tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="rounded-l-xl px-4 py-3">Schüler:in</th>
              {competencyTitles.map((title) => <th key={title} className="px-3 py-3">{title}</th>)}
              <th className="px-3 py-3">Missionen</th><th className="rounded-r-xl px-4 py-3">Report</th>
            </tr></thead>
            <tbody>{visibleStudents.map((student) => {
              const row = studentRows[student.user_id];
              return <tr key={student.user_id} className="group">
                <td className="border-b border-slate-100 px-4 py-3.5"><div className="flex items-center gap-2.5"><img src={studentAvatarUrl(student.avatar_seed || student.user_id, 96)} alt="" className="h-9 w-9 shrink-0 rounded-full border border-white object-cover shadow-sm ring-1 ring-violet-100" loading="lazy" /><span className="font-semibold text-slate-800">{student.display_name || student.username || "Schüler:in"}</span></div></td>
                {competencyTitles.map((title) => {
                  const value = row?.competencies[title];
                  const width = value == null ? 0 : Math.max(0, Math.min(5, value)) / 5 * 100;
                  return <td key={title} className="border-b border-slate-100 px-3 py-3.5"><div className="flex min-w-24 items-center gap-2"><div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: width + "%" }} /></div><span className="whitespace-nowrap text-xs tabular-nums text-slate-500">{value == null ? "—" : value + " / 5"}</span></div></td>;
                })}
                <td className="border-b border-slate-100 px-3 py-3.5 text-xs font-medium tabular-nums text-slate-600">{row && row.total > 0 ? row.completed + "/" + row.total : "—"}</td>
                <td className="border-b border-slate-100 px-4 py-3.5"><a href={"/classes/" + classId + "/reports/" + student.user_id} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50">Report öffnen <ArrowUpRight className="h-3.5 w-3.5" /></a></td>
              </tr>;
            })}</tbody>
          </table>
          {visibleStudents.length === 0 && <div className="py-10 text-center text-sm text-slate-400">{students.length ? "Keine Schüler:innen zum Suchbegriff gefunden." : "Noch keine Schüler:innen in dieser Klasseninstanz."}</div>}
        </div>
        <footer className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-[11px] leading-5 text-slate-500 sm:px-7"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />Die Werte basieren ausschließlich auf Daten, die für diese Klasseninstanz zurückgegeben werden. „—“ bedeutet, dass aktuell kein Messwert vorliegt.</footer>
      </section>
    </section>
  );
}
