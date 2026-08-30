// apps/editorial/app/(protected)/ambient-content/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

const SYSTEM_PROMPT = `
Du generierst harmlose, alltägliche Social-Media-Posts auf Deutsch
für eine Lernplattform. Diese Posts dienen als neutrales Füllmaterial in
einem Feed, NICHT als Lerninhalt.

Strikte Regeln:

- Keine Überzeugungs- oder Manipulationsabsicht jeglicher Art.
- Keine echten Personen, Marken, Organisationen oder Prominenten.
- Keine politischen, kontroversen oder sensiblen Themen.
- Keine Nachrichten/News-Anmutung ("Schock", "Eilmeldung" o.ä.).
- Kurz, beiläufig, alltäglich.
- Geeignete Themen sind z.B. Hobbys, Essen, Wetter, Schule, Sport,
  Musik, Serien und Freizeit.
- Wie ein normaler, unaufgeregter Social-Media-Post.
- Altersgerecht für 12+.
- Keine Werbung.
- Keine Kaufaufforderungen.
- Keine Manipulation.
- Keine erfundenen aktuellen Nachrichten.
- Keine Hashtag-Flut.

Antworte ausschließlich mit einem validen JSON-Array aus Strings.
Kein Markdown.
Keine Erklärung.
`;

export async function generateAmbientDrafts(formData: FormData) {
  const supabase = supabaseServerClient();

  const theme =
    String(formData.get("theme") ?? "Alltag").trim() || "Alltag";

  const count = Math.min(
    10,
    Math.max(1, Number(formData.get("count") ?? 5)),
  );

  const creatorId =
    String(formData.get("creatorId") ?? "") || null;

  // Gemini API-Key ausschließlich serverseitig.
  // NIEMALS NEXT_PUBLIC_GEMINI_API_KEY verwenden.
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY ist nicht gesetzt. Bitte als Server-Umgebungsvariable bereitstellen.",
    );
  }

  const userPrompt = `
Generiere genau ${count} Ambient-Posts zum Thema "${theme}".

Die Posts sollen:

- kurz sein
- natürlich wirken
- sich voneinander unterscheiden
- wie normale beiläufige Social-Media-Beiträge wirken
- für Jugendliche ab 12 Jahren geeignet sein

Gib ausschließlich ein JSON-Array aus Strings zurück.

Beispiel:
["Heute war das Wetter echt angenehm.", "Ich habe gerade eine neue Serie angefangen."]
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: SYSTEM_PROMPT,
            },
          ],
        },

        contents: [
          {
            role: "user",
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],

        generationConfig: {
          maxOutputTokens: 1200,

          responseMimeType: "application/json",

          responseSchema: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();

    throw new Error(
      `Gemini API Fehler: ${errText}`,
    );
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) {
    throw new Error(
      "Gemini hat keine Textantwort zurückgegeben.",
    );
  }

  let posts: unknown;

  try {
    posts = JSON.parse(text.trim());
  } catch {
    throw new Error(
      `Gemini-Antwort war kein valides JSON: ${text}`,
    );
  }

  if (!Array.isArray(posts)) {
    throw new Error(
      "Gemini hat kein JSON-Array zurückgegeben.",
    );
  }

  const cleanPosts = posts
    .filter(
      (post): post is string =>
        typeof post === "string" &&
        post.trim().length > 0 &&
        post.length < 500,
    )
    .slice(0, count);

  if (cleanPosts.length === 0) {
    throw new Error(
      "Keine gültigen Ambient-Posts generiert.",
    );
  }

  const rows = cleanPosts.map((body) => ({
    type: "post",

    // Ambient-Content ist szenario-unabhängig.
    scenario_id: null,

    creator_id: creatorId,

    body: body.trim(),

    manipulation_techniques: [],

    target_competencies: [],

    difficulty: 1,

    age_rating: "12_plus",

    // KI-Content wird NIEMALS automatisch veröffentlicht.
    status: "draft",

    extra: {
      generatedBy: "ai",
      provider: "gemini",
      model: "gemini-3.1-flash-lite",
      theme,
    },
  }));

  const { error } = await supabase
    .from("content_items")
    .insert(rows);

  if (error) {
    throw new Error(
      `Supabase Fehler beim Speichern: ${error.message}`,
    );
  }

  revalidatePath("/ambient-content");
}