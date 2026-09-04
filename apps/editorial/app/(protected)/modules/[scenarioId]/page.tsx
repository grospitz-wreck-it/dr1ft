import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Plus, Sparkles } from "lucide-react";
import { supabaseServerClient } from "../../../../lib/supabaseServerClient";
import { ModuleCompetencySelector } from "../../scenarios/ModuleCompetencySelector";
import {
  createModuleBlock,
  deleteModuleBlock,
  toggleBlockLive,
  toggleModule,
  updateModule,
  updateModuleBlock,
  updateModuleCompetencies,
} from "../actions";

const TYPE_OPTIONS = [
  ["post", "Post"], ["comment", "Kommentar"], ["dm_message", "Direktnachricht"], ["minigame", "Minigame"], ["reflection_prompt", "Reflexion"],
] as const;
const FACTORS = [
  ["reward", "Gewinnversprechen"], ["time_pressure", "Zeitdruck"], ["emotion", "Emotion"], ["source_clarity", "Quellenklarheit"], ["social_pressure", "Sozialer Druck"],
] as const;
function score(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function dimensionEntries(profile: any) { return Object.entries((profile?.dimensions ?? {}) as Record<string, unknown>).filter(([, value]) => typeof value === "number") as [string, number][]; }
function effectiveValue(profile: any, overrides: Record<string, unknown>, key: string) { return score(overrides?.[key]) ?? score(profile?.dimensions?.[key]); }

export default async function ModuleBuilderPage({ params }: { params: { scenarioId: string } }) {
  const supabase = supabaseServerClient();
  const { scenarioId } = params;
  const [{ data: module }, { data: blocks }, { data: profiles }, { data: competencies }, { count: missionCount }] = await Promise.all([
    supabase.from("scenarios").select("*").eq("id", scenarioId).single(),
    supabase.from("content_items").select("*, interaction_profiles(*)").eq("scenario_id", scenarioId).order("created_at", { ascending: true }),
    supabase.from("interaction_profiles").select("*").eq("is_active", true).order("label"),
    supabase.from("competencies").select("id,slug,title,description,category").order("category").order("title"),
    supabase.from("missions").select("id", { count: "exact", head: true }).eq("scenario_id", scenarioId),
  ]);
  if (!module) return <div className="p-8 text-sm text-slate-500">Modul nicht gefunden.</div>;

  const primaryCompetencyId = module.primary_competency_id ?? "";
  const secondaryCompetencyIds = Array.isArray(module.secondary_competency_ids) ? module.secondary_competency_ids : [];
  const selectedCompetencies = [primaryCompetencyId, ...secondaryCompetencyIds].map((id) => competencies?.find((c) => c.id === id)).filter(Boolean);

  return (
    <div className="px-6 py-5 max-w-6xl">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4"><Link href="/modules" className="hover:text-slate-700 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Module</Link><span>/</span><span>{module.title}</span></div>

      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-slate-900">{module.title}</h1><span className={`text-xs ${module.is_active ? "text-status-live" : "text-slate-400"}`}>{module.is_active ? "● aktiv" : "○ Entwurf"}</span></div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{module.description || "Noch keine Beschreibung."}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">{selectedCompetencies.map((c, index) => c && <span key={c.id} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${index === 0 ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-500"}`}>{index === 0 ? "Primär · " : "Sekundär · "}{c.title}</span>)}</div>
          <div className="flex gap-4 mt-3 text-xs text-slate-400"><span>{blocks?.length ?? 0} Bausteine</span><span>{missionCount ?? 0} Lernaufgaben</span><span>{module.age_rating}</span></div>
        </div>
        <form action={toggleModule.bind(null, scenarioId, !module.is_active)}><button className="border border-border rounded-md px-3 py-2 text-sm hover:bg-panel">{module.is_active ? "Modul deaktivieren" : "Modul aktivieren"}</button></form>
      </div>

      <section className="bg-panel border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-accent" /><div><h2 className="font-semibold text-sm text-slate-900">Modul-Einstellungen</h2><p className="text-xs text-slate-400 mt-0.5">Titel, Beschreibung und Altersfreigabe.</p></div></div>
        <form action={updateModule.bind(null, scenarioId)} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="title" defaultValue={module.title} required className="border border-border rounded-md px-3 py-2 text-sm" />
          <input name="description" defaultValue={module.description ?? ""} className="border border-border rounded-md px-3 py-2 text-sm md:col-span-1" />
          <div className="flex gap-2"><select name="ageRating" defaultValue={module.age_rating} className="border border-border rounded-md px-3 py-2 text-sm flex-1"><option value="all_ages">Alle</option><option value="12_plus">12+</option><option value="16_plus">16+</option></select><button className="bg-accent text-white rounded-md px-4 text-sm">Speichern</button></div>
        </form>
      </section>

      <section className="bg-panel border border-border rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4"><div><h2 className="font-semibold text-sm text-slate-900">Lernkompetenzen</h2><p className="text-xs text-slate-400 mt-1">Eine primäre und bis zu zwei sekundäre Kompetenzen. Der feste Katalog wird nach Bereichen gruppiert.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">{selectedCompetencies.length}/3</span></div>
        <form action={updateModuleCompetencies.bind(null, scenarioId)}><ModuleCompetencySelector competencies={competencies ?? []} initialPrimaryId={primaryCompetencyId} initialSecondaryIds={secondaryCompetencyIds}/><div className="mt-4 flex justify-end"><button className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">Kompetenzen speichern</button></div></form>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <section>
          <div className="flex items-center justify-between mb-3"><div><h2 className="font-semibold text-slate-900">Bausteine</h2><p className="text-xs text-slate-400">Der Default kommt aus dem Interaktionsprofil. Nur konkrete Abweichungen werden überschrieben.</p></div></div>
          <div className="space-y-4">
            {(blocks ?? []).map((block: any, index: number) => {
              const profile = block.interaction_profiles;
              const overrides = (block.interaction_overrides ?? {}) as Record<string, unknown>;
              const techniques = (block.manipulation_techniques ?? []).join(", ");
              return <form key={block.id} action={updateModuleBlock.bind(null, block.id, scenarioId)} className="bg-panel border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4"><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-canvas border border-border flex items-center justify-center text-xs font-medium text-slate-500">{index + 1}</div><div><div className="flex items-center gap-2"><h3 className="font-medium text-slate-900">{block.title}</h3><span className="text-[11px] text-slate-400">{block.type}</span></div><p className="text-xs text-slate-400 mt-0.5">{block.status === "live" ? "● live" : "○ Entwurf"}{profile ? ` · ${profile.label}` : " · kein Profil"}</p></div></div><div className="flex gap-2"><button formAction={toggleBlockLive.bind(null, block.id, scenarioId, block.status !== "live")} className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas">{block.status === "live" ? "Deaktivieren" : "Live schalten"}</button><button formAction={deleteModuleBlock.bind(null, block.id, scenarioId)} className="text-xs text-status-rejected px-2 py-1">Löschen</button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input name="title" defaultValue={block.title ?? ""} required className="border border-border rounded-md px-3 py-2 text-sm" placeholder="Titel"/><select name="interaction_profile_id" defaultValue={block.interaction_profile_id ?? ""} className="border border-border rounded-md px-3 py-2 text-sm"><option value="">Kein Interaktionsprofil</option>{(profiles ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</select><textarea name="body" defaultValue={block.body ?? ""} className="border border-border rounded-md px-3 py-2 text-sm min-h-24 md:col-span-2" placeholder="Inhalt / Text"/><input name="techniques" defaultValue={techniques} className="border border-border rounded-md px-3 py-2 text-sm" placeholder="Manipulationstechniken, kommagetrennt"/><select name="difficulty" defaultValue={String(block.difficulty ?? 1)} className="border border-border rounded-md px-3 py-2 text-sm"><option value="1">Schwierigkeit 1</option><option value="2">Schwierigkeit 2</option><option value="3">Schwierigkeit 3</option><option value="4">Schwierigkeit 4</option><option value="5">Schwierigkeit 5</option></select></div>
                <div className="mt-4 border-t border-border pt-4"><div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-slate-600">Situationsfaktoren</p><span className="text-[11px] text-slate-400">1 niedrig · 5 hoch</span></div><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{FACTORS.map(([key, label]) => <label key={key} className="text-[11px] text-slate-500"><span className="block mb-1">{label}</span><input name={key} type="number" min={1} max={5} placeholder="Default" defaultValue={typeof overrides[key] === "number" ? String(overrides[key]) : ""} className="border border-border rounded-md px-2 py-1.5 w-full text-sm"/></label>)}</div></div>
                <div className="mt-4 border-t border-border pt-4 flex flex-wrap items-end gap-4"><div className="min-w-[220px]"><p className="text-xs font-medium text-slate-600 mb-2">Ziel-Kompetenzen</p>{(competencies ?? []).map((c: any) => <label key={c.id} className="mr-3 inline-flex items-center gap-1 text-xs text-slate-500 mb-1"><input type="checkbox" name="target_competencies" value={c.id} defaultChecked={(block.target_competencies ?? []).includes(c.id)}/>{c.title}</label>)}</div><div className="flex gap-2 ml-auto"><select name="ageRating" defaultValue={block.age_rating ?? module.age_rating} className="border border-border rounded-md px-2 py-1.5 text-xs"><option value="all_ages">Alle</option><option value="12_plus">12+</option><option value="16_plus">16+</option></select><button className="bg-accent hover:bg-accent-hover text-white text-xs px-3 py-1.5 rounded-md">Baustein speichern</button></div></div>
                {profile && <div className="mt-4 rounded-lg bg-canvas border border-border p-3"><div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-3.5 h-3.5 text-status-live"/><span className="text-xs font-medium text-slate-600">Automatische Bewertung · {profile.label}</span></div><div className="flex flex-wrap gap-2">{dimensionEntries(profile).map(([key, value]) => <span key={key} className="text-[11px] text-slate-500">{key}: <strong>{effectiveValue(profile, overrides, key) ?? value}</strong>{overrides[key] !== undefined ? " · angepasst" : ""}</span>)}</div></div>}
              </form>;
            })}
            {blocks?.length === 0 && <div className="bg-panel border border-dashed border-border rounded-xl p-8 text-center text-sm text-slate-400">Noch keine Bausteine. Rechts den ersten Baustein anlegen.</div>}
          </div>
        </section>
        <aside className="space-y-4 xl:sticky xl:top-5">
          <form action={createModuleBlock.bind(null, scenarioId)} className="bg-panel border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-accent"/><h2 className="font-semibold text-sm text-slate-900">Neuer Baustein</h2></div>
            <input name="title" placeholder="Titel, z. B. Verdächtiger Link" required className="border border-border rounded-md px-3 py-2 w-full text-sm"/>
            <select name="type" defaultValue="post" className="border border-border rounded-md px-3 py-2 w-full text-sm">{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <textarea name="body" placeholder="Inhalt / Text" className="border border-border rounded-md px-3 py-2 w-full text-sm min-h-24"/>
            <select name="interaction_profile_id" className="border border-border rounded-md px-3 py-2 w-full text-sm"><option value="">Interaktionsprofil auswählen…</option>{(profiles ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
            <input name="techniques" placeholder="Manipulationstechniken, kommagetrennt" className="border border-border rounded-md px-3 py-2 w-full text-sm"/>
            <select name="difficulty" defaultValue="1" className="border border-border rounded-md px-3 py-2 w-full text-sm"><option value="1">Schwierigkeit 1</option><option value="2">Schwierigkeit 2</option><option value="3">Schwierigkeit 3</option><option value="4">Schwierigkeit 4</option><option value="5">Schwierigkeit 5</option></select>
            <div><p className="text-xs font-medium text-slate-600 mb-2">Situationsfaktoren <span className="font-normal text-slate-400">optional</span></p><div className="grid grid-cols-2 gap-2">{FACTORS.map(([key, label]) => <label key={key} className="text-[11px] text-slate-500">{label}<input name={key} type="number" min={1} max={5} placeholder="Default" className="border border-border rounded-md px-2 py-1.5 w-full text-sm mt-1"/></label>)}</div></div>
            <div><p className="text-xs font-medium text-slate-600 mb-2">Ziel-Kompetenzen</p>{(competencies ?? []).map((c: any) => <label key={c.id} className="flex items-center gap-2 text-xs text-slate-500 mb-1"><input type="checkbox" name="target_competencies" value={c.id}/>{c.title}</label>)}</div>
            <select name="ageRating" defaultValue={module.age_rating} className="border border-border rounded-md px-3 py-2 w-full text-sm"><option value="all_ages">Alle</option><option value="12_plus">12+</option><option value="16_plus">16+</option></select>
            <button className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md w-full">Baustein anlegen</button>
          </form>
          <div className="bg-canvas border border-border rounded-xl p-4 text-xs text-slate-500 space-y-2"><p className="font-medium text-slate-700">So funktioniert die Bewertung</p><p>Das Interaktionsprofil liefert den Standard. Situationsfaktoren beschreiben den konkreten Kontext. Nur wenn eine Situation abweicht, überschreibst du den Default.</p><p className="text-slate-400">Beispiel: „Teilen“ bleibt automatisch mit seinem Standardprofil bewertet. Ein besonders emotionaler, zeitkritischer Post kann zusätzlich Emotion 5 und Zeitdruck 5 erhalten.</p></div>
          <Link href={`/missions/${scenarioId}`} className="flex items-center justify-between bg-panel border border-border rounded-xl p-4 text-sm text-slate-600 hover:text-slate-900"><span>Missionen & Story-Arcs öffnen</span><ExternalLink className="w-4 h-4"/></Link>
        </aside>
      </div>
    </div>
  );
}
