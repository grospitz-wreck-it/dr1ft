import { Bot, Link2, MessageCircle, Plus, Sparkles } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import {
  createNpcDialog,
  createNpcMessage,
  linkNpcToStory,
} from "../actions";
import { ReplyOptionsEditor } from "./ReplyOptionsEditor";
import { ConsequenceEditor } from "./ConsequenceEditor";
import { ContentStatusControl } from "../../scenarios/[scenarioId]/ContentStatusControl";

const AGE_BANDS = [
  ["9_11", "9–11"],
  ["12_13", "12–13"],
  ["14_15", "14–15"],
  ["16_17", "16–17"],
  ["18_plus", "18+"],
] as const;

const CATEGORIES: Record<string, string> = {
  student: "Schüler:innen",
  club: "Vereine / Gruppen",
  party: "Politik / Parteien",
  brand: "Brands / Unternehmen",
  citizen: "Normale Leute",
  influencer: "Influencer",
  institution: "Institutionen",
  creator: "Creator / Medien",
  other: "Sonstige",
};

interface Props {
  params: { creatorId: string };
  searchParams?: { dialog?: string };
}

function bodyPreview(body: string, max = 70): string {
  return body.length > max ? body.slice(0, max) + "…" : body;
}

export default async function NpcDialogTreePage({ params, searchParams = {} }: Props) {
  const supabase = supabaseServerClient();
  const { creatorId } = params;

  const [
    { data: creator },
    { data: dialogs },
    { data: links },
    { data: scenarios },
    { data: arcs },
  ] = await Promise.all([
    supabase.from("creators").select("*").eq("id", creatorId).single(),
    supabase
      .from("npc_dialogs")
      .select("id, title, description, age_band, scenario_id, story_arc_id, status, root_content_item_id")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false }),
    supabase
      .from("npc_story_links")
      .select("id, scenario_id, story_arc_id, age_band, role_label, notes, is_active")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false }),
    supabase.from("scenarios").select("id, title").order("title"),
    supabase.from("story_arcs").select("id, title, scenario_id").order("title"),
  ]);

  const selectedDialogId = searchParams.dialog || dialogs?.[0]?.id || "";
  const selectedDialog = (dialogs ?? []).find((d: any) => d.id === selectedDialogId);

  const { data: messages } = selectedDialogId
    ? await supabase
        .from("content_items")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("npc_dialog_id", selectedDialogId)
        .eq("type", "dm_message")
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  const allMessages = messages ?? [];
  const byId = new Map(allMessages.map((m: any) => [m.id, m]));
  const referenced = new Set<string>();

  allMessages.forEach((m: any) => {
    (m.extra?.replyOptions ?? []).forEach((opt: any) => referenced.add(opt.nextContentItemId));
  });

  const roots = selectedDialog?.root_content_item_id
    ? [byId.get(selectedDialog.root_content_item_id)].filter(Boolean)
    : allMessages.filter((m: any) => !referenced.has(m.id));

  const persona = creator?.persona ?? {};

  function renderNode(msg: any, depth: number, visited: Set<string>) {
    if (visited.has(msg.id)) {
      return (
        <div key={msg.id + "-cycle"} className="text-xs text-red-600 pl-4">
          ⚠️ Zyklus erkannt — verweist zurück auf eine bereits gezeigte Nachricht.
        </div>
      );
    }

    const nextVisited = new Set(visited).add(msg.id);
    const options: any[] = msg.extra?.replyOptions ?? [];

    return (
      <div key={msg.id} style={{ marginLeft: Math.min(depth, 8) * 18 }} className="mt-3">
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Bot className="w-3.5 h-3.5" />
              <span>{creator?.display_name}</span>
            </div>
            <ContentStatusControl contentItemId={msg.id} status={msg.status} />
          </div>

          <p className="text-sm text-slate-800 mt-2 whitespace-pre-wrap">{msg.body}</p>

          <ReplyOptionsEditor
            messageId={msg.id}
            creatorId={creatorId}
            initialOptions={options}
            availableMessages={allMessages
              .filter((m: any) => m.id !== msg.id)
              .map((m: any) => ({ id: m.id, bodyPreview: bodyPreview(m.body ?? "") }))}
          />

          {options.length === 0 && (
            <ConsequenceEditor
              messageId={msg.id}
              creatorId={creatorId}
              initialConsequence={msg.extra?.consequence ?? null}
              availableMessages={allMessages
                .filter((m: any) => m.id !== msg.id)
                .map((m: any) => ({ id: m.id, bodyPreview: bodyPreview(m.body ?? "") }))}
            />
          )}
        </div>

        {options
          .map((opt) => byId.get(opt.nextContentItemId))
          .filter(Boolean)
          .map((child) => renderNode(child, depth + 1, nextVisited))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-accent">
                <Bot className="w-4 h-4" /> NPC-Profil
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <h1 className="text-2xl font-semibold text-slate-900">{creator?.display_name}</h1>
                <span className="text-sm text-slate-400">{creator?.handle}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  {CATEGORIES[creator?.npc_category ?? ""] ?? creator?.npc_category}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  {creator?.npc_role === "hybrid" ? "Füllmaterial + Story" : creator?.npc_role === "story" ? "Story-NPC" : "Füllmaterial"}
                </span>
                {(creator?.age_bands ?? []).map((band: string) => (
                  <span key={band} className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                    {AGE_BANDS.find(([value]) => value === band)?.[1] ?? band}
                  </span>
                ))}
              </div>
              {creator?.bio && <p className="text-sm text-slate-600 mt-4 max-w-3xl">{creator.bio}</p>}
            </div>

            <div className="xl:w-[430px] rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-800">Stabile KI-Persona</div>
              {persona.styleNotes && <div><span className="font-medium">Stil:</span> {persona.styleNotes}</div>}
              {persona.worldview && <div><span className="font-medium">Grundhaltung:</span> {persona.worldview}</div>}
              {Array.isArray(persona.mannerisms) && persona.mannerisms.length > 0 && (
                <div><span className="font-medium">Eigenheiten:</span> {persona.mannerisms.join(" · ")}</div>
              )}
              {Array.isArray(persona.recurringDetails) && persona.recurringDetails.length > 0 && (
                <div><span className="font-medium">Wiederkehrend:</span> {persona.recurringDetails.join(" · ")}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {(creator?.interest_tags ?? []).map((tag: string) => (
              <span key={tag} className="text-[11px] rounded-full bg-slate-50 border border-slate-200 px-2 py-1 text-slate-500">{tag}</span>
            ))}
          </div>
        </header>

        <section className="grid xl:grid-cols-[1fr_1fr] gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Link2 className="w-4 h-4 text-slate-400" /> Story-Verknüpfungen</h2>
                <p className="text-xs text-slate-500 mt-1">Derselbe NPC kann je Altersgruppe eine andere Rolle bekommen.</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {(links ?? []).map((link: any) => {
                const scenario = scenarios?.find((s: any) => s.id === link.scenario_id);
                const arc = arcs?.find((a: any) => a.id === link.story_arc_id);
                return (
                  <div key={link.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{scenario?.title ?? "Szenario"}</span>
                      <span className="text-slate-400">{AGE_BANDS.find(([v]) => v === link.age_band)?.[1] ?? link.age_band}</span>
                    </div>
                    <div className="text-slate-500 mt-1">{link.role_label || "Storyrolle"}{arc ? ` · ${arc.title}` : ""}</div>
                  </div>
                );
              })}
            </div>

            <form action={linkNpcToStory} className="grid sm:grid-cols-2 gap-2">
              <input type="hidden" name="creatorId" value={creatorId} />
              <select name="scenarioId" required className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Szenario…</option>
                {(scenarios ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <select name="ageBand" defaultValue="12_13" className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {AGE_BANDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select name="storyArcId" className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2">
                <option value="">Story-Arc optional…</option>
                {(arcs ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
              <input name="roleLabel" placeholder="Rolle, z. B. 'kritischer Nachbar'" className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
              <textarea name="notes" placeholder="Kurze redaktionelle Notiz zur Funktion in dieser Story…" className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
              <button className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg px-3 py-2 text-sm">
                <Link2 className="w-3.5 h-3.5" /> Story verknüpfen
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-slate-400" /> Dialoge</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">Jeder Dialog ist ein eigener, alters- und storybezogener Entscheidungsbaum.</p>

            <div className="space-y-2 mb-4">
              {(dialogs ?? []).map((dialog: any) => (
                <a
                  key={dialog.id}
                  href={`/npc-dialogs/${creatorId}?dialog=${dialog.id}`}
                  className={`block rounded-lg border px-3 py-2 ${selectedDialogId === dialog.id ? "border-accent bg-accent/5" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{dialog.title}</span>
                    <span className="text-xs text-slate-400">{AGE_BANDS.find(([v]) => v === dialog.age_band)?.[1] ?? dialog.age_band}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{dialog.status === "live" ? "Live" : "Entwurf"}</div>
                </a>
              ))}
            </div>

            <details>
              <summary className="cursor-pointer text-xs font-medium text-accent">+ Dialog anlegen</summary>
              <form action={createNpcDialog} className="mt-3 space-y-2">
                <input type="hidden" name="creatorId" value={creatorId} />
                <input name="title" required placeholder="z. B. Daniel spricht über ein virales Video" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <select name="ageBand" defaultValue="12_13" className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {AGE_BANDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select name="scenarioId" className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Szenario optional…</option>
                    {(scenarios ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <select name="storyArcId" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Story-Arc optional…</option>
                  {(arcs ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
                <textarea name="description" placeholder="Was soll der Dialog beim Lernenden auslösen?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <button className="w-full bg-accent text-white rounded-lg px-3 py-2 text-sm">Dialog anlegen</button>
              </form>
            </details>
          </div>
        </section>

        {selectedDialog && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-5">
              <div>
                <div className="text-xs uppercase tracking-widest font-semibold text-accent">Entscheidungsdialog</div>
                <h2 className="text-xl font-semibold text-slate-900 mt-1">{selectedDialog.title}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {AGE_BANDS.find(([v]) => v === selectedDialog.age_band)?.[1]} · {selectedDialog.description || "Noch keine Beschreibung"}
                </p>
              </div>
              <div className="text-xs text-slate-400">{allMessages.length} Nachrichten</div>
            </div>

            {roots.length > 0 ? (
              <div className="space-y-2">{roots.map((root: any) => renderNode(root, 0, new Set()))}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Noch keine Nachrichten. Lege die erste NPC-Nachricht an — sie wird automatisch zur Wurzel dieses Dialogs.
              </div>
            )}

            <form action={createNpcMessage.bind(null, creatorId, selectedDialog.id)} className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700">NPC-Nachricht hinzufügen</div>
              <textarea name="body" required rows={3} placeholder="Was sagt der NPC?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
              <button className="inline-flex items-center gap-2 bg-accent text-white rounded-lg px-3 py-2 text-sm">
                <Plus className="w-3.5 h-3.5" /> Nachricht anlegen
              </button>
              <p className="text-[11px] text-slate-400">
                Danach kannst du an dieser Nachricht Antwortoptionen anlegen. Jede Antwort verweist auf einen nächsten Knoten.
              </p>
            </form>
          </section>
        )}

        {!selectedDialog && (
          <section className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-700 mt-3">Noch kein Dialog ausgewählt</p>
            <p className="text-xs text-slate-500 mt-1">Lege rechts oben einen altersbezogenen Entscheidungsdialog an.</p>
          </section>
        )}
      </div>
    </div>
  );
}
