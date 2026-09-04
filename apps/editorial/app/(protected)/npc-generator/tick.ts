"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const REACTION_SCHEMA = { type: "object", properties: { action: { type: "string", enum: ["like", "comment", "ignore"] }, comment: { type: "string" }, reason: { type: "string" } }, required: ["action", "comment", "reason"] };
const POST_SCHEMA = { type: "array", items: { type: "object", properties: { body: { type: "string" }, mood: { type: "string" }, topic: { type: "string" }, format: { type: "string" } }, required: ["body", "mood", "topic", "format"] } };

async function gemini(prompt: string, schema: object) {
  const key = process.env.GEMINI_API_KEY; if (!key) throw new Error("GEMINI_API_KEY ist nicht gesetzt.");
  async function request(model: string) {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ model, input: prompt, response_format: { type: "text", mime_type: "application/json", schema } }) });
    const body = await response.text(); if (!response.ok) throw new Error(body);
    const data = JSON.parse(body); const raw = (data.output_text ?? data.output?.find?.((p: any) => p.type === "text")?.text ?? data.steps?.slice?.().reverse?.().find?.((s: any) => s.type === "model_output")?.content?.find?.((p: any) => p.type === "text")?.text ?? "").trim();
    if (!raw) throw new Error(`Gemini hat keine Textausgabe geliefert (Status: ${data.status ?? "unbekannt"}).`); return JSON.parse(raw);
  }
  try { return await request("gemini-3.7-flash"); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); if (!/high demand|503|unavailable|temporarily/i.test(message)) throw new Error(`Gemini API Fehler: ${message}`); return await request("gemini-3.6-flash"); }
}

/**
 * A class-instance tick first materializes NPC runtime for actors assigned to
 * one of the instance's modules. From that point on, the runtime is the
 * autonomous behavior layer; the actor profile remains global.
 */
