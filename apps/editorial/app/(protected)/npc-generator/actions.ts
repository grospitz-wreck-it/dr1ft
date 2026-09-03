"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const NPC_SCHEMA = {
  type: "object",
  properties: {
    displayName: { type: "string" },
    handle: { type: "string" },
    age: { type: "integer" },
    persona: { type: "object" },
    voice: { type: "object" },
    interests: { type: "array", items: { type: "string" } },
    firstImpression: { type: "string" },
  },
  required: ["displayName", "handle", "age", "persona", "voice", "interests", "firstImpression"],
};

const POST_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      body: { type: "string" },
      mood: { type: "string" },
      topic: { type: "string" },
      format: { type: "string" },
    },
    required: ["body", "mood", "topic", "format"],
  },
};

const REACTION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["like", "comment", "ignore"] },
    comment: { type: "string" },
    reason: { type: "string" },
  },
  required: ["action", "comment", "reason"],
};

async function gemini(apiKey: string, prompt: string, schema: object) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ model: "gemini-3.7-flash", input: prompt, response_format: { type: "text", mime_type: "application/json", schema } }),
  });
  if (!response.ok) throw new Error(`Gemini API Fehler: ${await response.text()}`);
  const data = await response.json();
  const raw = (data.output_text ?? data.output?.find?.((part: any) => part.type === "text")?.text ?? "").trim();
  return JSON.parse(raw);
}

function requireKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY ist nicht gesetzt.");
  return key;
}

function cleanHandle(value: string) {
  const base = value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || "npc";
  return `${base}_${crypto.randomUUID().slice(0, 6)}`;
}

export async function generateNpcProfile(formData: FormData) {
  const supabase = supabaseServerClient();
  const interestKeys = String(formData.get("interestKeys") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 3);
  const keywords = String(formData.get("keywords") ?? "").split(",").map((v) => v.trim()).filter(Boolean).slice(0, 12);
  const context = String(formData.get("context") ?? "").trim().slice(0, 3000);
  if (interestKeys.length !== 3) throw new Error("Bitte genau 3 Interessen auswählen.");
  if (!keywords.length) throw new Error("Mindestens ein Stichwort fehlt.");

  const { data: catalog, error: catalogError } = await supabase
    .from("ambient_interests")
    .select("key, label, category")
    .in("key", interestKeys);
  if (catalogError) throw new Error(catalogError.message);
  if ((catalog ?? []).length !== 3) throw new Error("Mindestens ein ausgewähltes Interesse ist nicht mehr verfügbar.");
  const selectedInterests = interestKeys.map((key) => catalog?.find((interest) => interest.key === key)).filter(Boolean) as { key: string; label: string; category: string }[];

  const key = requireKey();
  const result = await gemini(key, `Du bist die NPC-Engine von DR1FT. Erzeuge einen glaubwürdigen fiktionalen Jugendlichen für eine schulische Social-Media-Simulation.

STICHWORTE: ${keywords.join(", ")}
AUSGEWÄHLTE INTERESSEN: ${selectedInterests.map((interest) => `${interest.label} [${interest.key}]`).join(", ")}
KONTEXT: ${context || "Schulalltag, Freundeskreis und digitaler Feed"}

WICHTIG:
- Die drei ausgewählten Interessen sind die kanonischen Interessen der Figur. Baue Persönlichkeit und Feed-Verhalten sichtbar darum herum.
- Keine Karikatur und keine stereotype Teenager-Sprache.
- Keine reale Person nachahmen.
- Keine sexualisierten, medizinischen oder gefährlichen Inhalte.
- Die Figur soll Widersprüche, Vorlieben, Unsicherheiten, soziale Bedürfnisse und Grenzen haben.
- Die Persönlichkeit ist eine Ausgangslage, keine feste Schublade. Sie darf sich später durch Erlebnisse verändern.
- Gib bei interests die drei ausgewählten Interessen als Bezeichnungen wieder; die kanonischen Schlüssel werden separat gespeichert.
- Gib nur valides JSON zurück.`, NPC_SCHEMA);

  const { data: npc, error } = await supabase.from("npc_profiles").insert({
    display_name: result.displayName,
    handle: cleanHandle(result.handle),
    age: Math.min(18, Math.max(12, Number(result.age) || 14)),
    keywords,
    context,
    persona: result.persona ?? {},
    voice: result.voice ?? {},
    interests: selectedInterests.map((interest) => interest.label),
    interest_keys: interestKeys,
  }).select("*").single();
  if (error) throw new Error(error.message);

  await supabase.from("npc_generation_runs").insert({
    class_instance_id: null,
    npc_id: npc.id,
    generation_type: "profile",
    keywords,
    context,
    provider: "gemini",
    model: "gemini-3.7-flash",
    status: "draft",
    output: { ...result, selectedInterestKeys: interestKeys },
  });
  revalidatePath("/npc-generator");
  return npc.id;
}

