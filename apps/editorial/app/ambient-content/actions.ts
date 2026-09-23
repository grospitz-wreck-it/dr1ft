// apps/editorial/app/ambient-content/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

const AGE_BANDS: Record<string, string> = {
  "12_13": "12–13 Jahre",
  "14_15": "14–15 Jahre",
  "16_17": "16–17 Jahre",
  "18_plus": "18+ Jahre",
  all: "altersneutral",
};

const STYLE_LABELS: Record<string, string> = {
  casual: "locker & natürlich",
  chatty: "chatty / Messenger",
  meme: "meme-native / Internet",
  deadpan: "trocken / deadpan",
  wholesome: "warm / wholesome",
  chaotic: "chaotisch / impulsiv",
  observational: "beobachtend",
  storyteller: "Mini-Story",
  minimal: "minimalistisch",
  mixed: "bewusst gemischt",
  neutral: "neutral",
};

const SYSTEM_PROMPT = `Du bist die Ambient-Content-Engine von DR1FT.

Deine Aufgabe ist NICHT, Lerninhalte oder manipulative Szenarien zu erzeugen.
Du erzeugst glaubwürdiges, alltägliches Social-Feed-Füllmaterial, das zwischen
Szenario-Content auftaucht und einen echten, vielfältigen Feed simuliert.

WICHTIG:
- Ambient-Content darf über Musik, Gaming, Serien, Sport, Essen, Schule,
  Freunde, Memes, Mode, Tiere, Technik, Freizeit, lokale Erlebnisse und andere
  harmlose Alltagsthemen sprechen.
- Reale Marken, Apps oder Produkte dürfen als beiläufige Alltagserwähnung
  vorkommen, aber niemals als Werbung, Testimonial oder gezielte Kaufaufforderung.
- Keine politischen Überzeugungsversuche, keine gezielte Manipulation,
  keine Radikalisierung, keine medizinischen/sexuellen Inhalte für Minderjährige.
- Keine künstlich perfekte Sprache. Menschen schreiben unterschiedlich.
- Tippfehler, fehlende Großschreibung, verkürzte Wörter, Satzfragmente,
  Chat-Sprache, Emojis und Jugendsprache sind erlaubt, aber müssen zur
  gewählten Altersgruppe und Stimme passen.
- Tippfehler niemals in jedem Post. Variation ist wichtiger als ein fester
  Fehlerquotient.
- Jugendsprache nicht übertreiben und nicht wie ein Erwachsener klingen,
  der Teenager nachahmt. Lieber wenige glaubwürdige Signale als eine Liste
  von Slang-Wörtern.
- Nicht jeder Post braucht einen Witz. Ein echter Feed braucht langweilige,
  lustige, persönliche, nebensächliche und spontane Momente.
- Keine wiederholten Satzanfänge, keine immer gleiche Länge, keine immer
  gleichen Emojis.
- Posts dürfen auch banal sein: "bin zu spät aufgestanden", "hat jemand den
  Taschenrechner gesehen", "dieser Song hängt seit heute morgen im Kopf".
- Erzeuge unterschiedliche Mikroformate: Status, Beobachtung, Frage,
  Mini-Story, Caption, kurzer Reply, Poll-Idee, Reaktion, Alltagsmoment.

Gib ausschließlich valides JSON zurück. Kein Markdown.`;

function int(formData: FormData, key: string, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(formData.get(key) ?? fallback) || fallback));
}

