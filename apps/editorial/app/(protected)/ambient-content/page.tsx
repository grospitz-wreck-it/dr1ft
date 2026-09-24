// apps/editorial/app/(protected)/ambient-content/page.tsx

import type { ReactNode } from "react";
import { Sparkles, Image as ImageIcon, Wand2, Zap, Search, SlidersHorizontal } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { AmbientInterestPicker } from "./AmbientInterestPicker";
import { archiveAmbientContent, generateAmbientDrafts } from "./actions";
import { ContentStatusControl } from "../../scenarios/[scenarioId]/ContentStatusControl";

const STATUS_ORDER = ["draft", "in_review", "approved", "live", "rejected", "archived"];
const STYLE_OPTIONS = [["mixed", "✨ Wild Mix — alles durcheinander"], ["casual", "😎 Locker & natürlich"], ["chatty", "💬 Chatty / Messenger"], ["meme", "💀 Meme-native / Internet"], ["deadpan", "😐 Trocken / deadpan"], ["wholesome", "🫶 Warm / wholesome"], ["chaotic", "🤪 Chaotisch / impulsiv"], ["observational", "👀 Beobachtend"], ["storyteller", "📖 Mini-Storys"], ["minimal", "🫥 Minimalistisch"]];
const INTEREST_OPTIONS = ["🎵 Musik", "🎮 Gaming", "🍿 Serien & Filme", "⚽ Sport", "👟 Mode", "🍕 Essen", "🏃 Fitness", "✈️ Reisen", "🐶 Tiere", "📱 Tech", "📚 Schule", "🫶 Freunde", "😂 Memes", "🎨 Kreativität", "📖 Bücher", "🌿 Natur", "🔬 Wissenschaft", "📍 Lokales"];
const statusLabel: Record<string, string> = { draft: "ENTWURF", in_review: "REVIEW", approved: "APPROVED", live: "LIVE", rejected: "ABGELEHNT", archived: "ARCHIV" };

type Props = { searchParams?: { status?: string; q?: string; media?: string; provider?: string; creator?: string; age?: string; grade?: string; mission?: string; arc?: string } };

