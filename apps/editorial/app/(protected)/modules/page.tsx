import { LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createModule } from "./actions";
import { ModuleCompetencySelector } from "../scenarios/ModuleCompetencySelector";

export default async function ModulesPage() {
  const supabase = supabaseServerClient();
  const [{ data: modules }, { data: competencies }] = await Promise.all([
    supabase.from("scenarios").select("*").order("created_at", { ascending: false }),
    supabase.from("competencies").select("id,slug,title,description,category").order("category").order("title"),
  ]);

  const counts = await Promise.all((modules ?? []).map(async (module) => {
    const { count } = await supabase.from("content_items").select("id", { count: "exact", head: true }).eq("scenario_id", module.id);
    const { count: missionCount } = await supabase.from("missions").select("id", { count: "exact", head: true }).eq("scenario_id", module.id);
    return { id: module.id, blocks: count ?? 0, missions: missionCount ?? 0 };
  }));
  const countById = new Map(counts.map((x) => [x.id, x]));
  const competencyById = new Map((competencies ?? []).map((c) => [c.id, c]));

  return (
    <div className="px-6 py-5 max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-slate-400" /> Module-Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Module anlegen, Bausteine zusammenstellen und Interaktionen bewerten.</p>
        </div>
      </div>

      <div className="grid gap-3 mb-8">
        {(modules ?? []).map((module) => {
          const stats = countById.get(module.id);
          const primary = module.primary_competency_id ? competencyById.get(module.primary_competency_id) : null;
          const secondary = (module.secondary_competency_ids ?? []).map((id: string) => competencyById.get(id)).filter(Boolean);
          return (
            <Link key={module.id} href={`/modules/${module.id}`} className="bg-panel border border-border rounded-xl p-4 hover:border-slate-300 transition block">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><h2 className="font-medium text-slate-900">{module.title}</h2><span className={`text-xs2 ${module.is_active ? "text-status-live" : "text-slate-400"}`}>{module.is_active ? "● aktiv" : "○ Entwurf"}</span></div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{module.description || "Keine Beschreibung"}</p>
                  {primary && <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">Primär: {primary.title}</span>{secondary.map((c) => c && <span key={c.id} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">{c.title}</span>)}</div>}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400"><div>{stats?.blocks ?? 0} Bausteine</div><div>{stats?.missions ?? 0} Lernaufgaben</div></div>
              </div>
            </Link>
          );
        })}
      </div>

      <form action={createModule} className="bg-panel border border-border rounded-2xl p-5 space-y-4">
        <div><h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Plus className="w-4 h-4" /> Neues Modul</h2><p className="text-xs text-slate-400 mt-1">Eine primäre und bis zu zwei sekundäre Lernkompetenzen.</p></div>
        <input name="title" placeholder="Modultitel" required className="border border-border rounded-xl px-3 py-2.5 w-full text-sm" />
        <textarea name="description" placeholder="Worum geht es in diesem Modul?" className="border border-border rounded-xl px-3 py-2 w-full text-sm min-h-20" />
        <select name="ageRating" defaultValue="12_plus" className="border border-border rounded-xl px-3 py-2 w-full text-sm"><option value="all_ages">Alle Altersgruppen</option><option value="12_plus">12+</option><option value="16_plus">16+</option></select>
        <div className="rounded-2xl border border-border bg-canvas p-4"><ModuleCompetencySelector competencies={competencies ?? []} /></div>
        <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2.5 rounded-xl">Modul anlegen</button>
      </form>
    </div>
  );
}
