interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<{ image?: string }>;
}

interface Env {
  AI: AiBinding;
  AMBIENT_IMAGE_API_KEY?: string;
}

interface ImageRequest {
  prompt?: unknown;
  steps?: unknown;
  aspectRatio?: unknown;
}

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function authorized(request: Request, env: Env): boolean {
  const expected = env.AMBIENT_IMAGE_API_KEY;
  if (!expected) return false;
  const bearer = request.headers.get("authorization");
  const headerKey = request.headers.get("x-dr1ft-image-key");
  return bearer === `Bearer ${expected}` || headerKey === expected;
}

function aspectLabel(value: unknown): string {
  const allowed = new Set(["1:1", "4:5", "5:4", "16:9", "9:16", "3:4", "4:3"]);
  const ratio = String(value ?? "").trim();
  return allowed.has(ratio) ? ratio : "1:1";
}

function toPositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Dr1ft-Image-Key",
        },
      });
    }

    if (request.method === "GET") {
      return json({ ok: true, service: "dr1ft-ambient-image", model: MODEL });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);

    let body: ImageRequest;
    try {
      body = (await request.json()) as ImageRequest;
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }

    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!rawPrompt) return json({ error: "prompt is required" }, 400);

    const prompt = `${rawPrompt}\n\nGenerate a natural, ordinary social-media image. Avoid readable text, logos, celebrities, political messaging and advertising.`.slice(0, 2048);
    const dimensions: Record<string, [number, number]> = {
    "1:1": [1024, 1024],
    "4:5": [1024, 1280],
    "5:4": [1280, 1024],
    "16:9": [1344, 768],
    "9:16": [768, 1344],
    "3:4": [1024, 1365],
    "4:3": [1365, 1024],
  };
  const ratio = aspectLabel(body.aspectRatio);
  const [width, height] = dimensions[ratio] ?? dimensions["1:1"];

  try {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("width", String(width));
      form.append("height", String(height));
      const formResponse = new Response(form);
      const result = await env.AI.run(MODEL, {
        multipart: {
          body: formResponse.body!,
          contentType: formResponse.headers.get("content-type")!,
        },
      });

      if (!result || typeof result.image !== "string" || !result.image) {
        return json({ error: "Workers AI returned no image" }, 502);
      }

      return json({
        ok: true,
        model: MODEL,
        mimeType: "image/jpeg",
        image: result.image,
        aspectRatio: ratio,
        width,
        height,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Workers AI error";
      return json({ error: "Image generation failed", detail: message }, 502);
    }
  },
} satisfies ExportedHandler<Env>;
