"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const REACTION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["like", "comment", "ignore"] },
    comment: { type: "string" },
    reason: { type: "string" },
  },
  required: ["action", "comment", "reason"],
};

const POST_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      body: { type: "string" }, mood: { type: "string" }, topic: { type: "string" }, format: { type: "string" },
    },
    required: ["body", "mood", "topic", "format"],
  },
};

async function gemini(prompt: string, schema: object) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY ist nicht gesetzt.");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ model: "gemini-3.7-flash", input: prompt, response_format: { type: "text", mime_type: "application/json", schema } }),
  });
  if (!response.ok) throw new Error(`Gemini API Fehler: ${await response.text()}`);
  const data = await response.json();
  return JSON.parse((data.output_text ?? data.output?.find?.((p: any) => p.type === "text")?.text ?? "").trim());
}

/**
 * Advances one class instance's social world by one small, bounded step.
 * The function is intentionally instance-scoped and keeps NPC activity sparse.
 * It can be called by the editorial UI now and by a scheduler later.
 */
export async function runNpcWorldTick(formData: FormData) {
  const supabase = supabaseServerClient();
  const classInstanceId = String(formData.get("classInstanceId") ?? "").trim();
  if (!classInstanceId) throw new Error("classInstanceId fehlt.");

  const { data: runtimes, error: runtimeError } = await supabase
    .from("npc_instance_profiles")
    .select("id, npc_id, class_instance_id, current_state, activity_state, last_generation_at, npc:npc_profiles(*)")
    .eq("class_instance_id", classInstanceId)
    .limit(24);
  if (runtimeError) throw new Error(runtimeError.message);
  if (!runtimes?.length) return { reactions: 0, posts: 0 };

  const { data: posts } = await supabase
    .from("content_items")
    .select("id, body, creator_id, created_at")
    .eq("class_instance_id", classInstanceId)
    .eq("status", "live")
    .eq("type", "post")
    .not("creator_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(18);

  let reactions = 0;
  let postsCreated = 0;

  // One decision per NPC/tick and a hard global cap keeps the world believable.
  for (const runtime of runtimes.slice(0, 8) as any[]) {
    if (reactions >= 6 || !posts?.length || Math.random() > 0.72) continue;
    const post = posts[Math.floor(Math.random() * posts.length)];
    const { data: existing } = await supabase
      .from("npc_social_interactions")
      .select("id")
      .eq("npc_instance_id", runtime.id)
      .eq("content_item_id", post.id)
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const { data: memories } = await supabase
      .from("npc_memory")
      .select("memory_type, content, salience")
      .eq("npc_instance_id", runtime.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const npc = runtime.npc;
    const result = await gemini(`Du bist ein fiktionaler NPC in DR1FT, einer schulischen Social-Media-Simulation.
NPC: ${npc.display_name}, ${npc.age} Jahre
STICHWORTE: ${(npc.keywords ?? []).join(", ")}
INTERESSEN: ${(npc.interests ?? []).join(", ")}
PERSONA: ${JSON.stringify(npc.persona)}
STIMME: ${JSON.stringify(npc.voice)}
INNERER ZUSTAND: ${JSON.stringify(runtime.current_state)}
ERINNERUNGEN: ${JSON.stringify(memories ?? [])}
BEITRAG: ${post.body}

Entscheide natürlich zwischen like, comment und ignore. Nicht jeder Beitrag bekommt eine Reaktion. Kommentare sind kurz und glaubwürdig. Keine gezielte Manipulation, kein Mobbing, keine Eskalation.`, REACTION_SCHEMA);
    if (!["like", "comment"].includes(result.action)) continue;

    const { error } = await supabase.from("npc_social_interactions").insert({
      npc_instance_id: runtime.id,
      class_instance_id: classInstanceId,
      content_item_id: post.id,
      interaction_type: result.action,
      body: result.action === "comment" ? String(result.comment ?? "").trim().slice(0, 500) : null,
      metadata: { reason: result.reason, generatedBy: "npc-taktgeber-v1" },
    });
    if (error) continue;

    await supabase.from("npc_memory").insert({
      npc_instance_id: runtime.id,
      memory_type: result.action === "comment" ? "social_response" : "social_reaction",
      subject_id: post.id,
      content: result.action === "comment" ? String(result.comment ?? "").trim() : "NPC mochte einen Beitrag.",
      salience: 0.45,
      metadata: { reason: result.reason, actorCreatorId: post.creator_id },
    });
    await supabase.from("npc_instance_profiles").update({
      activity_state: {
        ...(runtime.activity_state ?? {}),
        likes: Number(runtime.activity_state?.likes ?? 0) + (result.action === "like" ? 1 : 0),
        comments: Number(runtime.activity_state?.comments ?? 0) + (result.action === "comment" ? 1 : 0),
      },
      updated_at: new Date().toISOString(),
    }).eq("id", runtime.id);
    reactions++;
  }

  // Occasional original NPC post. Six-hour cooldown is per NPC and per instance.
  const candidates = (runtimes as any[]).filter((r) => !r.last_generation_at || Date.now() - new Date(r.last_generation_at).getTime() > 6 * 60 * 60 * 1000);
  if (candidates.length && Math.random() < 0.45) {
    const runtime = candidates[Math.floor(Math.random() * candidates.length)];
    const npc = runtime.npc;
    const { data: memories } = await supabase.from("npc_memory").select("memory_type, content, salience").eq("npc_instance_id", runtime.id).order("created_at", { ascending: false }).limit(12);
    const { data: recent } = await supabase.from("content_items").select("body, created_at").eq("class_instance_id", classInstanceId).eq("status", "live").order("created_at", { ascending: false }).limit(8);
    const result = await gemini(`Schreibe genau einen kurzen Social-Media-Post für diesen fiktionalen NPC in DR1FT.
NPC: ${npc.display_name}, ${npc.age} Jahre
STICHWORTE: ${(npc.keywords ?? []).join(", ")}
INTERESSEN: ${(npc.interests ?? []).join(", ")}
PERSONA: ${JSON.stringify(npc.persona)}
STIMME: ${JSON.stringify(npc.voice)}
INNERER ZUSTAND: ${JSON.stringify(runtime.current_state)}
ERINNERUNGEN: ${JSON.stringify(memories ?? [])}
LETZTE BEITRÄGE IM FEED: ${JSON.stringify(recent ?? [])}

Der Post wirkt beiläufig und eigenständig. Kein Lehrbuch, keine Erklärung der Simulation.`, POST_SCHEMA);
    const post = Array.isArray(result) ? result[0] : null;
    if (post?.body?.trim()) {
      const { error } = await supabase.from("content_items").insert({
        type: "post", scenario_id: null, creator_id: null, class_instance_id: classInstanceId,
        body: String(post.body).trim().slice(0, 1000), status: "live", manipulation_techniques: [], target_competencies: [], difficulty: 1, age_rating: "12_plus",
        extra: { npcId: runtime.npc_id, generatedBy: "npc-taktgeber", generatorVersion: "npc-soul-v1", mood: post.mood, topic: post.topic, format: post.format },
      });
      if (!error) {
        postsCreated = 1;
        await supabase.from("npc_instance_profiles").update({
          last_generation_at: new Date().toISOString(),
          activity_state: { ...(runtime.activity_state ?? {}), posts: Number(runtime.activity_state?.posts ?? 0) + 1 },
          updated_at: new Date().toISOString(),
        }).eq("id", runtime.id);
        await supabase.from("npc_generation_runs").insert({
          class_instance_id: classInstanceId, npc_id: runtime.npc_id, generation_type: "tick_post", keywords: npc.keywords ?? [], context: npc.context ?? "", provider: "gemini", model: "gemini-3.7-flash", status: "live", output: post,
        });
      }
    }
  }

  revalidatePath("/npc-generator");
  return { reactions, posts: postsCreated };
}
