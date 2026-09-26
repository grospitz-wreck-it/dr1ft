// apps/editorial/app/npc-dialogs/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";
import type { ReplyOption } from "@dr1ft/shared-types";

const AGE_BANDS = ["9_11", "12_13", "14_15", "16_17", "18_plus"] as const;
const NPC_CATEGORIES = [
  "student",
  "club",
  "party",
  "brand",
  "citizen",
  "influencer",
  "institution",
  "creator",
  "other",
] as const;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function callGeminiJson(prompt: string, schema: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY ist zur Laufzeit nicht verfügbar.");

  const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
  let lastError = "Unbekannter Gemini-Fehler";

  for (const model of models) {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          input: prompt,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema,
          },
        }),
        cache: "no-store",
      },
    );

    if (response.ok) {
      const data = await response.json();
      const raw =
        data.output_text ??
        data.output?.find?.((part: any) => part.type === "text")?.text ??
        data.steps
          ?.filter?.((step: any) => step.type === "model_output")
          ?.flatMap?.((step: any) => step.content ?? [])
          ?.filter?.((part: any) => part.type === "text")
          ?.map?.((part: any) => part.text)
          ?.join?.("") ??
        "";

      try {
        return JSON.parse(String(raw).trim());
      } catch {
        lastError = `Gemini ${model} lieferte kein gültiges JSON.`;
        continue;
      }
    }

    const errorText = await response.text();
    lastError = `Gemini ${model} (${response.status}): ${errorText.slice(0, 400)}`;
    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      /high demand|temporar|overload|capacity|unavailable/i.test(errorText);
    if (!retryable) break;
  }

  throw new Error(`KI-Generierung fehlgeschlagen: ${lastError}`);
}

