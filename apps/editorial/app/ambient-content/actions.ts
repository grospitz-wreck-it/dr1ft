// apps/admin/app/ambient-content/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

const SYSTEM_PROMPT = `Du generierst harmlose, alltägliche Social-Media-Posts auf Deutsch
für eine Lernplattform. Diese Posts dienen als neutrales Füllmaterial in
einem Feed, NICHT als Lerninhalt.

Strikte Regeln:
- Keine Überzeugungs- oder Manipulationsabsicht jeglicher Art.
- Keine echten Personen, Marken, Organisationen oder Prominenten.
- Keine politischen, kontroversen oder sensiblen Themen.
- Keine Nachrichten/News-Anmutung ("Schock", "Eilmeldung" o.ä.) — das ist
  bewusst für den manipulativen Content reserviert, nicht für Ambient-Content.
- Kurz, beiläufig, alltäglich (Hobbys, Essen, Wetter, Schule, Sport,
  Musik, Serien, Freizeit) — wie ein normaler, unaufgeregter Social-Post.
- Altersgerecht für 12+.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Array aus Strings, ohne
Markdown-Codeblock, ohne Erklärung. Beispiel: ["Post 1", "Post 2"]`;

/**
 * Ruft die Anthropic API auf, um eine Reihe von Ambient-Content-Entwürfen
 * zu generieren. Landet IMMER als status='draft' — die Freigabe läuft
 * über den bestehenden Redaktions-Workflow, genau wie bei jedem anderen
 * Content-Item (siehe ALLOWED_TRANSITIONS in ../scenarios/actions.ts).
 */
export async function generateAmbientDrafts(formData: FormData) {
  const supabase = supabaseServerClient();

  const theme = String(formData.get("theme") ?? "Alltag").trim();
  const count = Math.min(10, Math.max(1, Number(formData.get("count") ?? 5)));
  const creatorId = String(formData.get("creatorId") ?? "") || null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY ist nicht gesetzt (Server-Umgebungsvariable, niemals NEXT_PUBLIC_*)."
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generiere ${count} Ambient-Posts zum Thema "${theme}".`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API Fehler: ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "[]";

  let posts: string[];
  try {
    posts = JSON.parse(text.trim());
  } catch {
    throw new Error("KI-Antwort war kein valides JSON — bitte erneut versuchen.");
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    throw new Error("Keine Posts generiert.");
  }

  const rows = posts
    .filter((p) => typeof p === "string" && p.trim().length > 0 && p.length < 500)
    .map((body) => ({
      type: "post",
      scenario_id: null, // Ambient-Content ist szenario-unabhängig, siehe 0012
      creator_id: creatorId,
      body: body.trim(),
      manipulation_techniques: [],
      target_competencies: [],
      difficulty: 1,
      age_rating: "12_plus",
      status: "draft", // NIE automatisch live — Redaktion muss jeden Post prüfen
      extra: { generatedBy: "ai", theme },
    }));

  const { error } = await supabase.from("content_items").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/ambient-content");
}
