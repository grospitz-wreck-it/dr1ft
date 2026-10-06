"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

async function geminiText(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY ist zur Laufzeit nicht verfügbar.");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: "gemini-3.5-flash-lite",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object",
          properties: { body: { type: "string" } },
          required: ["body"],
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Gemini Content-Generierung fehlgeschlagen: " + (await response.text()).slice(0, 500));
  const data = await response.json();
  const raw =
    data.output_text ??
    data.output?.find?.((part: any) => part.type === "text")?.text ??
    "";
  const parsed = JSON.parse(String(raw).trim());
  return String(parsed.body || "").trim();
}

async function storeImage(base64: string, mimeType: string, scenarioId: string) {
  const supabase = supabaseServerClient();
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const path = "generated/scenarios/" + scenarioId + "/" + new Date().toISOString().slice(0, 10) + "/" + crypto.randomUUID() + "." + ext;
  const { error } = await supabase.storage
    .from("content-media")
    .upload(path, Buffer.from(base64, "base64"), { contentType: mimeType, upsert: false });
  if (error) throw new Error("Bild konnte nicht gespeichert werden: " + error.message);
  return supabase.storage.from("content-media").getPublicUrl(path).data.publicUrl;
}

async function generateImage(prompt: string, aspectRatio: string, scenarioId: string) {
  const workerUrl = process.env.CLOUDFLARE_AMBIENT_IMAGE_URL?.trim();
  const apiKey = (process.env.CLOUDFLARE_AMBIENT_IMAGE_API_KEY ?? process.env.AMBIENT_IMAGE_API_KEY)?.trim();

  if (workerUrl && apiKey) {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({ prompt, aspectRatio, steps: 4 }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && typeof data?.image === "string") {
      return {
        url: await storeImage(data.image, "image/jpeg", scenarioId),
        provider: "cloudflare",
        model: "@cf/black-forest-labs/flux-2-klein-4b",
      };
    }
    if (!response.ok) {
      throw new Error("Cloudflare Bildgenerierung fehlgeschlagen: " + String(data?.error || data?.detail || response.statusText).slice(0, 500));
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error("Keine Bildgenerierung konfiguriert.");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify({
      model: "gemini-3.1-flash-image",
      input: prompt,
      response_format: { type: "image", aspect_ratio: aspectRatio || "4:5", image_size: "1K" },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Gemini Bildgenerierung fehlgeschlagen: " + (await response.text()).slice(0, 500));

  const data = await response.json();
  const image = data.output_image ?? data.output?.find?.((part: any) => part.type === "image")?.image;
  const base64 = image?.data ?? image?.base64;
  if (!base64) throw new Error("Bildgenerator hat kein Bild geliefert.");

  return {
    url: await storeImage(base64, image?.mime_type ?? "image/png", scenarioId),
    provider: "gemini",
    model: "gemini-3.1-flash-image",
  };
}

function imagePromptFor(item: any, step: any, scenario: any) {
  return [
    "Create an authentic ordinary social-media image for a German social-media feed.",
    "Scenario: " + scenario.title,
    "Learning step: " + step.title,
    "Pedagogical purpose: " + item.purpose,
    "Visual brief: " + item.imagePrompt,
    "Natural smartphone photography, believable everyday context, realistic lighting, slightly imperfect framing.",
    "No readable text, logos, celebrity likeness, political messaging, staged advertising.",
  ].join(" ");
}

export async function generateLearningContent(scenarioId: string, learningDesignId?: string) {
  const supabase = supabaseServerClient();

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("id,title,description,age_band,age_rating")
    .eq("id", scenarioId)
    .single();

  if (!scenario) throw new Error("Szenario nicht gefunden.");

  const designQuery = supabase
    .from("learning_designs")
    .select("id,title,description")
    .eq("scenario_id", scenarioId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: design } = learningDesignId
    ? await supabase.from("learning_designs").select("id,title,description").eq("id", learningDesignId).single()
    : await designQuery;

  if (!design) throw new Error("Noch kein Learning Design vorhanden.");

  const { data: steps } = await supabase
    .from("learning_steps")
    .select("id,step_index,title,description,activity_type,activity_config,reflection_prompt")
    .eq("learning_design_id", design.id)
    .order("step_index");

  if (!steps?.length) throw new Error("Das Learning Design enthält keine Lernschritte.");

  let created = 0;

  for (const step of steps) {
    const plan = Array.isArray(step.activity_config?.contentPlan) ? step.activity_config.contentPlan : [];
    for (const item of plan) {
      const format = String(item.format || "text_post");
      const type = format === "comment"
        ? "comment"
        : format === "dm"
          ? "dm_message"
          : format === "reflection_prompt"
            ? "reflection_prompt"
            : "post";

      let body = String(item.textPrompt || item.purpose || "").trim();
      if (type !== "reflection_prompt") {
        body = await geminiText([
          "Erzeuge genau einen glaubwürdigen Social-Media-Inhalt für DR1FT.",
          "Szenario: " + scenario.title,
          "Altersgruppe: " + scenario.age_band,
          "Lernschritt: " + step.title,
          "Rolle: " + item.role,
          "Format: " + format,
          "Pädagogischer Zweck: " + item.purpose,
          "Der Inhalt darf seine Lernfunktion nicht erklären.",
          "Keine erfundenen externen Fakten. Keine realen Personen.",
        ].join("\n"));
      } else {
        body = step.reflection_prompt || body;
      }

      let mediaUrl: string | null = null;
      let imageGeneration: Record<string, unknown> | null = null;

      if (item.imageRequired) {
        const prompt = imagePromptFor(item, step, scenario);
        const image = await generateImage(prompt, String(item.imageAspectRatio || "4:5"), scenarioId);
        mediaUrl = image.url;
        imageGeneration = {
          status: "generated",
          provider: image.provider,
          model: image.model,
          prompt: String(item.imagePrompt || ""),
          fullPrompt: prompt,
          aspectRatio: String(item.imageAspectRatio || "4:5"),
          generationCount: 1,
          editorialReview: "pending",
          generatedAt: new Date().toISOString(),
        };
      }

      const { data: contentItem, error } = await supabase
        .from("content_items")
        .insert({
          scenario_id: scenarioId,
          type,
          body,
          media_url: mediaUrl,
          media_type: mediaUrl ? "image" : null,
          difficulty: 1,
          age_rating: scenario.age_band === "16_17" || scenario.age_band === "18_plus" ? "16_plus" : "12_plus",
          manipulation_techniques: [],
          target_competencies: [],
          status: "draft",
          extra: {
            generatedBy: "scenario-learning-content-v1",
            learningDesignId: design.id,
            learningStepId: step.id,
            contentRole: item.role,
            contentFormat: format,
            pedagogicalPurpose: item.purpose,
            imageGeneration,
          },
        })
        .select("id")
        .single();

      if (error || !contentItem) throw new Error(error?.message || "Content konnte nicht gespeichert werden.");

      const { error: mappingError } = await supabase.from("learning_step_content").insert({
        learning_step_id: step.id,
        content_item_id: contentItem.id,
        role: item.role,
        order_index: Number(item.orderIndex || 0),
        required: Boolean(item.required ?? true),
      });

      if (mappingError) throw new Error(mappingError.message);
      created++;
    }
  }

  revalidatePath("/scenarios/" + scenarioId);
  return { created, learningDesignId: design.id };
}

export async function rejectLearningImage(contentItemId: string, scenarioId: string, formData: FormData) {
  const feedback = String(formData.get("editorialFeedback") || "").trim();
  const supabase = supabaseServerClient();
  const { data: item, error } = await supabase
    .from("content_items")
    .select("id,extra")
    .eq("id", contentItemId)
    .eq("scenario_id", scenarioId)
    .single();

  if (error || !item) throw new Error(error?.message || "Content nicht gefunden.");

  const extra = item.extra || {};
  const imageGeneration = {
    ...((extra.imageGeneration as Record<string, unknown> | undefined) || {}),
    editorialReview: "rejected",
    editorialFeedback: feedback.trim(),
    rejectedAt: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("content_items")
    .update({ extra: { ...extra, imageGeneration }, updated_at: new Date().toISOString() })
    .eq("id", contentItemId)
    .eq("scenario_id", scenarioId);

  if (updateError) throw new Error(updateError.message);
  revalidatePath("/scenarios/" + scenarioId);
}

export async function regenerateLearningImage(contentItemId: string, scenarioId: string, formData: FormData) {
  const feedback = String(formData.get("feedback") || "").trim();
  const supabase = supabaseServerClient();
  const { data: item, error } = await supabase
    .from("content_items")
    .select("id,media_url,extra")
    .eq("id", contentItemId)
    .eq("scenario_id", scenarioId)
    .single();

  if (error || !item) throw new Error(error?.message || "Content nicht gefunden.");

  const extra = item.extra || {};
  const generation = (extra.imageGeneration || {}) as Record<string, unknown>;
  const prompt = String(generation.fullPrompt || generation.prompt || "").trim();
  if (!prompt) throw new Error("Kein reproduzierbarer Bildprompt vorhanden.");

  const revisedPrompt = feedback?.trim() ? prompt + " Editorial feedback: " + feedback.trim() : prompt;
  const image = await generateImage(revisedPrompt, String(generation.aspectRatio || "4:5"), scenarioId);

  const nextGeneration = {
    ...generation,
    status: "generated",
    provider: image.provider,
    model: image.model,
    generationCount: Number(generation.generationCount || 1) + 1,
    editorialReview: "pending",
    editorialFeedback: feedback?.trim() || null,
    previousMediaUrl: item.media_url || null,
    generatedAt: new Date().toISOString(),
    fullPrompt: revisedPrompt,
  };

  const { error: updateError } = await supabase
    .from("content_items")
    .update({
      media_url: image.url,
      media_type: "image",
      status: "draft",
      extra: { ...extra, imageGeneration: nextGeneration },
      updated_at: new Date().toISOString(),
    })
    .eq("id", contentItemId)
    .eq("scenario_id", scenarioId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/scenarios/" + scenarioId);
  return { mediaUrl: image.url, generationCount: nextGeneration.generationCount };
}