export async function generateNpcPosts(formData: FormData) {
  const supabase = supabaseServerClient();
  const npcId = String(formData.get("npcId") ?? "");
  const classInstanceId = String(formData.get("classInstanceId") ?? "");
  const count = Math.min(10, Math.max(1, Number(formData.get("count") ?? 3)));
  if (!npcId || !classInstanceId) throw new Error("NPC und classInstanceId sind erforderlich.");
  const { data: runtime } = await supabase.from("npc_instance_profiles").select("*, npc:npc_profiles(*)").eq("npc_id", npcId).eq("class_instance_id", classInstanceId).maybeSingle();
  if (!runtime?.npc) throw new Error("NPC ist dieser Instanz nicht zugeordnet.");
  const { data: memories } = await supabase.from("npc_memory").select("memory_type, content, salience").eq("npc_instance_id", runtime.id).order("created_at", { ascending: false }).limit(12);
  const key = requireKey();
  const npc = runtime.npc;
  const result = await gemini(key, `Du schreibst Posts für einen fiktionalen NPC in DR1FT.

NAME: ${npc.display_name}
ALTER: ${npc.age}
STICHWORTE: ${(npc.keywords ?? []).join(", ")}
INTERESSEN: ${(npc.interests ?? []).join(", ")}
INTERESSEN-SCHLÜSSEL: ${(npc.interest_keys ?? []).join(", ")}
PERSONA: ${JSON.stringify(npc.persona)}
STIMME: ${JSON.stringify(npc.voice)}
INSTANZKONTEXT: ${npc.context}
AKTUELLER INNERER ZUSTAND: ${JSON.stringify(runtime.current_state)}
ERINNERUNGEN: ${JSON.stringify(memories ?? [])}

Erzeuge ${count} unterschiedliche Posts, die diese Figur tatsächlich selbst schreiben könnte. Kein Erklärtext. Kein Lehrbuchton. Nicht jeder Post muss relevant, clever oder besonders sein.`, POST_SCHEMA);

  if (!Array.isArray(result)) throw new Error("Gemini hat keine Posts geliefert.");
  const rows = result.slice(0, count).filter((p: any) => typeof p?.body === "string" && p.body.trim()).map((p: any) => ({ type: "post", scenario_id: null, creator_id: null, class_instance_id: classInstanceId, body: p.body.trim().slice(0, 1000), status: "draft", manipulation_techniques: [], target_competencies: [], difficulty: 1, age_rating: "12_plus", extra: { npcId, generatedBy: "npc-generator", generatorVersion: "npc-soul-v1", mood: p.mood, topic: p.topic, format: p.format } }));
  if (!rows.length) throw new Error("Keine gültigen NPC-Posts.");
  const { error } = await supabase.from("content_items").insert(rows);
  if (error) throw new Error(error.message);
  await supabase.from("npc_instance_profiles").update({ last_generation_at: new Date().toISOString(), activity_state: { ...(runtime.activity_state ?? {}), posts: Number(runtime.activity_state?.posts ?? 0) + rows.length }, updated_at: new Date().toISOString() }).eq("id", runtime.id);
  await supabase.from("npc_generation_runs").insert({ class_instance_id: classInstanceId, npc_id: npcId, generation_type: "posts", keywords: npc.keywords ?? [], context: npc.context ?? "", provider: "gemini", model: "gemini-3.7-flash", status: "draft", output: result });
  revalidatePath("/npc-generator");
}