function str(formData: FormData, key: string, fallback: string) {
  return String(formData.get(key) ?? fallback).trim();
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function choose<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function generateImage(prompt: string, aspectRatio: string, itemIndex: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "gemini-3.1-flash-image",
      input: prompt,
      response_format: {
        type: "image",
        aspect_ratio: aspectRatio,
        image_size: "1K",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini Bildgenerierung fehlgeschlagen: ${text}`);
  }

  const data = await response.json();
  const image = data.output_image ?? data.output?.find?.((part: any) => part.type === "image")?.image;
  const base64 = image?.data ?? image?.base64;
  const mimeType = image?.mime_type ?? image?.mimeType ?? "image/png";

  if (!base64) return null;

  const buffer = Buffer.from(base64, "base64");
  const supabase = supabaseServerClient();
  const path = `generated/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${itemIndex}.png`;

  const { error } = await supabase.storage
    .from("ambient-assets")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Ambient-Bild konnte nicht gespeichert werden: ${error.message}`);

  const { data: publicData } = supabase.storage.from("ambient-assets").getPublicUrl(path);
  return publicData.publicUrl;
}

/**
 * Crazy Ambient Studio:
 * - Alter/Audience
 * - Interessen
 * - Schreibstimme
 * - Slang / Tippfehler / Emojis / Satzrhythmus
 * - Content-Mix
 * - zeitlicher Kontext
 * - optionale Gemini-Bilder
 * - alles bleibt IMMER draft
 */
export async function generateAmbientDrafts(formData: FormData) {
  const supabase = supabaseServerClient();

  const theme = str(formData, "theme", "Alltag");
  const ageBand = str(formData, "ageBand", "14_15");
  const style = str(formData, "style", "mixed");
  const model = str(formData, "model", "claude");
  const count = int(formData, "count", 10, 1, 50);
  const typoLevel = int(formData, "typoLevel", 1, 0, 3);
  const slangLevel = int(formData, "slangLevel", 2, 0, 3);
  const emojiLevel = int(formData, "emojiLevel", 2, 0, 3);
  const imageMode = str(formData, "imageMode", "smart");
  const imageStyle = str(formData, "imageStyle", "authentic social photo");
  const aspectRatio = str(formData, "aspectRatio", "4:5");
  const creatorId = String(formData.get("creatorId") ?? "") || null;
  const interests = String(formData.get("interests") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 3);

  const creatorVoice = creatorId
    ? (await supabase.from("creators").select("display_name, persona").eq("id", creatorId).maybeSingle()).data
    : null;

  const profile = (await supabase
    .from("ambient_generation_profiles")
    .select("*")
    .eq("age_band", ageBand)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()).data;

  const provider = model === "gemini" ? "gemini" : "claude";
  const apiKey = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      `${provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"} ist nicht gesetzt. Server-Umgebungsvariable verwenden, niemals NEXT_PUBLIC_*.`
    );
  }

  const styleText = STYLE_LABELS[style] ?? style;
  const ageText = AGE_BANDS[ageBand] ?? ageBand;
  const dateText = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
    timeZone: "Europe/Berlin",
  }).format(new Date());

  const requestedCount = count;
  const contentMix = [
    "30% kurze Status-Posts",
    "15% Fragen",
    "15% Mini-Storys",
    "10% Beobachtungen",
    "10% Reaktionen/Replies",
    "10% Caption-artige Posts",
    "10% absurde oder unerwartete Alltagsmomente",
  ].join(", ");

  const userPrompt = `${SYSTEM_PROMPT}

GENERATION PROFILE
- Zielgruppe: ${ageText}
- Thema: ${theme}
- Interessen: ${interests.length ? interests.join(", ") : "frei wählen"}
- Schreibstil: ${styleText}
- Tippfehler-Level: ${typoLevel}/3
- Jugendsprache-Level: ${slangLevel}/3
- Emoji-Level: ${emojiLevel}/3
- Post-Mix: ${contentMix}
- Heute ist: ${dateText}
- Creator-Stimme: ${creatorVoice?.data?.display_name ?? creatorVoice?.display_name ?? "wechselnde Ambient-Accounts"}
- Creator-Persona: ${JSON.stringify(creatorVoice?.persona ?? {})}
- Profilhinweise: ${JSON.stringify(profile?.prompt_rules ?? {})}

AUTHENTIZITÄT
Verteile bewusst unterschiedliche Längen. Einige Posts dürfen nur 3–8 Wörter
haben, andere 1–3 Sätze. Verwende gelegentlich lowercase, fehlende Kommata,
Doppelpunkte, "lol", "kp", "safe", "digga", "bro", "😭", "💀" oder ähnliche
Signale NUR wenn sie zur Altersgruppe und Stimme passen. Keine Slang-Parade.
Tippfehler nur bei einem Teil der Posts und eher kleine echte Vertipper.
Nicht jeden Post mit Emoji beenden.

Erzeuge ${requestedCount} Items. Jedes Objekt muss exakt diese Felder haben:
{
  "body": string,
  "format": "status" | "question" | "story" | "observation" | "reply" | "caption" | "poll_idea" | "moment",
  "mood": string,
  "topic": string,
  "creatorVibe": string,
  "needsImage": boolean,
  "imagePrompt": string
}

`;

  let items: Array<{
    body: string;
    format: string;
    mood: string;
    topic: string;
    creatorVibe: string;
    needsImage: boolean;
    imagePrompt: string;
  }> = [];

  if (provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: Math.min(12000, 900 * requestedCount),
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!response.ok) throw new Error(`Anthropic API Fehler: ${await response.text()}`);
    const data = await response.json();
    const text = data.content?.[0]?.text ?? "[]";
    items = JSON.parse(text.trim());
  } else {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        input: userPrompt,
        response_format: { type: "json" },
      }),
    });
    if (!response.ok) throw new Error(`Gemini API Fehler: ${await response.text()}`);
    const data = await response.json();
    const text = data.output_text ?? data.output?.find?.((part: any) => part.type === "text")?.text ?? "[]";
    items = JSON.parse(text.trim());
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Keine Ambient-Items generiert.");
  }

  const rows = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item?.body || typeof item.body !== "string") continue;

    const shouldImage =
      imageMode === "all" ||
      (imageMode === "smart" && Boolean(item.needsImage)) ||
      (imageMode === "some" && index % 3 === 0);

    let mediaUrl: string | null = null;
    if (shouldImage && process.env.GEMINI_API_KEY && item.imagePrompt) {
      mediaUrl = await generateImage(
        `Create an authentic, ordinary social-media image for a German ${ageText} ambient feed. ${imageStyle}. Topic: ${item.topic}. Mood: ${item.mood}. ${item.imagePrompt}. No logos, no readable text, no celebrity likeness, no political messaging, no staged advertising. It should look like something a teenager or young adult might casually post, not like a stock photo.`,
        aspectRatio,
        index,
      );
    }

    rows.push({
      type: "post",
      scenario_id: null,
      creator_id: creatorId,
      body: item.body.trim().slice(0, 1000),
      media_url: mediaUrl,
      media_type: mediaUrl ? "image" : null,
      manipulation_techniques: [],
      target_competencies: [],
      difficulty: 1,
      age_rating: ageBand === "16_17" || ageBand === "18_plus" ? "16_plus" : ageBand === "all" ? "all_ages" : "12_plus",
      status: "draft",
      extra: {
        generatedBy: "ai",
        generatorVersion: "ambient-studio-v2",
        provider,
        theme,
        ageBand,
        interests,
        style,
        styleLabel: styleText,
        typoLevel,
        slangLevel,
        emojiLevel,
        format: item.format,
        mood: item.mood,
        topic: item.topic,
        creatorVibe: item.creatorVibe,
        imageGenerated: Boolean(mediaUrl),
        imageModel: mediaUrl ? "gemini-3.1-flash-image" : null,
      },
    });
  }

  if (!rows.length) throw new Error("Die KI hat keine gültigen Items geliefert.");

  const { error } = await supabase.from("content_items").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/ambient-content");
}

export async function archiveAmbientContent(contentItemId: string) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("content_items")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", contentItemId)
    .is("scenario_id", null);
  if (error) throw new Error(error.message);
  revalidatePath("/ambient-content");
}