export async function generateNpcProfiles(formData: FormData) {
  try {
    const category = String(formData.get("category") ?? "citizen");
  const amount = Math.min(12, Math.max(1, Number(formData.get("amount") ?? 6)));
  const brief = String(formData.get("brief") ?? "").trim();
  const requestedAgeBands = formData
    .getAll("ageBands")
    .map(String)
    .filter((value) => AGE_BANDS.includes(value as (typeof AGE_BANDS)[number]));

  if (!NPC_CATEGORIES.includes(category as (typeof NPC_CATEGORIES)[number])) {
    throw new Error("Ungültige NPC-Kategorie.");
  }

  const ageBands = requestedAgeBands.length ? requestedAgeBands : [...AGE_BANDS];

  const schema = {
    type: "object",
    properties: {
      npcs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            displayName: { type: "string" },
            handle: { type: "string" },
            bio: { type: "string" },
            storyRole: { type: "string" },
            interestTags: { type: "array", items: { type: "string" } },
            ageBands: {
              type: "array",
              items: { type: "string", enum: [...AGE_BANDS] },
            },
            persona: {
              type: "object",
              properties: {
                styleNotes: { type: "string" },
                rhetoricPatterns: { type: "array", items: { type: "string" } },
                mannerisms: { type: "array", items: { type: "string" } },
                recurringDetails: { type: "array", items: { type: "string" } },
                worldview: { type: "string" },
                boundaries: { type: "array", items: { type: "string" } },
              },
              required: [
                "styleNotes",
                "rhetoricPatterns",
                "mannerisms",
                "recurringDetails",
                "worldview",
                "boundaries",
              ],
            },
          },
          required: [
            "displayName",
            "handle",
            "bio",
            "storyRole",
            "interestTags",
            "ageBands",
            "persona",
          ],
        },
      },
    },
    required: ["npcs"],
  };

  const prompt = `Du bist die NPC-Redaktion von DR1FT.
Erzeuge ${amount} unterschiedliche, wiederverwendbare NPC-Profile für die Kategorie: ${category}.
ALTERSBÄNDER: ${ageBands.join(", ")}
ZUSATZBRIEF: ${brief || "Kein Zusatzbrief."}

Die NPCs sind dauerhaft gespeicherte Figuren einer simulierten Medienwelt.
Jede Figur braucht eine klar wiedererkennbare, aber kurze Identität:
- Name und stabiler Handle
- kurze Bio
- konkrete Interessen
- eigene sprachliche Eigenheiten
- typische Argumentations- und Reaktionsmuster
- wiederkehrende Details, die in späteren KI-Prompts dieselbe Figur erkennbar halten
- eine knappe Beschreibung ihrer möglichen Story-Funktion

WICHTIG:
- Erzeuge keine Kopie realer Personen.
- Für Parteien, Marken und Institutionen dürfen auch fiktive Accounts entstehen.
- Keine Bewertung oder Einordnung als "gut/schlecht"; unterschiedliche gesellschaftliche Perspektiven sind ausdrücklich erwünscht.
- Story-NPCs dürfen kontroverse oder manipulative Positionen vertreten, aber beschreibe diese als Figurenmerkmale und nicht als Tatsachen.
- Das Profil ist Autorenmaterial. Es wird später als stabile Persona in Prompts verwendet.
- Keine Kompetenz-IDs und keine Datenbank-IDs.
- Gib ausschließlich valides JSON gemäß Schema zurück.`;

  const draft = await callGeminiJson(prompt, schema);
  if (!Array.isArray(draft?.npcs) || !draft.npcs.length) {
    throw new Error("Die KI hat keine NPCs zurückgegeben.");
  }

  const supabase = supabaseServerClient();

  for (const npc of draft.npcs.slice(0, amount)) {
    const rawHandle = slugify(String(npc.handle || npc.displayName || "npc"));
    const handle = `@${rawHandle || "npc"}_${crypto.randomUUID().slice(0, 6)}`;
    const persona = npc.persona ?? {};

    const { error } = await supabase.from("creators").insert({
      kind: "npc",
      display_name: String(npc.displayName || "NPC").trim(),
      handle,
      bio: String(npc.bio || "").trim(),
      story_role: String(npc.storyRole || "").trim(),
      npc_category: category,
      npc_role: "hybrid",
      interest_tags: Array.isArray(npc.interestTags)
        ? npc.interestTags.map(String).filter(Boolean).slice(0, 12)
        : [],
      age_bands: Array.isArray(npc.ageBands)
        ? npc.ageBands
            .map(String)
            .filter((v: string) => AGE_BANDS.includes(v as (typeof AGE_BANDS)[number]))
        : ageBands,
      persona: {
        styleNotes: String(persona.styleNotes || ""),
        rhetoricPatterns: Array.isArray(persona.rhetoricPatterns)
          ? persona.rhetoricPatterns.map(String)
          : [],
        mannerisms: Array.isArray(persona.mannerisms)
          ? persona.mannerisms.map(String)
          : [],
        recurringDetails: Array.isArray(persona.recurringDetails)
          ? persona.recurringDetails.map(String)
          : [],
        worldview: String(persona.worldview || ""),
        boundaries: Array.isArray(persona.boundaries)
          ? persona.boundaries.map(String)
          : [],
      },
      ai_identity: {
        personaVersion: 1,
        stableHandle: handle,
        generatedBy: "npc-studio",
        promptSeed: crypto.randomUUID(),
      },
      is_active: true,
      scenario_id: null,
    });

    if (error) throw new Error(`NPC "${npc.displayName}" konnte nicht angelegt werden: ${error.message}`);
  }

    revalidatePath("/npc-dialogs");
  } catch (error) {
    const message = error instanceof Error ? error.message : "NPC-Generierung fehlgeschlagen.";
    console.error("[npc-generator]", error);
    redirect(`/npc-dialogs?error=${encodeURIComponent(message.slice(0, 900))}`);
  }
}

