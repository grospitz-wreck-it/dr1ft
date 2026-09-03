"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const NPC_SCHEMA = { type: "object", properties: { displayName: { type: "string" }, handle: { type: "string" }, age: { type: "integer" }, persona: { type: "object" }, voice: { type: "object" }, interests: { type: "array", items: { type: "string" } }, firstImpression: { type: "string" } }, required: ["displayName", "handle", "age", "persona", "voice", "interests", "firstImpression"] };
const POST_SCHEMA = { type: "array", items: { type: "object", properties: { body: { type: "string" }, mood: { type: "string" }, topic: { type: "string" }, format: { type: "string" } }, required: ["body", "mood", "topic", "format"] } };
const REACTION_SCHEMA = { type: "object", properties: { action: { type: "string", enum: ["like", "comment", "ignore"] }, comment: { type: "string" }, reason: { type: "string" } }, required: ["action", "comment", "reason"] };
const ACTOR_TYPES = ["person", "creator", "news_outlet", "brand", "company", "organization", "community", "bot"] as const;
type ActorType = (typeof ACTOR_TYPES)[number];

async function gemini(apiKey: string, prompt: string, schema: object) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ model: "gemini-3.7-flash", input: prompt, response_format: { type: "text", mime_type: "application/json", schema } }) });
  if (!response.ok) throw new Error(`Gemini API Fehler: ${await response.text()}`);

  const data = await response.json();
  const raw = (
    data.output_text ??
    data.output?.find?.((part: any) => part.type === "text")?.text ??
    data.steps?.slice?.().reverse?.().find?.((step: any) => step.type === "model_output")?.content?.find?.((part: any) => part.type === "text")?.text ??
    ""
  ).trim();

  if (!raw) {
    throw new Error(`Gemini hat keine Textausgabe geliefert (Status: ${data.status ?? "unbekannt"}).`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Gemini hat kein gültiges JSON geliefert: ${raw.slice(0, 500)}`);
  }
}
function requireKey() { const key = process.env.GEMINI_API_KEY; if (!key) throw new Error("GEMINI_API_KEY ist nicht gesetzt."); return key; }
function cleanHandle(value: string) { const base = value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || "actor"; return `${base}_${crypto.randomUUID().slice(0, 6)}`; }

export async function generateNpcProfile(formData: FormData) {
  const supabase = supabaseServerClient();
  const actorType = String(formData.get("actorType") ?? "person") as ActorType;
  if (!ACTOR_TYPES.includes(actorType)) throw new Error("Ungültiger Akteur-Typ.");
  const interestKeys = String(formData.get("interestKeys") ?? "").split(",").map(v => v.trim()).filter(Boolean).slice(0, 3);
  const moduleIds = formData.getAll("moduleIds").map(v => String(v).trim()).filter(Boolean).slice(0, 20);
  const keywords = String(formData.get("keywords") ?? "").split(",").map(v => v.trim()).filter(Boolean).slice(0, 12);
  const context = String(formData.get("context") ?? "").trim().slice(0, 3000);
  if (interestKeys.length !== 3) throw new Error("Bitte genau 3 Interessen auswählen.");
  if (!keywords.length) throw new Error("Mindestens ein Stichwort fehlt.");
  if (!moduleIds.length) throw new Error("Bitte mindestens ein Modul auswählen.");

  const [{ data: catalog, error: catalogError }, { data: modules, error: moduleError }] = await Promise.all([
    supabase.from("ambient_interests").select("key, label, category").in("key", interestKeys),
    supabase.from("scenarios").select("id, title").in("id", moduleIds),
  ]);
  if (catalogError) throw new Error(catalogError.message); if (moduleError) throw new Error(moduleError.message);
  if ((catalog ?? []).length !== 3) throw new Error("Mindestens ein ausgewähltes Interesse ist nicht mehr verfügbar.");
  if ((modules ?? []).length !== moduleIds.length) throw new Error("Mindestens ein ausgewähltes Modul ist nicht verfügbar.");
  const selectedInterests = interestKeys.map(key => catalog?.find(i => i.key === key)).filter(Boolean) as { key: string; label: string; category: string }[];
  const selectedModules = moduleIds.map(id => modules?.find(m => m.id === id)).filter(Boolean) as { id: string; title: string }[];

  const key = requireKey();
  const result = await gemini(key, `Du bist die Akteur-Engine von DR1FT. Erzeuge einen glaubwürdigen fiktionalen Akteur für eine schulische Social-Media-Simulation.

AKTEUR-TYP: ${actorType}
STICHWORTE: ${keywords.join(", ")}
AUSGEWÄHLTE INTERESSEN: ${selectedInterests.map(i => `${i.label} [${i.key}]`).join(", ")}
MODULE: ${selectedModules.map(m => m.title).join(", ")}
KONTEXT: ${context || "Digitaler Schulalltag und Feed"}

WICHTIG:
- Der Akteur-Typ ist eine Weltrolle, keine Glaubwürdigkeitswertung.
- Die drei ausgewählten Interessen sind kanonisch und prägen Persona, Themen und Verhalten.
- Bei News-Outlets, Marken, Organisationen, Communities und Bots keine künstliche Teenager-Persona erzwingen; entwickle passende redaktionelle, kommerzielle oder soziale Eigenschaften.
- Keine reale Person, Marke oder Organisation nachahmen; Namen und Identitäten sind vollständig fiktional.
- Keine sexualisierten, medizinischen oder gefährlichen Inhalte.
- Der Akteur darf Widersprüche, Ziele, Grenzen und veränderbare Zustände besitzen.
- Gib bei interests die drei ausgewählten Interessen als Bezeichnungen wieder.
- Gib nur valides JSON zurück.`, NPC_SCHEMA);

  const { data: npc, error } = await supabase.from("npc_profiles").insert({ display_name: result.displayName, handle: cleanHandle(result.handle), age: actorType === "person" || actorType === "creator" ? Math.min(18, Math.max(12, Number(result.age) || 14)) : null, actor_type: actorType, keywords, context, persona: result.persona ?? {}, voice: result.voice ?? {}, interests: selectedInterests.map(i => i.label), interest_keys: interestKeys }).select("*").single();
  if (error) throw new Error(error.message);
  const { error: assignmentError } = await supabase.from("npc_module_assignments").insert(selectedModules.map(module => ({ npc_id: npc.id, scenario_id: module.id })));
  if (assignmentError) throw new Error(assignmentError.message);
  await supabase.from("npc_generation_runs").insert({ class_instance_id: null, npc_id: npc.id, generation_type: "profile", keywords, context, provider: "gemini", model: "gemini-3.7-flash", status: "draft", output: { ...result, actorType, selectedInterestKeys: interestKeys, selectedModuleIds: moduleIds } });
  revalidatePath("/npc-generator"); return npc.id;
}

export async function generateNpcPosts(formData: FormData) {
  const supabase = supabaseServerClient(); const npcId = String(formData.get("npcId") ?? ""); const classInstanceId = String(formData.get("classInstanceId") ?? ""); const count = Math.min(10, Math.max(1, Number(formData.get("count") ?? 3)));
  if (!npcId || !classInstanceId) throw new Error("Akteur und classInstanceId sind erforderlich.");
  const { data: runtime } = await supabase.from("npc_instance_profiles").select("*, npc:npc_profiles(*)").eq("npc_id", npcId).eq("class_instance_id", classInstanceId).maybeSingle(); if (!runtime?.npc) throw new Error("Für diesen Akteur existiert in der Instanz noch kein Runtime-Profil.");
  const { data: memories } = await supabase.from("npc_memory").select("memory_type, content, salience").eq("npc_instance_id", runtime.id).order("created_at", { ascending: false }).limit(12); const key = requireKey(); const npc = runtime.npc;
  const result = await gemini(key, `Du schreibst Posts für einen fiktionalen Akteur in DR1FT. TYP: ${npc.actor_type}\nNAME: ${npc.display_name}\nALTER: ${npc.age ?? "nicht zutreffend"}\nSTICHWORTE: ${(npc.keywords ?? []).join(", ")}\nINTERESSEN: ${(npc.interests ?? []).join(", ")}\nINTERESSEN-SCHLÜSSEL: ${(npc.interest_keys ?? []).join(", ")}\nPERSONA: ${JSON.stringify(npc.persona)}\nSTIMME: ${JSON.stringify(npc.voice)}\nKONTEXT: ${npc.context}\nAKTUELLER ZUSTAND: ${JSON.stringify(runtime.current_state)}\nERINNERUNGEN: ${JSON.stringify(memories ?? [])}\n\nErzeuge ${count} unterschiedliche, plausible Posts dieses Akteurs. Kein Erklärtext.`, POST_SCHEMA);
  if (!Array.isArray(result)) throw new Error("Gemini hat keine Posts geliefert."); const rows = result.slice(0, count).filter((p:any) => typeof p?.body === "string" && p.body.trim()).map((p:any) => ({ type:"post", scenario_id:null, creator_id:null, class_instance_id:classInstanceId, body:p.body.trim().slice(0,1000), status:"draft", manipulation_techniques:[], target_competencies:[], difficulty:1, age_rating:"12_plus", extra:{ npcId, generatedBy:"npc-generator", generatorVersion:"actor-v1", mood:p.mood, topic:p.topic, format:p.format } }));
  if (!rows.length) throw new Error("Keine gültigen NPC-Posts."); const { error } = await supabase.from("content_items").insert(rows); if (error) throw new Error(error.message);
  await supabase.from("npc_instance_profiles").update({ last_generation_at:new Date().toISOString(), activity_state:{...(runtime.activity_state??{}),posts:Number(runtime.activity_state?.posts??0)+rows.length},updated_at:new Date().toISOString() }).eq("id",runtime.id);
  await supabase.from("npc_generation_runs").insert({class_instance_id:classInstanceId,npc_id:npcId,generation_type:"posts",keywords:npc.keywords??[],context:npc.context??"",provider:"gemini",model:"gemini-3.7-flash",status:"draft",output:result}); revalidatePath("/npc-generator");
}

export async function generateNpcReaction(formData: FormData) {
  const supabase=supabaseServerClient(); const npcId=String(formData.get("npcId")??""); const classInstanceId=String(formData.get("classInstanceId")??""); const contentItemId=String(formData.get("contentItemId")??""); if(!npcId||!classInstanceId||!contentItemId) throw new Error("Akteur, Instanz und Beitrag sind erforderlich.");
  const {data:runtime}=await supabase.from("npc_instance_profiles").select("*, npc:npc_profiles(*)").eq("npc_id",npcId).eq("class_instance_id",classInstanceId).maybeSingle(); const {data:post}=await supabase.from("content_items").select("id, body, extra, class_instance_id").eq("id",contentItemId).eq("class_instance_id",classInstanceId).maybeSingle(); if(!runtime?.npc||!post) throw new Error("Akteur oder Beitrag nicht in dieser Instanz gefunden.");
  const {data:memories}=await supabase.from("npc_memory").select("memory_type, content, salience").eq("npc_instance_id",runtime.id).order("created_at",{ascending:false}).limit(10); const key=requireKey(); const npc=runtime.npc; const result=await gemini(key,`Entscheide, wie dieser Akteur auf einen Social-Media-Beitrag reagieren würde. TYP: ${npc.actor_type}\nAKTEUR: ${npc.display_name}\nINTERESSEN: ${(npc.interests??[]).join(", ")}\nINTERESSEN-SCHLÜSSEL: ${(npc.interest_keys??[]).join(", ")}\nPERSONA: ${JSON.stringify(npc.persona)}\nSTIMME: ${JSON.stringify(npc.voice)}\nZUSTAND: ${JSON.stringify(runtime.current_state)}\nERINNERUNGEN: ${JSON.stringify(memories??[])}\nBEITRAG: ${post.body}\n\nNicht jeder Beitrag bekommt eine Reaktion.`,REACTION_SCHEMA); if(result.action==="ignore") return;
  const {error:interactionError}=await supabase.from("npc_social_interactions").insert({npc_instance_id:runtime.id,class_instance_id:classInstanceId,content_item_id:contentItemId,interaction_type:result.action,body:result.action==="comment"?String(result.comment??"").trim().slice(0,500):null,metadata:{reason:result.reason,generatedBy:"gemini"}}); if(interactionError) throw new Error(interactionError.message);
  await supabase.from("npc_memory").insert({npc_instance_id:runtime.id,memory_type:result.action==="comment"?"social_response":"social_reaction",subject_id:contentItemId,content:result.action==="comment"?String(result.comment??""):"Akteur mochte einen Beitrag.",salience:0.45,metadata:{reason:result.reason}}); await supabase.from("npc_instance_profiles").update({activity_state:{...(runtime.activity_state??{}),likes:Number(runtime.activity_state?.likes??0)+(result.action==="like"?1:0),comments:Number(runtime.activity_state?.comments??0)+(result.action==="comment"?1:0)},updated_at:new Date().toISOString()}).eq("id",runtime.id); revalidatePath("/npc-generator");
}