export default async function AmbientContentPage({ searchParams = {} }: Props) {
  const supabase = supabaseServerClient();
  const statusFilter = STATUS_ORDER.includes(searchParams.status ?? "") ? searchParams.status! : "all";
  const q = String(searchParams.q ?? "").trim();
  const mediaFilter = ["all", "image", "text"].includes(searchParams.media ?? "") ? searchParams.media! : "all";
  const providerFilter = ["all", "cloudflare", "gemini", "none"].includes(searchParams.provider ?? "") ? searchParams.provider! : "all";
  const creatorFilter = String(searchParams.creator ?? "").trim();
  const ageFilter = String(searchParams.age ?? "").trim();
  const gradeFilter = String(searchParams.grade ?? "").trim();
  const missionFilter = String(searchParams.mission ?? "").trim();
  const arcFilter = String(searchParams.arc ?? "").trim();

  let itemsQuery = supabase
    .from("content_items")
    .select("*")
    .eq("type", "post")
    .is("scenario_id", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (statusFilter !== "all") itemsQuery = itemsQuery.eq("status", statusFilter);
  if (creatorFilter) itemsQuery = itemsQuery.eq("creator_id", creatorFilter);
  if (q) itemsQuery = itemsQuery.ilike("body", `%${q}%`);

  const [{ data: ambientCreators }, { data: items }, { data: profiles }, { data: missions }, { data: arcSteps }, { data: arcs }, { data: classAssignments }] = await Promise.all([
    supabase.from("creators").select("id, display_name").eq("creator_role", "ambient").order("display_name"),
    itemsQuery,
    supabase.from("ambient_generation_profiles").select("key, label, age_band, typo_level, slang_level, emoji_level, image_probability").eq("is_active", true).order("label"),
    supabase.from("missions").select("id, title, scenario_id, reflection_content_id"),
    supabase.from("story_arc_steps").select("arc_id, mission_id"),
    supabase.from("story_arcs").select("id, title, scenario_id"),
    supabase.from("class_scenario_assignments").select("class_id, scenario_id, classes(id, name, grade_level)"),
  ]);

  const missionRows = missions ?? [];
  const arcRows = arcs ?? [];
  const arcStepRows = arcSteps ?? [];
  const assignmentRows = classAssignments ?? [];

  const missionByContent = new Map<string, { id: string; title: string; scenarioId: string | null }[]>();
  for (const mission of missionRows) {
    if (!mission.reflection_content_id) continue;
    const current = missionByContent.get(mission.reflection_content_id) ?? [];
    current.push({ id: mission.id, title: mission.title, scenarioId: mission.scenario_id });
    missionByContent.set(mission.reflection_content_id, current);
  }

  const arcByMission = new Map<string, { id: string; title: string }[]>();
  for (const step of arcStepRows) {
    const arc = arcRows.find((candidate) => candidate.id === step.arc_id);
    if (!arc) continue;
    const current = arcByMission.get(step.mission_id) ?? [];
    if (!current.some((item) => item.id === arc.id)) current.push({ id: arc.id, title: arc.title });
    arcByMission.set(step.mission_id, current);
  }

  const classesByScenario = new Map<string, { id: string; name: string; gradeLevel: number | null }[]>();
  for (const assignment of assignmentRows) {
    const classRow = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
    if (!classRow || !assignment.scenario_id) continue;
    const current = classesByScenario.get(assignment.scenario_id) ?? [];
    if (!current.some((item) => item.id === classRow.id)) {
      current.push({ id: classRow.id, name: classRow.name, gradeLevel: classRow.grade_level });
    }
    classesByScenario.set(assignment.scenario_id, current);
  }

  const ageOptions = Array.from(new Set((items ?? []).map((item) => item.extra?.ageBand ?? item.age_rating).filter(Boolean))).sort();
  const gradeOptions = Array.from(new Set(
    Array.from(classesByScenario.values()).flatMap((classes) => classes.map((item) => item.gradeLevel).filter((value): value is number => typeof value === "number"))
  )).sort((a, b) => a - b);
  const missionOptions = Array.from(new Map(missionRows.map((mission) => [mission.id, mission])).values()).sort((a, b) => a.title.localeCompare(b.title));
  const arcOptions = Array.from(new Map(arcRows.map((arc) => [arc.id, arc])).values()).sort((a, b) => a.title.localeCompare(b.title));

  const filteredItems = (items ?? []).filter((item) => {
    const hasImage = item.media_type === "image" || Boolean(item.media_url);
    const imageProvider = item.extra?.imageProvider;
    const mediaOk = mediaFilter === "all" || (mediaFilter === "image" && hasImage) || (mediaFilter === "text" && !hasImage);
    const providerOk = providerFilter === "all" || (providerFilter === "cloudflare" && imageProvider === "cloudflare") || (providerFilter === "gemini" && imageProvider === "gemini") || (providerFilter === "none" && !imageProvider);

    const missionUsage = missionByContent.get(item.id) ?? [];
    const arcUsage = missionUsage.flatMap((mission) => arcByMission.get(mission.id) ?? []);
    const classUsage = missionUsage.flatMap((mission) => mission.scenarioId ? (classesByScenario.get(mission.scenarioId) ?? []) : []);
    const ages = new Set([item.extra?.ageBand, item.age_rating].filter(Boolean).map(String));
    const grades = new Set(classUsage.map((entry) => String(entry.gradeLevel)).filter(Boolean));
    const missionOk = !missionFilter || missionUsage.some((mission) => mission.id === missionFilter);
    const arcOk = !arcFilter || arcUsage.some((arc) => arc.id === arcFilter);
    const ageOk = !ageFilter || ages.has(ageFilter);
    const gradeOk = !gradeFilter || grades.has(gradeFilter);

    return mediaOk && providerOk && missionOk && arcOk && ageOk && gradeOk;
  });

  const grouped = STATUS_ORDER.map((status) => ({ status, items: filteredItems.filter((c) => c.status === status) })).filter((group) => group.items.length > 0);
  const allAmbient = items ?? [];
  const liveCount = allAmbient.filter((item) => item.status === "live").length;
  const draftCount = allAmbient.filter((item) => item.status === "draft").length;
  const imageCount = allAmbient.filter((item) => item.media_type === "image").length;
  const activeFilterCount = [statusFilter !== "all", Boolean(q), mediaFilter !== "all", providerFilter !== "all", Boolean(creatorFilter), Boolean(ageFilter), Boolean(gradeFilter), Boolean(missionFilter), Boolean(arcFilter)].filter(Boolean).length;

  const filterHref = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (statusFilter !== "all" && key !== "status") params.set("status", statusFilter);
    if (q && key !== "q") params.set("q", q);
    if (mediaFilter !== "all" && key !== "media") params.set("media", mediaFilter);
    if (providerFilter !== "all" && key !== "provider") params.set("provider", providerFilter);
    if (creatorFilter && key !== "creator") params.set("creator", creatorFilter);
    if (ageFilter && key !== "age") params.set("age", ageFilter);
    if (gradeFilter && key !== "grade") params.set("grade", gradeFilter);
    if (missionFilter && key !== "mission") params.set("mission", missionFilter);
    if (arcFilter && key !== "arc") params.set("arc", arcFilter);
    if (value && value !== "all") params.set(key, value);
    return `/ambient-content${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return <div className="min-h-screen bg-slate-50 px-6 py-6"><div className="max-w-7xl mx-auto space-y-6">
    <header className="flex items-end justify-between gap-6"><div><div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest mb-2"><Sparkles className="w-4 h-4" /> AI Content Studio</div><h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ambient-Content-Generator</h1><p className="text-slate-500 mt-2 max-w-3xl">Ambient ist ausschließlich eigenständiger Feed-Content. Szenario-, Klassen- und Instanz-Content bleibt aus dieser Übersicht heraus.</p></div><div className="hidden md:flex gap-2 text-xs"><Stat label="LIVE" value={liveCount}/><Stat label="DRAFTS" value={draftCount}/><Stat label="BILDER" value={imageCount}/></div></header>

    <form action={generateAmbientDrafts} className="grid xl:grid-cols-[1.45fr_1fr] gap-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900 flex items-center gap-2"><Wand2 className="w-4 h-4 text-accent"/> Feed-Rezept</h2><p className="text-xs text-slate-500 mt-1">Wie soll sich der Feed anfühlen?</p></div><span className="text-[11px] px-2 py-1 rounded-full bg-violet-50 text-violet-700 font-medium">AMBIENT v4</span></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-2">THEMA / KONTEXT</label><input name="theme" required placeholder="z.B. Schulweg, Wochenende, neue Musik, Freibad, Gaming-Abend …" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"/></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-2">INTERESSEN · MAX. 3</label><AmbientInterestPicker options={INTEREST_OPTIONS} /></div>
        <div className="grid md:grid-cols-2 gap-4"><Field label="ZIELGRUPPE"><select name="ageBand" defaultValue="14_15" className="control"><option value="12_13">12–13 · Early Teen</option><option value="14_15">14–15 · Teen</option><option value="16_17">16–17 · Older Teen</option><option value="18_plus">18+ · Young Adult</option><option value="all">Altersneutral</option></select></Field><Field label="CREATOR / STIMME"><select name="creatorId" className="control"><option value="">Automatisch wechseln</option>{ambientCreators?.map((creator)=><option key={creator.id} value={creator.id}>{creator.display_name}</option>)}</select></Field></div>
        <Field label="SCHREIBSTIL"><select name="style" defaultValue="mixed" className="control">{STYLE_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
        <div className="grid md:grid-cols-3 gap-4"><SliderSelect name="typoLevel" label="TIPPFEHLER" options={["0 · clean","1 · gelegentlich","2 · glaubwürdig","3 · chaotisch"]}/><SliderSelect name="slangLevel" label="JUGENDSPRACHE" options={["0 · neutral","1 · leicht","2 · natürlich","3 · stark"]} defaultValue="2"/><SliderSelect name="emojiLevel" label="EMOJIS" options={["0 · keine","1 · sparsam","2 · natürlich","3 · viel"]} defaultValue="2"/></div>
        <div className="grid md:grid-cols-2 gap-4"><Field label="ANZAHL"><select name="count" defaultValue="20" className="control">{[5,10,20,30,50].map((n)=><option key={n} value={n}>{n} Items</option>)}</select></Field><Field label="TEXT-MODELL"><select name="model" defaultValue="gemini"><option value="gemini">✨ Gemini · Standard</option><option value="claude">Claude · Alternative</option></select></Field></div>
      </section>

      <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Visual Engine</h2><p className="text-xs text-slate-400 mt-1">FLUX zuerst, Gemini als automatischer Fallback.</p></div><span className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-slate-300">FLUX + GEMINI</span></div>
        <FieldDark label="TEXT ↔ BILD MIX"><MixSlider /></FieldDark>
        <FieldDark label="BILDSTRATEGIE"><select name="imageMode" defaultValue="smart" className="darkControl"><option value="none">Nur Text</option><option value="some">Gelegentlich · ca. 1/3</option><option value="smart">Smart · bevorzugt passende Posts</option><option value="all">Alle Posts mit Bild</option></select></FieldDark>
        <FieldDark label="VISUAL STYLE"><select name="imageStyle" defaultValue="authentic social photo" className="darkControl"><option value="authentic social photo">Authentisches Social-Foto</option><option value="phone snapshot">Handy-Schnappschuss</option><option value="messy bedroom snapshot">Unperfekter Alltagsmoment</option><option value="cinematic casual photo">Cinematic, aber beiläufig</option><option value="illustrated social post">Illustration / digital art</option><option value="meme visual">Meme-Visual ohne Text</option></select></FieldDark>
        <FieldDark label="FORMAT"><select name="aspectRatio" defaultValue="4:5" className="darkControl"><option value="4:5">4:5 · Feed Portrait</option><option value="1:1">1:1 · Square</option><option value="9:16">9:16 · Story</option><option value="16:9">16:9 · Wide</option></select></FieldDark>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="flex items-center gap-2 text-sm font-medium"><Zap className="w-4 h-4 text-yellow-300"/> Language & Authenticity Engine</div><div className="text-xs text-slate-400 leading-5">Die Sprachbibliothek berücksichtigt Alter, Kontext, Interessen, Social-Media-Einflüsse, Ironie, Abkürzungen, Anglizismen, Fragmente und die Schnelllebigkeit aktueller Trends. Trendwörter sind Signale – kein Pflichtvokabular.</div></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-xs uppercase tracking-wider text-slate-500 mb-2">PROFILE IM SYSTEM</div><div className="space-y-1 text-xs text-slate-400">{(profiles ?? []).map((profile)=><div key={profile.key} className="flex justify-between"><span>{profile.label}</span><span>{profile.image_probability}% img</span></div>)}</div></div>
        <button type="submit" className="w-full rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-3 font-semibold text-sm flex items-center justify-center gap-2"><Sparkles className="w-4 h-4"/> Ambient Feed generieren</button><p className="text-[11px] text-slate-500 text-center">Alle Ergebnisse werden als DRAFT gespeichert. Nichts wird automatisch veröffentlicht.</p>
      </section>
    </form>

    <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-slate-500"/><h2 className="font-semibold text-sm text-slate-900">Content-Übersicht</h2>{activeFilterCount > 0 && <span className="text-[10px] rounded-full bg-accent/10 text-accent px-2 py-1 font-semibold">{activeFilterCount} Filter</span>}</div><span className="text-xs text-slate-400">{filteredItems.length} von {allAmbient.length} Ambient-Posts</span></div>
      <form method="get" className="grid lg:grid-cols-4 gap-2">
        <div className="relative lg:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input name="q" defaultValue={q} placeholder="Text durchsuchen …" className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm"/></div>
        <select name="status" defaultValue={statusFilter} className="control"><option value="all">Alle Status</option>{STATUS_ORDER.map((s)=><option key={s} value={s}>{statusLabel[s]}</option>)}</select>
        <select name="media" defaultValue={mediaFilter} className="control"><option value="all">Text + Bild</option><option value="image">Nur mit Bild</option><option value="text">Nur Text</option></select>
        <select name="provider" defaultValue={providerFilter} className="control"><option value="all">Alle Bildquellen</option><option value="cloudflare">FLUX / Cloudflare</option><option value="gemini">Gemini-Fallback</option><option value="none">Ohne Bild</option></select>
        <select name="age" defaultValue={ageFilter} className="control"><option value="">Alle Altersgruppen</option>{ageOptions.map((value)=><option key={value} value={value}>{value}</option>)}</select>
        <select name="grade" defaultValue={gradeFilter} className="control"><option value="">Alle Jahrgänge</option>{gradeOptions.map((value)=><option key={value} value={value}>Klasse {value}</option>)}</select>
        <select name="mission" defaultValue={missionFilter} className="control"><option value="">Alle Missionen</option>{missionOptions.map((mission)=><option key={mission.id} value={mission.id}>{mission.title}</option>)}</select>
        <select name="arc" defaultValue={arcFilter} className="control"><option value="">Alle Story-Arcs</option>{arcOptions.map((arc)=><option key={arc.id} value={arc.id}>{arc.title}</option>)}</select>
        <button type="submit" className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium lg:col-span-4">Filtern</button>
      </form>
      <div className="flex flex-wrap gap-2 text-xs"><a href={filterHref("status", "all")} className={`rounded-full px-3 py-1.5 border ${statusFilter === "all" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"}`}>Alle</a>{STATUS_ORDER.map((status)=><a key={status} href={filterHref("status", status)} className={`rounded-full px-3 py-1.5 border ${statusFilter === status ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"}`}>{statusLabel[status]}</a>)}</div>
    </section>

    <section className="grid xl:grid-cols-2 gap-5">{grouped.length === 0 ? <div className="xl:col-span-2 bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center"><div className="text-sm font-medium text-slate-700">Keine passenden Ambient-Posts</div><div className="text-xs text-slate-400 mt-1">Filter anpassen oder neue Ambient-Items erzeugen.</div></div> : grouped.map((group)=><div key={group.status} className="space-y-2"><div className="flex items-center justify-between px-1"><h2 className="text-xs font-semibold tracking-widest text-slate-500">{statusLabel[group.status]} · {group.items.length}</h2></div><ul className="space-y-2">{group.items.map((item)=><li key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">{item.media_url&&<img src={item.media_url} alt="" className="w-full max-h-80 object-cover"/>}<div className="p-4 space-y-3"><p className="text-sm leading-6 text-slate-900">{item.body}</p>{item.extra?.generatedBy === "ai"&&<div className="flex flex-wrap gap-1.5 text-[10px] text-slate-500"><Tag>{item.extra?.ageBand}</Tag><Tag>{item.extra?.styleLabel}</Tag>{item.extra?.format&&<Tag>{item.extra.format}</Tag>}{item.extra?.topic&&<Tag>{item.extra.topic}</Tag>}{item.extra?.imageGenerated&&<Tag>🖼 {item.extra?.imageProvider === "cloudflare" ? "FLUX" : "Gemini"}</Tag>}{(missionByContent.get(item.id) ?? []).map((mission)=><Tag key={mission.id}>🎯 {mission.title}</Tag>)}{Array.from(new Set((missionByContent.get(item.id) ?? []).flatMap((mission)=>arcByMission.get(mission.id) ?? []).map((arc)=>arc.title))).map((title)=><Tag key={title}>📖 {title}</Tag>)}{Array.from(new Set((missionByContent.get(item.id) ?? []).flatMap((mission)=>mission.scenarioId ? (classesByScenario.get(mission.scenarioId) ?? []).map((entry)=>entry.name) : []))).map((name)=><Tag key={name}>🏫 {name}</Tag>)}</div>}<div className="flex items-center justify-between gap-2"><ContentStatusControl contentItemId={item.id} status={item.status}/>{item.status!=="archived"&&<form action={archiveAmbientContent.bind(null,item.id)}><button type="submit" className="text-xs text-slate-400 hover:text-slate-700">Archivieren</button></form>}</div></div></li>)}</ul></div>)}</section>
  </div><style>{`.control{width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:13px;background:white;color:#0f172a}.darkControl{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;font-size:13px;background:rgba(255,255,255,.06);color:white}`}</style></div>;
}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block"><span className="block text-[10px] font-semibold tracking-wider text-slate-500 mb-1.5">{label}</span>{children}</label>}
function FieldDark({label,children}:{label:string;children:ReactNode}){return <label className="block"><span className="block text-[10px] font-semibold tracking-wider text-slate-500 mb-1.5">{label}</span>{children}</label>}
function SliderSelect({name,label,options,defaultValue="1"}:{name:string;label:string;options:string[];defaultValue?:string}){return <Field label={label}><select name={name} defaultValue={defaultValue} className="control">{options.map((option,index)=><option key={option} value={index}>{option}</option>)}</select></Field>}
function MixSlider(){return <div className="space-y-2"><div className="flex justify-between text-xs text-slate-400"><span>100% Text</span><span>100% Bild</span></div><input aria-label="Bildanteil" name="imageRatio" type="range" min="0" max="100" defaultValue="35" className="w-full accent-white"/><div className="flex justify-between text-[11px] font-medium text-slate-300"><span>Text</span><span>Mix</span><span>Bild</span></div><p className="text-[11px] text-slate-500">Der Regler legt fest, wie viele der erzeugten Posts ein Visual bekommen. Die KI priorisiert dabei Posts, für die ein Bild natürlich passt.</p></div>}
function Tag({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-2 py-1">{children}</span>}
function Stat({label,value}:{label:string;value:number}){return <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 min-w-20"><div className="text-[9px] font-semibold tracking-wider text-slate-400">{label}</div><div className="text-xl font-semibold text-slate-900 mt-1">{value}</div></div>}