export async function createNpcProfile(formData: FormData) {
  const supabase = supabaseServerClient();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const handleInput = String(formData.get("handle") ?? "").trim();
  if (!displayName) throw new Error("Name darf nicht leer sein.");

  const handle = handleInput
    ? (handleInput.startsWith("@") ? handleInput : `@${handleInput}`)
    : `@${slugify(displayName)}_${crypto.randomUUID().slice(0, 6)}`;

  const { data, error } = await supabase
    .from("creators")
    .insert({
      kind: "npc",
      display_name: displayName,
      handle,
      bio: String(formData.get("bio") ?? "").trim(),
      npc_category: String(formData.get("category") ?? "citizen"),
      npc_role: String(formData.get("role") ?? "ambient"),
      interest_tags: String(formData.get("interests") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      age_bands: formData.getAll("ageBands").map(String),
      persona: {
        styleNotes: String(formData.get("styleNotes") ?? "").trim(),
        rhetoricPatterns: String(formData.get("rhetoricPatterns") ?? "")
          .split(",").map((v) => v.trim()).filter(Boolean),
        mannerisms: String(formData.get("mannerisms") ?? "")
          .split(",").map((v) => v.trim()).filter(Boolean),
        recurringDetails: String(formData.get("recurringDetails") ?? "")
          .split(",").map((v) => v.trim()).filter(Boolean),
        worldview: String(formData.get("worldview") ?? "").trim(),
        boundaries: [],
      },
      ai_identity: {
        personaVersion: 1,
        stableHandle: handle,
        generatedBy: "manual",
      },
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "NPC konnte nicht angelegt werden.");
  revalidatePath("/npc-dialogs");
  redirect(`/npc-dialogs/${data.id}`);
}

export async function createNpcDialog(formData: FormData) {
  const supabase = supabaseServerClient();
  const creatorId = String(formData.get("creatorId") ?? "");
  const scenarioId = String(formData.get("scenarioId") ?? "") || null;
  const storyArcId = String(formData.get("storyArcId") ?? "") || null;
  const ageBand = String(formData.get("ageBand") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!creatorId || !title || !AGE_BANDS.includes(ageBand as (typeof AGE_BANDS)[number])) {
    throw new Error("NPC, Titel und Altersgruppe sind erforderlich.");
  }

  const { data, error } = await supabase
    .from("npc_dialogs")
    .insert({
      creator_id: creatorId,
      scenario_id: scenarioId,
      story_arc_id: storyArcId,
      age_band: ageBand,
      title,
      description: String(formData.get("description") ?? "").trim(),
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Dialog konnte nicht angelegt werden.");
  revalidatePath(`/npc-dialogs/${creatorId}`);
  redirect(`/npc-dialogs/${creatorId}?dialog=${data.id}`);
}

export async function linkNpcToStory(formData: FormData) {
  const supabase = supabaseServerClient();
  const creatorId = String(formData.get("creatorId") ?? "");
  const scenarioId = String(formData.get("scenarioId") ?? "");
  const storyArcId = String(formData.get("storyArcId") ?? "") || null;
  const ageBand = String(formData.get("ageBand") ?? "");
  if (!creatorId || !scenarioId || !AGE_BANDS.includes(ageBand as (typeof AGE_BANDS)[number])) {
    throw new Error("NPC, Szenario und Altersgruppe sind erforderlich.");
  }

  const { error } = await supabase.from("npc_story_links").upsert(
    {
      creator_id: creatorId,
      scenario_id: scenarioId,
      story_arc_id: storyArcId,
      age_band: ageBand,
      role_label: String(formData.get("roleLabel") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "creator_id,scenario_id,age_band" },
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/npc-dialogs/${creatorId}`);
}

export async function createNpcMessage(
  creatorId: string,
  dialogId: string,
  formData: FormData,
) {
  const supabase = supabaseServerClient();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Nachricht darf nicht leer sein.");

  const { data: dialog } = await supabase
    .from("npc_dialogs")
    .select("id, scenario_id, root_content_item_id")
    .eq("id", dialogId)
    .eq("creator_id", creatorId)
    .single();

  if (!dialog) throw new Error("Dialog nicht gefunden.");

  const { data: created, error } = await supabase
    .from("content_items")
    .insert({
      scenario_id: dialog.scenario_id,
      npc_dialog_id: dialog.id,
      creator_id: creatorId,
      type: "dm_message",
      body,
      extra: {},
      status: "draft",
      age_rating:\n        dialog.age_band === "9_11"\n          ? "all_ages"\n          : dialog.age_band === "16_17" || dialog.age_band === "18_plus"\n            ? "16_plus"\n            : "12_plus",
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Nachricht konnte nicht angelegt werden.");

  if (!dialog.root_content_item_id) {
    await supabase
      .from("npc_dialogs")
      .update({
        root_content_item_id: created.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dialog.id);
  }

  revalidatePath(`/npc-dialogs/${creatorId}`);
}

export async function updateReplyOptions(
  messageId: string,
  creatorId: string,
  options: ReplyOption[],
) {
  const supabase = supabaseServerClient();
  const { data: message } = await supabase
    .from("content_items")
    .select("extra")
    .eq("id", messageId)
    .single();

  const { error } = await supabase
    .from("content_items")
    .update({ extra: { ...(message?.extra ?? {}), replyOptions: options } })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  revalidatePath(`/npc-dialogs/${creatorId}`);
}

export async function setConsequence(
  messageId: string,
  creatorId: string,
  consequenceContentItemId: string,
  delayHours: number,
) {
  const supabase = supabaseServerClient();
  const { data: message } = await supabase
    .from("content_items")
    .select("extra")
    .eq("id", messageId)
    .single();

  const { error } = await supabase
    .from("content_items")
    .update({
      extra: {
        ...(message?.extra ?? {}),
        consequence: { contentItemId: consequenceContentItemId, delayHours },
      },
    })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  revalidatePath(`/npc-dialogs/${creatorId}`);
}
