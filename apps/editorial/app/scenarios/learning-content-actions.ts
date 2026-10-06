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

function youtubeEmbedUrl(value: string) {
  const trimmed = value.trim();
  const iframe = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];
  const source = iframe || trimmed;
  try {
    const url = new URL(source);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? "https://www.youtube.com/embed/" + id : source;
    }
    if (url.hostname === "youtu.be") return "https://www.youtube.com/embed/" + url.pathname.slice(1);
    if (url.hostname.includes("vimeo.com")) return "https://player.vimeo.com/video/" + url.pathname.split("/").filter(Boolean).pop();
    return source;
  } catch {
    return null;
  }
}

async function updateExistingContentMedia(scenarioId: string, contentItemId: string, input: { format?: string; prompt?: string; url?: string; ai?: boolean }) {
  const supabase = supabaseServerClient();
  const { data: item } = await supabase.from("content_items").select("id,body,media_url,media_type,extra").eq("id", contentItemId).eq("scenario_id", scenarioId).single();
  if (!item) throw new Error("Inhalt nicht gefunden.");

  const format = String(input.format || "photo");
  const url = String(input.url || "").trim();
  const prompt = String(input.prompt || "").trim();
  const extra = { ...((item.extra || {}) as Record<string, unknown>) };

  if (format === "embed") {
    const embedUrl = youtubeEmbedUrl(url);
    if (!embedUrl) throw new Error("Bitte eine gültige URL oder einen iframe-Embed-Code angeben.");
    extra.embed = { url: embedUrl, source: url };
    const { error } = await supabase.from("content_items").update({ extra, updated_at: new Date().toISOString() }).eq("id", contentItemId).eq("scenario_id", scenarioId);
    if (error) throw new Error(error.message);
    revalidatePath("/scenarios/" + scenarioId);
    return { ok: true };
  }

  if (format === "video" && url && input.ai === false) {
    extra.videoUrl = url;
    const { error } = await supabase.from("content_items").update({ media_url: url, media_type: "video", extra, updated_at: new Date().toISOString() }).eq("id", contentItemId).eq("scenario_id", scenarioId);
    if (error) throw new Error(error.message);
    revalidatePath("/scenarios/" + scenarioId);
    return { ok: true };
  }

  const scenario = (await supabase.from("scenarios").select("id,title,age_band").eq("id", scenarioId).single()).data;
  if (!scenario) throw new Error("Szenario nicht gefunden.");
  const design = (await supabase.from("learning_designs").select("id").eq("scenario_id", scenarioId).order("version", { ascending: false }).limit(1).maybeSingle()).data;
  const stepId = String(extra.learningStepId || "");
  const step = stepId ? (await supabase.from("learning_steps").select("id,title,description,activity_config").eq("id", stepId).maybeSingle()).data : null;
  const basePrompt = [
    "Erzeuge einen Medienentwurf für DR1FT.",
    "Format: " + format,
    "Szenario: " + scenario.title,
    "Altersgruppe: " + scenario.age_band,
    "Bestehender Beitrag: " + item.body,
    "Lernschritt: " + (step?.title || "nicht angegeben"),
    "Lernkontext: " + (step?.description || ""),
    "Redaktionswunsch: " + (prompt || "passend zum bestehenden Beitrag"),
  ].join("\n");

  if (format === "photo" || format === "meme") {
    const image = await generateImage(basePrompt + (format === "meme" ? " Create a meme-style visual." : " Create a realistic ordinary smartphone photo."), "4:5", scenarioId);
    const nextExtra = { ...extra, imageGeneration: { status:"generated", provider:image.provider, model:image.model, fullPrompt:basePrompt, aspectRatio:"4:5", generationCount:Number((extra.imageGeneration as any)?.generationCount || 0)+1, editorialReview:"pending", generatedAt:new Date().toISOString() } };
    const { error } = await supabase.from("content_items").update({ media_url:image.url, media_type:"image", extra:nextExtra, updated_at:new Date().toISOString() }).eq("id",contentItemId).eq("scenario_id",scenarioId);
    if (error) throw new Error(error.message);
  } else if (format === "video") {
    const body = await geminiText(basePrompt + "\nFormuliere einen kurzen Text für einen Video-Post. Erzeuge kein Video.");
    const nextExtra = { ...extra, videoConcept: body, videoUrl: url || null };
    const { error } = await supabase.from("content_items").update({ body, media_url:url || null, media_type:url ? "video" : null, extra:nextExtra, updated_at:new Date().toISOString() }).eq("id",contentItemId).eq("scenario_id",scenarioId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/scenarios/" + scenarioId);
  return { ok: true };
}

export async function createLearningContentItem(scenarioId: string, input: { format?: string; prompt?: string; url?: string; ai?: boolean }) {
  const supabase = supabaseServerClient();
  const format = String(input.format || "post");
  const userPrompt = String(input.prompt || "").trim();
  const url = String(input.url || "").trim();

  const { data: scenario } = await supabase.from("scenarios").select("id,title,description,age_band,age_rating").eq("id", scenarioId).single();
  if (!scenario) throw new Error("Szenario nicht gefunden.");

  const { data: design } = await supabase.from("learning_designs").select("id").eq("scenario_id", scenarioId).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: step } = design
    ? await supabase.from("learning_steps").select("id,title,description,activity_type,activity_config,reflection_prompt").eq("learning_design_id", design.id).order("step_index").limit(1).maybeSingle()
    : { data: null };

  const labels: Record<string,string> = { post:"Textbeitrag", photo:"Foto", meme:"Meme", video:"Video", embed:"Embed", comment:"Kommentar", dm_message:"DM", reflection_prompt:"Reflexionsimpuls" };
  let body = userPrompt;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  let extra: Record<string, unknown> = { generatedBy: "content-composer-v1", contentFormat: format, learningStepId: step?.id ?? null };

  if (format === "embed") {
    if (!url) throw new Error("Für einen Embed wird eine URL oder ein Embed-Code benötigt.");
    body = userPrompt || "Eingebetteter Inhalt";
    extra.embedUrl = url;
  } else if (input.ai !== false) {
    const prompt = [
      "Erzeuge einen redaktionellen Entwurf für DR1FT.",
      "Format: " + (labels[format] || format),
      "Szenario: " + scenario.title,
      "Altersgruppe: " + scenario.age_band,
      "Lernschritt: " + (step?.title || "nicht angegeben"),
      "Lernschritt-Beschreibung: " + (step?.description || ""),
      "Pädagogischer Zweck: " + (step?.activity_config?.contentPlan ? JSON.stringify(step.activity_config.contentPlan) : "nicht angegeben"),
      "Zusätzlicher Wunsch der Redaktion: " + (userPrompt || "keiner"),
      "Erzeuge keinen Meta-Text über Pädagogik. Alles bleibt Draft.",
    ].join("\n");

    if (format === "photo" || format === "meme") {
      const image = await generateImage(
        prompt + (format === "meme" ? " Create a meme-style visual, but do not use copyrighted characters or readable text in the image." : " Create a realistic ordinary smartphone photo."),
        "4:5",
        scenarioId,
      );
      mediaUrl = image.url;
      mediaType = "image";
      body = format === "meme" ? (await geminiText(prompt + "\nGive a short meme caption for the generated image.")) : (userPrompt || "Bild für den Lernschritt");
      extra.imageGeneration = {
        status: "generated", provider: image.provider, model: image.model, fullPrompt: prompt,
        aspectRatio: "4:5", generationCount: 1, editorialReview: "pending", generatedAt: new Date().toISOString(),
      };
    } else {
      body = await geminiText(prompt + "\nErzeuge nur den eigentlichen Inhalt, keine Erklärung.");
      if (format === "video" && url) extra.videoUrl = url;
    }
  }

  const type = format === "comment" ? "comment" : format === "dm_message" ? "dm_message" : format === "reflection_prompt" ? "reflection_prompt" : "post";
  const { data: contentItem, error } = await supabase.from("content_items").insert({
    scenario_id: scenarioId, type, body: body || labels[format] || "Entwurf", media_url: mediaUrl, media_type: mediaType,
    difficulty: 1, age_rating: scenario.age_band === "16_17" || scenario.age_band === "18_plus" ? "16_plus" : "12_plus",
    manipulation_techniques: [], target_competencies: [], status: "draft", extra,
  }).select("id").single();
  if (error || !contentItem) throw new Error(error?.message || "Content konnte nicht gespeichert werden.");

  if (step) {
    await supabase.from("learning_step_content").insert({ learning_step_id: step.id, content_item_id: contentItem.id, role: format, order_index: 0, required: false });
  }
  revalidatePath("/scenarios/" + scenarioId);
  return { ok: true, id: contentItem.id };
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
