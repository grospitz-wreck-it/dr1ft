"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { buildAmbientLanguagePrompt } from "../../../lib/ambientLanguageLibrary";

const AGE_BANDS: Record<string, string> = { "12_13": "12–13 Jahre", "14_15": "14–15 Jahre", "16_17": "16–17 Jahre", "18_plus": "18+ Jahre", all: "altersneutral" };
const STYLE_LABELS: Record<string, string> = { casual: "locker & natürlich", chatty: "chatty / Messenger", meme: "meme-native / Internet", deadpan: "trocken / deadpan", wholesome: "warm / wholesome", chaotic: "chaotisch / impulsiv", observational: "beobachtend", storyteller: "Mini-Story", minimal: "minimalistisch", mixed: "bewusst gemischt", neutral: "neutral" };

const CORE_PROMPT = `Du bist die Ambient-Content-Engine von DR1FT.
Du erzeugst glaubwürdiges, alltägliches Feed-Material zwischen Szenario-Content.
Der Feed soll sich wie ein echter, vielfältiger sozialer Feed anfühlen – nicht wie eine Sammlung von KI-Beispielen.

SICHERHEIT & ROLLE
- Nur harmlose Alltagsthemen: Musik, Gaming, Serien, Sport, Essen, Schule, Freunde, Memes, Mode, Tiere, Technik, Freizeit, lokale Erlebnisse.
- Keine politische Überzeugungsarbeit, Radikalisierung oder gezielte Manipulation.
- Keine sexuellen oder medizinischen Inhalte für Minderjährige.
- Reale Marken können beiläufig erwähnt werden, niemals als Werbung oder Kaufaufforderung.
- Alles bleibt redaktioneller DRAFT.

FEED-REALISMUS
- Nicht jeder Post ist interessant, witzig oder jugendsprachlich.
- Erzeuge banale, spontane, emotionale, lustige, peinliche, neugierige und nebensächliche Momente.
- Mische 3–8-Wort-Posts, einzelne Sätze und längere Mini-Posts.
- Mische Status, Frage, Beobachtung, Mini-Story, Reply, Caption, Poll-Idee und Moment.
- Vermeide gleiche Satzanfänge, gleiche Emoji-Muster und gleiche Dramaturgie.
- Keine künstliche Pointe am Ende jedes Posts.
- Keine stereotype 'Teenager-Sprache'.

SPRACHE
- Jugendsprache ist ein variables Register, kein festes Wörterbuch.
- Nutze Anglizismen, Abkürzungen, Neologismen, Eindeutschungen, Slang, Füllwörter, fragmentierte Sätze, Übertreibungen, Ironie und Meme-/Gaming-Referenzen nur, wenn Kontext und Stimme sie tragen.
- Tippfehler sind seltene natürliche Vertipper, keine absichtlich schlechte Rechtschreibung.
- Lowercase, fehlende Satzzeichen oder verkürzte Wörter können vorkommen, müssen aber nicht.
- Ein echter Feed enthält auch komplett normale Standardsprache.
- Aktuelle Jugendwörter niemals als Pflichtvokabular verwenden.
- Wenn ein aktueller Begriff keine feste Bedeutung hat, nur als Insider-/Meme-Signal einsetzen, nicht künstlich erklären.
- Lieber 1 passendes Sprachsignal als 5 aufgesetzte Slang-Wörter.

Gib ausschließlich valides JSON zurück. Kein Markdown.`;

function num(fd: FormData, key: string, fallback: number, min: number, max: number) { return Math.min(max, Math.max(min, Number(fd.get(key) ?? fallback) || fallback)); }
function text(fd: FormData, key: string, fallback: string) { return String(fd.get(key) ?? fallback).trim(); }

const AMBIENT_ITEM_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          body: { type: "string" },
          format: { type: "string", enum: ["status", "question", "story", "observation", "reply", "caption", "poll_idea", "moment"] },
          mood: { type: "string" },
          topic: { type: "string" },
          creatorVibe: { type: "string" },
          needsImage: { type: "boolean" },
          imagePrompt: { type: "string" },
          interestKeys: { type: "array", items: { type: "string" } },
        },
        required: ["body", "format", "mood", "topic", "creatorVibe", "needsImage", "imagePrompt", "interestKeys"],
      },
    },
  },
  required: ["items"],
};