export async function runNpcWorldTick(formData: FormData) {
  const supabase = supabaseServerClient();
  const classInstanceId = String(formData.get("classInstanceId") ?? "").trim();
  if (!classInstanceId) throw new Error("classInstanceId fehlt.");

  const { data: scenarioAssignments, error: scenarioError } = await supabase.from("class_instance_scenario_assignments").select("scenario_id").eq("class_instance_id", classInstanceId);
  if (scenarioError) throw new Error(scenarioError.message);
  const scenarioIds = [...new Set((scenarioAssignments ?? []).map((x: any) => x.scenario_id).filter(Boolean))];
  if (!scenarioIds.length) return { reactions: 0, posts: 0 };

  const { data: actorAssignments, error: actorAssignmentError } = await supabase.from("npc_module_assignments").select("actor_id, npc_id").in("scenario_id", scenarioIds).not("actor_id", "is", null).limit(48);
  if (actorAssignmentError) throw new Error(actorAssignmentError.message);
  const actorIds = [...new Set((actorAssignments ?? []).map((x: any) => x.actor_id).filter(Boolean))];
  if (!actorIds.length) return { reactions: 0, posts: 0 };

  const { data: actors, error: actorError } = await supabase.from("actor_profiles").select("*").in("id", actorIds).eq("is_active", true);
  if (actorError) throw new Error(actorError.message);
  if (!actors?.length) return { reactions: 0, posts: 0 };

  await supabase.from("npc_instance_profiles").upsert(actors.map((actor: any) => ({ npc_id: actor.id, actor_id: actor.id, class_instance_id: classInstanceId })), { onConflict: "npc_id,class_instance_id", ignoreDuplicates: true });

  const { data: runtimes, error: runtimeError } = await supabase.from("npc_instance_profiles").select("id, npc_id, actor_id, class_instance_id, current_state, activity_state, last_generation_at, actor:actor_profiles(*)").eq("class_instance_id", classInstanceId).in("actor_id", actorIds).limit(24);
  if (runtimeError) throw new Error(runtimeError.message);
  if (!runtimes?.length) return { reactions: 0, posts: 0 };

  const { data: feedPosts } = await supabase.from("content_items").select("id, body, actor_id, creator_id, created_at").eq("class_instance_id", classInstanceId).eq("status", "live").eq("type", "post").order("created_at", { ascending: false }).limit(18);
  let reactions = 0; let postsCreated = 0;

  for (const runtime of runtimes.slice(0, 8) as any[]) {
    if (reactions >= 6 || !feedPosts?.length || Math.random() > 0.72) continue;
    const post = feedPosts[Math.floor(Math.random() * feedPosts.length)];
    if (post.actor_id === runtime.actor_id) continue;
    const { data: existing } = await supabase.from("npc_social_interactions").select("id").eq("npc_instance_id", runtime.id).eq("content_item_id", post.id).limit(1).maybeSingle();
    if (existing) continue;
    const { data: memories } = await supabase.from("npc_memory").select("memory_type, content, salience").eq("npc_instance_id", runtime.id).order("created_at", { ascending: false }).limit(10);
    const actor = runtime.actor;
    const result = await gemini(`Du bist ein fiktionaler Akteur in DR1FT. TYP: ${actor.actor_type}\nAKTEUR: ${actor.display_name}\nINTERESSEN: ${(actor.interests ?? []).join(", ")}\nPERSONA: ${JSON.stringify(actor.persona)}\nSTIMME: ${JSON.stringify(actor.voice)}\nZUSTAND: ${JSON.stringify(runtime.current_state)}\nERINNERUNGEN: ${JSON.stringify(memories ?? [])}\nBEITRAG: ${post.body}\n\nEntscheide natürlich zwischen like, comment und ignore. Nicht jeder Beitrag bekommt eine Reaktion. Keine gezielte Manipulation, kein Mobbing, keine Eskalation.`, REACTION_SCHEMA);
    if (!["like", "comment"].includes(result.action)) continue;
    const { error } = await supabase.from("npc_social_interactions").insert({ npc_instance_id: runtime.id, actor_id: actor.id, class_instance_id: classInstanceId, content_item_id: post.id, interaction_type: result.action, body: result.action === "comment" ? String(result.comment ?? "").trim().slice(0, 500) : null, metadata: { reason: result.reason, generatedBy: "actor-taktgeber-v1" } });
    if (error) continue;
    await supabase.from("npc_memory").insert({ npc_instance_id: runtime.id, memory_type: result.action === "comment" ? "social_response" : "social_reaction", subject_id: post.id, content: result.action === "comment" ? String(result.comment ?? "").trim() : "Akteur mochte einen Beitrag.", salience: 0.45, metadata: { reason: result.reason, actorId: post.actor_id } });
    await supabase.from("npc_instance_profiles").update({ activity_state: { ...(runtime.activity_state ?? {}), likes: Number(runtime.activity_state?.likes ?? 0) + (result.action === "like" ? 1 : 0), comments: Number(runtime.activity_state?.comments ?? 0) + (result.action === "comment" ? 1 : 0) }, updated_at: new Date().toISOString() }).eq("id", runtime.id);
    reactions++;
  }

  const candidates = (runtimes as any[]).filter(r => !r.last_generation_at || Date.now() - new Date(r.last_generation_at).getTime() > 6 * 60 * 60 * 1000);
  if (candidates.length && Math.random() < 0.45) {
    const runtime = candidates[Math.floor(Math.random() * candidates.length)]; const actor = runtime.actor;
    const { data: memories } = await supabase.from("npc_memory").select("memory_type, content, salience").eq("npc_instance_id", runtime.id).order("created_at", { ascending: false }).limit(12);
    const { data: recent } = await supabase.from("content_items").select("body, created_at").eq("class_instance_id", classInstanceId).eq("status", "live").order("created_at", { ascending: false }).limit(8);
    const result = await gemini(`Schreibe genau einen kurzen Social-Media-Post für diesen fiktionalen Akteur in DR1FT.\nTYP: ${actor.actor_type}\nAKTEUR: ${actor.display_name}\nSTICHWORTE: ${(actor.keywords ?? []).join(", ")}\nINTERESSEN: ${(actor.interests ?? []).join(", ")}\nPERSONA: ${JSON.stringify(actor.persona)}\nSTIMME: ${JSON.stringify(actor.voice)}\nZUSTAND: ${JSON.stringify(runtime.current_state)}\nERINNERUNGEN: ${JSON.stringify(memories ?? [])}\nLETZTE BEITRÄGE: ${JSON.stringify(recent ?? [])}\n\nDer Post wirkt beiläufig und eigenständig. Kein Lehrbuch, keine Erklärung der Simulation.`, POST_SCHEMA);
    const generated = Array.isArray(result) ? result[0] : null;
    if (generated?.body?.trim()) {
      const { error } = await supabase.from("content_items").insert({ type: "post", scenario_id: null, creator_id: null, actor_id: actor.id, class_instance_id: classInstanceId, body: String(generated.body).trim().slice(0, 1000), status: "live", manipulation_techniques: [], target_competencies: [], difficulty: 1, age_rating: "12_plus", extra: { actorId: actor.id, generatedBy: "actor-taktgeber", generatorVersion: "actor-v2", mood: generated.mood, topic: generated.topic, format: generated.format } });
      if (!error) {
        postsCreated = 1;
        await supabase.from("npc_instance_profiles").update({ last_generation_at: new Date().toISOString(), activity_state: { ...(runtime.activity_state ?? {}), posts: Number(runtime.activity_state?.posts ?? 0) + 1 }, updated_at: new Date().toISOString() }).eq("id", runtime.id);
        await supabase.from("npc_generation_runs").insert({ class_instance_id: classInstanceId, npc_id: actor.id, actor_id: actor.id, generation_type: "tick_post", keywords: actor.keywords ?? [], context: actor.context ?? "", provider: "gemini", model: "gemini-3.7-flash", status: "live", output: generated });
      }
    }
  }

  revalidatePath("/npc-generator");
  return { reactions, posts: postsCreated };
}
