import {
  Bot,
  MessageCircle,
  Plus,
  Sparkles,
  Users,
  Link2,
  WandSparkles,
} from "lucide-react";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { createNpcProfile, generateNpcProfiles } from "./actions";

const CATEGORIES = [
  ["student", "Schüler:innen"],
  ["club", "Vereine / Gruppen"],
  ["party", "Politik / Parteien"],
  ["brand", "Brands / Unternehmen"],
  ["citizen", "Normale Leute"],
  ["influencer", "Influencer"],
  ["institution", "Institutionen"],
  ["creator", "Creator / Medien"],
  ["other", "Sonstige"],
] as const;

const AGE_BANDS = [
  ["9_11", "9–11"],
  ["12_13", "12–13"],
  ["14_15", "14–15"],
  ["16_17", "16–17"],
  ["18_plus", "18+"],
] as const;

const ROLE_LABELS: Record<string, string> = {
  ambient: "Füllmaterial",
  story: "Story-NPC",
  hybrid: "Füllmaterial + Story",
};

export default async function NpcDialogsOverviewPage({
  searchParams = {},
}: {
  searchParams?: { error?: string };
}) {
  const supabase = supabaseServerClient();

  const [{ data: creators }, { data: dialogs }, { data: links }] = await Promise.all([
    supabase
      .from("creators")
      .select("id, display_name, handle, bio, persona, npc_category, npc_role, interest_tags, age_bands, story_role, is_active")
      .eq("kind", "npc")
      .order("created_at", { ascending: false }),
    supabase.from("npc_dialogs").select("id, creator_id, title, age_band, scenario_id, status"),
    supabase.from("npc_story_links").select("id, creator_id, scenario_id, age_band, role_label, story_arc_id"),
  ]);

  const categoryLabel = (value: string) =>
    CATEGORIES.find(([key]) => key === value)?.[1] ?? value;

  const dialogCount = new Map<string, number>();
  (dialogs ?? []).forEach((d) => dialogCount.set(d.creator_id, (dialogCount.get(d.creator_id) ?? 0) + 1));

  const linkCount = new Map<string, number>();
  (links ?? []).forEach((l) => linkCount.set(l.creator_id, (linkCount.get(l.creator_id) ?? 0) + 1));

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest mb-2">
              <Users className="w-4 h-4" /> Figurenwelt
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">NPCs & Dialoge</h1>
            <p className="text-slate-500 mt-2 max-w-3xl">
              Erst die wiederverwendbare Figur, dann ihre Story-Verknüpfungen und Dialogbäume.
              Ein NPC behält seine Identität über Szenarien und Altersvarianten hinweg.
            </p>
          </div>
        </header>

        {searchParams.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {searchParams.error}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <WandSparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">NPC-Grundrauschen erzeugen</h2>
              <p className="text-sm text-slate-500 mt-1">
                Erzeuge stapelweise unterschiedliche Figuren für den Feed. Die KI erstellt nur das
                Autorenprofil — keine Live-Dialoge. Persona und Stil werden dauerhaft gespeichert.
              </p>
            </div>
          </div>

          <form action={generateNpcProfiles} className="p-6 grid lg:grid-cols-[1fr_1fr] gap-6">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-[1fr_120px] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">RUBRIK</label>
                  <select name="category" defaultValue="citizen" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">ANZAHL</label>
                  <select name="amount" defaultValue="6" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    {[3, 6, 9, 12].map((n) => <option key={n} value={n}>{n} NPCs</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">OPTIONALER BRIEF</label>
                <textarea
                  name="brief"
                  rows={4}
                  placeholder="z. B. gemischte Schulklasse, Fußballfans, lokale Nachbarschaft, unterschiedliche Mediennutzung …"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-y outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600">ALTERSBÄNDER</label>
                  <span className="text-[11px] text-slate-400">Einsatzbereiche</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AGE_BANDS.map(([value, label]) => (
                    <label key={value} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" name="ageBands" value={value} defaultChecked />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-800">Gespeichert wird</div>
                <div>• kurze Bio und Interessen</div>
                <div>• Sprachstil, typische Muster und Eigenheiten</div>
                <div>• wiederkehrende Details für stabile KI-Prompts</div>
                <div>• Altersbereiche und mögliche Story-Rolle</div>
              </div>

              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
                <Sparkles className="w-4 h-4" /> NPCs generieren
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">NPC-Bibliothek</h2>
              <p className="text-xs text-slate-500 mt-1">{creators?.length ?? 0} Figuren · wiederverwendbar über mehrere Szenarien</p>
            </div>
            <details>
              <summary className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Plus className="w-3.5 h-3.5" /> Manuell
              </summary>
              <form action={createNpcProfile} className="absolute z-10 mt-2 right-10 w-[420px] bg-white border border-slate-200 rounded-xl shadow-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input name="displayName" required placeholder="Name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <input name="handle" placeholder="@handle" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <select name="category" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" defaultValue="citizen">
                  {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <textarea name="bio" placeholder="Kurze Bio" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input name="interests" placeholder="Interessen, kommasepariert" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input name="styleNotes" placeholder="Sprachstil / Eigenheiten" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <button className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm">NPC anlegen</button>
              </form>
            </details>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(creators ?? []).map((npc: any) => (
              <a key={npc.id} href={`/npc-dialogs/${npc.id}`} className="group border border-slate-200 rounded-xl p-4 hover:border-accent hover:bg-accent/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-slate-400 shrink-0" />
                      <h3 className="font-semibold text-slate-900 truncate">{npc.display_name}</h3>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{npc.handle}</div>
                  </div>
                  <span className="text-[10px] rounded-full bg-slate-100 px-2 py-1 text-slate-500 shrink-0">
                    {categoryLabel(npc.npc_category)}
                  </span>
                </div>

                {npc.bio && <p className="text-xs text-slate-500 mt-3 line-clamp-2">{npc.bio}</p>}

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(npc.interest_tags ?? []).slice(0, 5).map((tag: string) => (
                    <span key={tag} className="text-[10px] rounded-full bg-slate-50 border border-slate-200 px-2 py-1 text-slate-500">{tag}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  <span>{ROLE_LABELS[npc.npc_role] ?? npc.npc_role}</span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> {linkCount.get(npc.id) ?? 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {dialogCount.get(npc.id) ?? 0}</span>
                  </span>
                </div>
              </a>
            ))}
          </div>

          {!creators?.length && (
            <div className="text-center py-10 text-sm text-slate-500">
              Noch keine NPCs. Erzeuge zuerst ein Grundrauschen.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