async function storeAmbientImage(base64: string, mimeType: string, index: number) {
  const supabase = supabaseServerClient();
  const extension = mimeType.includes("png") ? "png" : "jpg";
  const path = `generated/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${index}.${extension}`;
  const { error } = await supabase.storage.from("ambient-assets").upload(path, Buffer.from(base64, "base64"), { contentType: mimeType, upsert: false });
  if (error) throw new Error(`Ambient-Bild konnte nicht gespeichert werden: ${error.message}`);
  return supabase.storage.from("ambient-assets").getPublicUrl(path).data.publicUrl;
}

async function generateCloudflareImage(prompt: string, aspectRatio: string, index: number) {
  const workerUrl = process.env.CLOUDFLARE_AMBIENT_IMAGE_URL?.trim();
  const apiKey = process.env.CLOUDFLARE_AMBIENT_IMAGE_API_KEY?.trim();
  if (!workerUrl || !apiKey) throw new Error("Cloudflare FLUX ist nicht konfiguriert.");
  const response = await fetch(workerUrl, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify({ prompt, aspectRatio, steps: 4 }), cache: "no-store" });
  if (!response.ok) throw new Error(`Cloudflare FLUX Fehler (${response.status}): ${await response.text()}`);
  const data = await response.json();
  const base64 = typeof data?.image === "string" ? data.image : null;
  if (!base64) throw new Error("Cloudflare FLUX hat kein Bild zurückgegeben.");
  const url = await storeAmbientImage(base64, "image/jpeg", index);
  return { url, provider: "cloudflare", model: "@cf/black-forest-labs/flux-2-klein-4b" };
}

async function generateGeminiImage(prompt: string, aspectRatio: string, index: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY ist nicht gesetzt.");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ model: "gemini-3.1-flash-image", input: prompt, response_format: { type: "image", aspect_ratio: aspectRatio, image_size: "1K" } }) });
  if (!response.ok) throw new Error(`Gemini Bildgenerierung fehlgeschlagen (${response.status}): ${await response.text()}`);
  const data = await response.json();
  const image = data.output_image ?? data.output?.find?.((part: any) => part.type === "image")?.image;
  const base64 = image?.data ?? image?.base64;
  if (!base64) throw new Error("Gemini hat kein Bild zurückgegeben.");
  const mimeType = image?.mime_type ?? "image/png";
  const url = await storeAmbientImage(base64, mimeType, index);
  return { url, provider: "gemini", model: "gemini-3.1-flash-image" };
}

async function generateImage(prompt: string, aspectRatio: string, index: number) {
  let cloudflareError = "";
  try {
    return await generateCloudflareImage(prompt, aspectRatio, index);
  } catch (error) {
    cloudflareError = error instanceof Error ? error.message : "Unbekannter Cloudflare-Fehler";
  }
  try {
    return await generateGeminiImage(prompt, aspectRatio, index);
  } catch (error) {
    const geminiError = error instanceof Error ? error.message : "Unbekannter Gemini-Fehler";
    throw new Error(`Bildgenerierung fehlgeschlagen. FLUX: ${cloudflareError}. Gemini-Fallback: ${geminiError}`);
  }
}

function parseGeneratedItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;

  if (raw && typeof raw === "object") {
    const value = raw as any;
    if (Array.isArray(value.items)) return value.items;
  }

  if (typeof raw !== "string") return [];

  let text = raw.trim();

  text = text
    .replace(/^```(?:json)?\\s*/i, "")
    .replace(/\\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (parsed && Array.isArray(parsed.items)) return parsed.items;
      } catch {}
    }

    const arrayStart = text.indexOf("[");
    const arrayEnd = text.lastIndexOf("]");

    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        const parsed = JSON.parse(text.slice(arrayStart, arrayEnd + 1));
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
  }

  return [];
}

async function generateGeminiText(apiKey: string, prompt: string) {
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
            schema: AMBIENT_ITEM_SCHEMA,
          },
        }),
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

      const items = parseGeneratedItems(raw);

      if (items.length) return items;

      lastError = `Gemini ${model} lieferte kein gültiges Item-Array.`;
      continue;
    }

    const errorText = await response.text();
    lastError = errorText;

    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      /high demand|temporar|overload|capacity|unavailable/i.test(errorText);

    if (!retryable) break;
  }

  throw new Error(`Gemini API Fehler: ${lastError}`);
}

async function generateClaudeText(apiKey: string, prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 12000,
      system: CORE_PROMPT,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API Fehler: ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? "";
  const items = parseGeneratedItems(raw);

  if (!items.length) {
    throw new Error("Claude lieferte kein gültiges Item-Array.");
  }

  return items;
}

function pickImageIndexes(count: number, ratio: number, mode: string, items: any[]) {
  if (mode === "none" || ratio <= 0) return new Set<number>();
  if (mode === "all") return new Set(items.map((_, index) => index));
  const target = Math.min(count, Math.max(0, Math.round(count * ratio / 100)));
  if (target <= 0) return new Set<number>();
  const indexes = new Set<number>();
  const candidates = items.map((item, index) => ({ index, preferred: Boolean(item?.needsImage) }));
  candidates.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.index - b.index);
  for (const candidate of candidates.slice(0, target)) indexes.add(candidate.index);
  return indexes;
}

export async function generateAmbientDrafts(formData: FormData) {
  try {
    const supabase = supabaseServerClient();
  const theme = text(formData, "theme", "Alltag");
  const contentMode = text(formData, "contentMode", "evergreen") === "monthly" ? "monthly" : "evergreen";
  const trendBrief = text(formData, "trendBrief", "").slice(0, 6000);
  const ageBand = text(formData, "ageBand", "14_15");
  const style = text(formData, "style", "mixed");
  const model = text(formData, "model", "claude");
  const count = num(formData, "count", 10, 1, 50);
  const typoLevel = num(formData, "typoLevel", 1, 0, 3);
  const slangLevel = num(formData, "slangLevel", 2, 0, 3);
  const emojiLevel = num(formData, "emojiLevel", 2, 0, 3);
  const imageMode = text(formData, "imageMode", "smart");
  const imageRatio = num(formData, "imageRatio", 35, 0, 100);
  const imageStyle = text(formData, "imageStyle", "authentic social photo");
  const aspectRatio = text(formData, "aspectRatio", "4:5");
  const creatorId = String(formData.get("creatorId") ?? "") || null;
  const requestedInterestKeys = Array.from(new Set(String(formData.get("interests") ?? "").split(",").map((v) => v.trim()).filter(Boolean))).slice(0, 3);
  const { data: interestRows, error: interestError } = requestedInterestKeys.length
    ? await supabase.from("ambient_interests").select("key, label").in("key", requestedInterestKeys).eq("is_active", true).eq("is_selectable", true).eq("taxonomy_status", "active")
    : { data: [], error: null };
  if (interestError) throw new Error(`Interessen-Katalog konnte nicht geladen werden: ${interestError.message}`);
  const interests = (interestRows ?? []).map((interest) => interest.label);
  const interestKeys = (interestRows ?? []).map((interest) => interest.key);
  const { data: catalogRows, error: catalogError } = await supabase
    .from("ambient_interests")
    .select("key, label, parent_key")
    .eq("is_active", true)
    .eq("taxonomy_status", "active")
    .order("sort_order")
    .order("label");
  if (catalogError) throw new Error(`Interessen-Katalog konnte nicht geladen werden: ${catalogError.message}`);
  const interestCatalog = catalogRows ?? [];
  const interestByKey = new Map(interestCatalog.map((interest) => [interest.key, interest]));
  const interestCatalogText = interestCatalog
    .filter((interest) => interest.key && interest.label)
    .map((interest) => `- ${interest.key}: ${interest.label}`)
    .join("\n");

  const creatorVoice = creatorId ? (await supabase.from("creators").select("display_name, persona").eq("id", creatorId).maybeSingle()).data : null;
  const profile = (await supabase.from("ambient_generation_profiles").select("*").eq("age_band", ageBand).eq("is_active", true).limit(1).maybeSingle()).data;
  // Gemini ist optional. Wenn der Nutzer Gemini auswählt, aber in Vercel
  // noch kein GEMINI_API_KEY hinterlegt ist, fällt der Generator automatisch
  // auf Claude zurück, sofern ANTHROPIC_API_KEY vorhanden ist.
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  console.info("[ambient-generator] Gemini API key configured:", geminiConfigured);

  let provider: "gemini" | "claude" = model === "gemini" ? "gemini" : "claude";
  let apiKey = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY;

  if (!apiKey && provider === "gemini" && process.env.ANTHROPIC_API_KEY) {
    provider = "claude";
    apiKey = process.env.ANTHROPIC_API_KEY;
  }

  if (!apiKey) {
    throw new Error(
      provider === "gemini"
        ? "GEMINI_API_KEY ist zur Laufzeit nicht verfügbar (Vercel Production Environment)."
        : "ANTHROPIC_API_KEY ist nicht gesetzt.",
    );
  }

  const languageLibrary = buildAmbientLanguagePrompt(ageBand, slangLevel, typoLevel);
  const ageText = AGE_BANDS[ageBand] ?? ageBand;
  const styleText = STYLE_LABELS[style] ?? style;
  const dateText = new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeZone: "Europe/Berlin" }).format(new Date());
  const prompt = `${CORE_PROMPT}\n\n${languageLibrary}\n\nGENERATION PROFILE\n- Zielgruppe: ${ageText}\n- Thema: ${theme}\n- Interessen als kreative Ausgangspunkte: ${interests.length ? interests.join(", ") : "frei wählen"}\n- Schreibstil: ${styleText}\n- Tippfehler-Level: ${typoLevel}/3\n- Jugendsprache-Level: ${slangLevel}/3\n- Emoji-Level: ${emojiLevel}/3\n- Gewünschter Bildanteil: ${imageRatio}%\n- Bildstrategie: ${imageMode}\n- Heute: ${dateText}\n- Content-Modus: ${contentMode === "monthly" ? "MONATLICHES TRENDPAKET" : "EVERGREEN"}\n- Redaktionelles Trend-Briefing: ${trendBrief || "Kein extern verifiziertes Trend-Briefing bereitgestellt."}\n- Im monatlichen Modus: Verteile die gelieferten Themen über den Batch und mische sie mit zeitlosen Alltagsposts. Nutze nur Trends aus dem Briefing. Behaupte keine aktuellen Charts, viralen Ereignisse, Zahlen oder Trends ohne Beleg. Wenn das Briefing leer ist, nutze saisonale Alltagsthemen, kennzeichne sie aber nicht als nachweislich viral oder trendend.\n- Creator: ${creatorVoice?.display_name ?? "wechselnde Ambient-Accounts"}\n- Persona: ${JSON.stringify(creatorVoice?.persona ?? {})}\n- Profilhinweise: ${JSON.stringify(profile?.prompt_rules ?? {})}\n\nAUTHENTICITY CHECK\n- Mindestens einige Posts komplett normal und unspektakulär.\n- Slang nur kontextgerecht.\n- Tippfehler selten und plausibel.\n- Aktuelle Trendwörter nicht gleichmäßig verteilen.\n- Keine Wiederholungen oder Emoji-Schablonen.\n- Kein Erwachsener, der Teenager imitiert.\n- Unterschiede zwischen Stimmen und Altersgruppen müssen erkennbar sein.\n\nINTERESSEN-TAGS PRO POST\n- Verteile die Interessen NICHT pauschal auf alle Posts. Jeder Post bekommt eine eigene Zuordnung passend zu seinem konkreten Inhalt.\n- Die gewählten Interessen sind kreative Ausgangspunkte, keine automatischen Tags für jeden Post.\n- Nutze ausschließlich Keys aus dem folgenden kanonischen Katalog; keine Labels, erfundenen Keys oder Synonyme als Keys.\n- Vergib typischerweise 1–3 passende Keys pro Post. Lieber wenige präzise Tags als viele unpassende.\n- Ein Post darf mehrere Themen abdecken, aber tagge nur Themen, die im Text wirklich vorkommen oder klar im Mittelpunkt stehen.\n- Wenn ein Post keines der Interessen sinnvoll abdeckt, gib ein leeres Array zurück.\n- KANONISCHER INTERESSEN-KATALOG:\n${interestCatalogText}\n\nErzeuge ${count} Items und gib ausschließlich dieses JSON-Objekt zurück:\n{ "items": [{ "body": string, "format": "status" | "question" | "story" | "observation" | "reply" | "caption" | "poll_idea" | "moment", "mood": string, "topic": string, "creatorVibe": string, "needsImage": boolean, "imagePrompt": string, "interestKeys": string[] }] }`;

  let items: any[] = [];

  if (provider === "claude") {
    items = await generateClaudeText(apiKey, prompt);
  } else {
    try {
      items = await generateGeminiText(apiKey, prompt);
    } catch (geminiError) {
      const geminiMessage =
        geminiError instanceof Error
          ? geminiError.message
          : "Unbekannter Gemini-Fehler";

      const claudeKey = process.env.ANTHROPIC_API_KEY;
      if (!claudeKey) {
        throw new Error(
          `Gemini-Textgenerierung fehlgeschlagen: ${geminiMessage}`,
        );
      }

      try {
        items = await generateClaudeText(claudeKey, prompt);
      } catch (claudeError) {
        const claudeMessage =
          claudeError instanceof Error
            ? claudeError.message
            : "Unbekannter Claude-Fehler";

        throw new Error(
          `Textgenerierung fehlgeschlagen. Gemini: ${geminiMessage}. Claude-Fallback: ${claudeMessage}`,
        );
      }
    }
  }

  if (!Array.isArray(items) || !items.length) {
    throw new Error("Keine gültigen Ambient-Items generiert.");
  }

  const imageIndexes = pickImageIndexes(items.length, imageRatio, imageMode, items);
  const rows = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!item?.body || typeof item.body !== "string") continue;
    const shouldImage = imageIndexes.has(index);
    let mediaUrl: string | null = null;
    let imageProvider: string | null = null;
    let imageModel: string | null = null;
    if (shouldImage && item.imagePrompt) {
      const image = await generateImage(`Create an authentic, ordinary social-media image for a German social-media feed. ${imageStyle}. Topic: ${item.topic}. Mood: ${item.mood}. ${item.imagePrompt}. Natural smartphone photography, candid everyday setting, realistic lighting, slightly imperfect framing. No age, age range, minor/teen references, logos, readable text, celebrity likeness, political messaging or staged advertising.`, aspectRatio, index);
      mediaUrl = image.url;
      imageProvider = image.provider;
      imageModel = image.model;
    }
    const assignedInterestKeys = new Set<string>();
    if (Array.isArray(item.interestKeys)) {
      for (const rawKey of item.interestKeys) {
        if (typeof rawKey !== "string" || !interestByKey.has(rawKey)) continue;
        let current: string | null = rawKey;
        const visited = new Set<string>();
        while (current && !visited.has(current)) {
          visited.add(current);
          assignedInterestKeys.add(current);
          current = interestByKey.get(current)?.parent_key ?? null;
        }
      }
    }
    const postInterestKeys = Array.from(assignedInterestKeys);
    const postInterests = postInterestKeys
      .map((key) => interestByKey.get(key)?.label)
      .filter((label): label is string => Boolean(label));
    rows.push({ type: "post", scenario_id: null, creator_id: creatorId, body: item.body.trim().slice(0, 1000), media_url: mediaUrl, media_type: mediaUrl ? "image" : null, manipulation_techniques: [], target_competencies: [], difficulty: 1, age_rating: ageBand === "16_17" || ageBand === "18_plus" ? "16_plus" : ageBand === "all" ? "all_ages" : "12_plus", status: "draft", extra: { generatedBy: "ai", generatorVersion: "ambient-studio-v7", provider, theme, contentMode, trendBrief, contentMonth: contentMode === "monthly" ? new Date().toISOString().slice(0, 7) : null, interests: postInterests, interestKeys: postInterestKeys, generationInterests: interests, generationInterestKeys: interestKeys, style, styleLabel: styleText, typoLevel, slangLevel, emojiLevel, imageRatio, imageMode, format: item.format, mood: item.mood, topic: item.topic, creatorVibe: item.creatorVibe, imageRequested: shouldImage, imageGenerated: Boolean(mediaUrl), imageProvider, imageModel, languageLibrary: "source-grounded-2026-08" } });
  }
  if (!rows.length) throw new Error("Die KI hat keine gültigen Items geliefert.");
  const { error } = await supabase.from("content_items").insert(rows);
  if (error) throw new Error(error.message);
    revalidatePath("/ambient-content");
    redirect("/ambient-content");
  } catch (error) {
    // Next.js redirect() throws a control-flow exception; let successful
    // generation redirects pass through instead of reporting a false error.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unbekannter Fehler bei der Ambient-Generierung.";
    console.error("[ambient-generator]", error);
    redirect(`/ambient-content?generationError=${encodeURIComponent(message.slice(0, 900))}`);
  }
}

export async function archiveAmbientContent(contentItemId: string) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("content_items").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", contentItemId).is("scenario_id", null);
  if (error) throw new Error(error.message);
  revalidatePath("/ambient-content");
}


/** Assign an existing global NPC/creator as the author of an ambient post. */
export async function assignAmbientPostCreator(formData: FormData) {
  const supabase = supabaseServerClient();
  const contentItemId = String(formData.get("contentItemId") ?? "").trim();
  const creatorId = String(formData.get("creatorId") ?? "").trim() || null;
  if (!contentItemId) throw new Error("Content-ID fehlt.");

  if (creatorId) {
    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id, kind, creator_role, scenario_id, is_active")
      .eq("id", creatorId)
      .maybeSingle();
    if (creatorError) throw new Error(creatorError.message);
    if (!creator || creator.kind !== "npc" || creator.is_active === false || creator.scenario_id !== null) {
      throw new Error("Bitte eine vorhandene globale NPC-Figur auswählen.");
    }
  }

  const { data: updated, error } = await supabase
    .from("content_items")
    .update({ creator_id: creatorId, updated_at: new Date().toISOString() })
    .eq("id", contentItemId)
    .eq("type", "post")
    .is("scenario_id", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) throw new Error("Ambient-Post nicht gefunden oder nicht änderbar.");
  revalidatePath("/ambient-content");
}


/**
 * Reuse the production-tested editorial image pipeline for scenario/mission
 * teaser artwork. This preserves the existing FLUX -> Gemini fallback and
 * storage handling instead of maintaining a separate image endpoint.
 */
const EDITORIAL_TEASER_NO_TEXT_RULE = [
  "ABSOLUTE NON-NEGOTIABLE OVERRIDING RULE: THE GENERATED IMAGE MUST CONTAIN ZERO TEXT.",
  "DO NOT RENDER OR GENERATE ANY TEXTUAL CONTENT IN THE IMAGE UNDER ANY CIRCUMSTANCES.",
  "No text, no writing, no letters, no words, no numbers, no typography, no captions, no subtitles, no labels, no logos, no watermarks, no signatures, no symbols that resemble writing, no pseudo-text, no gibberish, no fake characters.",
  "Do not create posters, title cards, banners, signs, interface elements, screenshots, speech bubbles, book pages, documents, packaging, clothing marks, or any other text-bearing design.",
  "All screens, paper, books, signs, labels, and other surfaces that could contain writing MUST be completely blank or excluded from the image.",
  "Do not depict, spell, typeset, illustrate, or otherwise reproduce any words from the supplied prompt. The prompt is visual context only.",
  "If any visual idea conflicts with this rule, omit that element and keep the image purely visual. This rule has higher priority than every other instruction in the prompt."
].join("\\n");

export async function generateEditorialTeaserImage(prompt: string) {
  if (!prompt.trim()) throw new Error("Für das Teaserbild fehlt die Bildbeschreibung.");

  // Enforce the no-text requirement centrally and append it AFTER all editorial
  // briefing content so scenario titles/descriptions cannot weaken the rule.
  const enforcedPrompt = [prompt.trim(), EDITORIAL_TEASER_NO_TEXT_RULE].join("\\n\\n");
  return generateImage(enforcedPrompt, "16:9", Date.now());
}
