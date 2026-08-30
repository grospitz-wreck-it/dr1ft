// apps/admin/app/scenarios/page.tsx

import { LayoutGrid, Plus } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createScenario } from "./actions";

export default async function ScenariosPage() {
  const supabase = supabaseServerClient();
  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="px-6 py-5 max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
        <LayoutGrid className="w-4 h-4 text-slate-400" /> Szenarien
      </h1>

      <ul className="space-y-2 mb-6">
        {scenarios?.map((s) => (
          <li
            key={s.id}
            className="bg-panel border border-border rounded-lg px-4 py-3 flex justify-between items-center"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {s.title}{" "}
                <span className={`text-xs2 ml-1 ${s.is_active ? "text-status-live" : "text-slate-400"}`}>
                  {s.is_active ? "● aktiv" : "○ inaktiv"}
                </span>
              </p>
              <p className="text-xs2 text-slate-400">{s.age_rating}</p>
            </div>
            <a href={`/scenarios/${s.id}`} className="text-sm text-accent hover:text-accent-hover">
              Öffnen →
            </a>
          </li>
        ))}
      </ul>

      <form action={createScenario} className="bg-panel border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Neues Szenario
        </h2>
        <input
          name="title"
          placeholder="Titel"
          required
          className="border border-border rounded-md px-3 py-2 w-full text-sm"
        />
        <textarea
          name="description"
          placeholder="Beschreibung"
          className="border border-border rounded-md px-3 py-2 w-full text-sm"
        />
        <select name="ageRating" className="border border-border rounded-md px-3 py-2 w-full text-sm">
          <option value="all_ages">Alle Altersgruppen</option>
          <option value="12_plus" selected>12+</option>
          <option value="16_plus">16+</option>
        </select>
        <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">
          Anlegen
        </button>
        <p className="text-xs2 text-slate-400">
          Wird zunächst als inaktiv angelegt — vor dem Freischalten für
          Klassen prüfen und über den Toggle aktivieren.
        </p>
      </form>
    </div>
  );
}