export async function generateNpcReaction(formData: FormData) {
  const supabase = supabaseServerClient();
  const npcId = String(formData.get("npcId") ?? "");
  const classInstanceId = String(formData.get("classInstanceId") ?? "");
  const contentItemId = String(formData.get("contentItemId") ?? "");
  if (!npcId || !classInstanceId || !contentItemId) throw new Error("NPC, Instanz und Beitrag sind erforderlich.");
  const { data: runtime } = await supabase.from("npc_instance_profiles").select("*, npc:npc_profiles(*)").eq("npc_id", npcId).eq("class_instance_id", classInstanceId).maybeSingle();
  const { data: post } = await supabase.from("content_items").select("id, body, extra, class_instance_id").eq("id", contentItemId).eq("class_instance_id", classInstanceId).maybeSingle();
  if (!runtime?.npc || !post) throw new Error("NPC oder Beitrag nicht in dieser Instanz gefunden.");
  const { data: memories } = await supabase.from("npc_memory").select("memory_type, content, salience").eq("npc_instance_id", runtime.id).order("created_at", { ascending: false }).limit(10);
  const key = requireKey();
  const npc = runtime.npc;
  const result = await gemini(key, `Entscheide, wie dieser NPC auf einen Social-Media-Beitrag eines anderen Schülers reagieren würde.
NPC: ${npc.display_name}, ${npc.age} Jahre
KEYWORDS: ${(npc.keywords ?? []).join(", ")}
INTERESSEN: ${(npc.interests ?? []).join(", ")}
INTERESSEN-SCHLÜSSEL: ${(npc.interest_keys ?? []).join(", ")}
PERSONA: ${JSON.stringify(npc.persona)}
STIMME: ${JSON.stringify(npc.voice)}
AKTUELLER ZUSTAND: ${JSON.stringify(runtime.current_state)}
ERINNERUNGEN: ${JSON.stringify(memories ?? [])}
BEITRAG: ${post.body}

Regeln: Nicht jeder Beitrag bekommt eine Reaktion. Ein Like muss plausibel sein. Ein Kommentar muss kurz und natürlich sein und darf nicht wie KI-Feedback klingen. Keine Manipulation im Namen des NPC.`, REACTION_SCHEMA);
  if (result.action === "ignore") return;

  const { error: interactionError } = await supabase.from("npc_social_interactions").insert({ npc_instance_id: runtime.id, class_instance_id: classInstanceId, content_item_id: contentItemId, interaction_type: result.action, body: result.action === "comment" ? String(result.comment ?? "").trim().slice(0, 500) : null, metadata: { reason: result.reason, generatedBy: "gemini" } });
  if (interactionError) throw new Error(interactionError.message);
  await supabase.from("npc_memory").insert({ npc_instance_id: runtime.id, memory_type: result.action === "comment" ? "social_response" : "social_reaction", subject_id: contentItemId, content: result.action === "comment" ? String(result.comment ?? "") : `NPC mochte einen Beitrag.`, salience: 0.45, metadata: { reason: result.reason } });
  await supabase.from("npc_instance_profiles").update({ activity_state: { ...(runtime.activity_state ?? {}), likes: Number(runtime.activity_state?.likes ?? 0) + (result.action === "like" ? 1 : 0), comments: Number(runtime.activity_state?.comments ?? 0) + (result.action === "comment" ? 1 : 0) }, updated_at: new Date().toISOString() }).eq("id", runtime.id);
  revalidatePath("/npc-generator");
}
