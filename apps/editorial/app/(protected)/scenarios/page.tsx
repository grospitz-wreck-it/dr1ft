// apps/admin/app/scenarios/page.tsx

import { LayoutGrid, Plus } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createScenario } from "./actions";
import { ModuleCompetencySelector } from "./ModuleCompetencySelector";

export default async function ScenariosPage() {
  const supabase = supabaseServerClient();
  const [{ data: scenarios }, { data: competencies }] = await Promise.all([
    supabase.from("scenarios").select("*").order("created_at", { ascending: false }),
    supabase.from("competencies").select("id,slug,title,description,category").order("category").order("title"),
  ]);

  const competencyById = new Map((competencies ?? []).map((c) => [c.id, c]));

  return (
    <div className="px-6 py-5 max-w-4xl">
      <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
        <LayoutGrid className="w-4 h-4 text-slate-400" /> Module
      </h1>

      <ul className="space-y-2 mb-6">
        {scenarios?.map((s) => {
          const primary = s.primary_competency_id ? competencyById.get(s.primary_competency_id) : null;
          const secondary = (s.secondary_competency_ids ?? [])
            .map((id: string) => competencyById.get(id))
            .filter(Boolean);
          return (
            <li key={s.id} className="bg-panel border border-border rounded-lg px-4 py-3 flex justify-between gap-4 items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {s.title}{" "}
                  <span className={`text-xs2 ml-1 ${s.is_active ? "text-status-live" : "text-slate-400"}`}>
                    {s.is_active ? "● aktiv" : "○ inaktiv"}
                  </span>
                </p>
                <p className="text-xs2 text-slate-400">{s.age_rating}</p>
                {primary && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                      Primär: {primary.title}
                    </span>
                    {secondary.map((c) => c && (
                      <span key={c.id} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                        {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <a href={`/scenarios/${s.id}`} className="shrink-0 text-sm text-accent hover:text-accent-hover">Öffnen →</a>
            </li>
          );
        })}
      </ul>

      <form action={createScenario} className="bg-panel border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Neues Modul
          </h2>
          <p className="mt-1 text-xs text-slate-400">Die Kompetenzzuordnung bleibt bewusst klein: eine primäre und bis zu zwei sekundäre Kompetenzen.</p>
        </div>

        <input name="title" placeholder="Modultitel" required className="border border-border rounded-xl px-3 py-2.5 w-full text-sm" />
        <textarea name="description" placeholder="Kurzbeschreibung" className="border border-border rounded-xl px-3 py-2.5 w-full text-sm" />
        <select name="ageRating" defaultValue="12_plus" className="border border-border rounded-xl px-3 py-2.5 w-full text-sm">
          <option value="all_ages">Alle Altersgruppen</option>
          <option value="12_plus">12+</option>
          <option value="16_plus">16+</option>
        </select>

        <div className="rounded-2xl border border-border bg-canvas p-4">
          <ModuleCompetencySelector competencies={competencies ?? []} />
        </div>

        <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2.5 rounded-xl">
          Modul anlegen
        </button>
        <p className="text-xs text-slate-400">
          Wird zunächst als inaktiv angelegt — vor dem Freischalten für Klassen prüfen und über den Toggle aktivieren.
        </p>
      </form>
    </div>
  );
}
