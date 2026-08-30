import { Settings2, Plus } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { createInteractionProfile, toggleInteractionProfile, updateInteractionProfile } from "./actions";

const DIMENSIONS = [
  ["risk", "Risiko"],
  ["impulsivity", "Impulsivität"],
  ["social_pressure", "Sozialer Druck"],
  ["source_awareness", "Quellenbewusstsein"],
  ["difficulty", "Schwierigkeit"],
] as const;

export default async function InteractionProfilesPage() {
  const supabase = supabaseServerClient();
  const { data: profiles } = await supabase.from("interaction_profiles").select("*").order("label");

  return (
    <div className="px-6 py-5 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Settings2 className="w-4 h-4 text-slate-400" /> Interaktionsprofile</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">Zentrale Defaults für Aktionen. Bausteine erben diese Bewertung automatisch und überschreiben sie nur bei Bedarf.</p>
      </div>

      <div className="space-y-4 mb-8">
        {(profiles ?? []).map((profile: any) => {
          const values = profile.dimensions ?? {};
          return (
            <form key={profile.id} action={updateInteractionProfile.bind(null, profile.id)} className="bg-panel border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div><div className="flex items-center gap-2"><h2 className="font-medium text-slate-900">{profile.label}</h2><span className="text-[11px] font-mono text-slate-400">{profile.key}</span></div><p className="text-xs text-slate-400 mt-1">{profile.description}</p></div>
                <button formAction={toggleInteractionProfile.bind(null, profile.id, !profile.is_active)} className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas">{profile.is_active ? "Aktiv" : "Deaktiviert"}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input name="label" defaultValue={profile.label} required className="border border-border rounded-md px-3 py-2 text-sm" placeholder="Bezeichnung" />
                <input name="interaction_type" defaultValue={profile.interaction_type} required className="border border-border rounded-md px-3 py-2 text-sm" placeholder="Event-Typ" />
                <input name="description" defaultValue={profile.description ?? ""} className="border border-border rounded-md px-3 py-2 text-sm" placeholder="Beschreibung" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {DIMENSIONS.map(([key, label]) => <label key={key} className="text-xs text-slate-500">{label}<input name={key} type="number" min={-5} max={5} defaultValue={values[key] ?? 0} className="border border-border rounded-md px-2 py-1.5 w-full text-sm mt-1" /></label>)}
              </div>
              <div className="flex justify-end mt-4"><button className="bg-accent hover:bg-accent-hover text-white text-xs px-3 py-1.5 rounded-md">Default speichern</button></div>
            </form>
          );
        })}
      </div>

      <form action={createInteractionProfile} className="bg-panel border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Plus className="w-4 h-4" /> Neues Interaktionsprofil</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="key" placeholder="interne_id" required className="border border-border rounded-md px-3 py-2 text-sm" />
          <input name="label" placeholder="Bezeichnung" required className="border border-border rounded-md px-3 py-2 text-sm" />
          <input name="interaction_type" placeholder="Event-Typ" required className="border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <input name="description" placeholder="Kurzbeschreibung" className="border border-border rounded-md px-3 py-2 w-full text-sm" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {DIMENSIONS.map(([key, label]) => <label key={key} className="text-xs text-slate-500">{label}<input name={key} type="number" min={-5} max={5} defaultValue={0} className="border border-border rounded-md px-2 py-1.5 w-full text-sm mt-1" /></label>)}
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">Profil anlegen</button>
      </form>
    </div>
  );
}
