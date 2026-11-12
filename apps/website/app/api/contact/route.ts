import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const website = typeof body.website === "string" ? body.website.trim() : "";

    // Honeypot for basic bot filtering. Return success without sending if filled.
    if (website) return NextResponse.json({ ok: true });

    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Bitte gib einen Namen mit maximal 120 Zeichen an." }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse an." }, { status: 400 });
    }
    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json({ error: "Deine Nachricht muss zwischen 10 und 5000 Zeichen lang sein." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error("[DR1FT contact] Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
      return NextResponse.json(
        { error: "Der Nachrichtenversand ist noch nicht vollständig eingerichtet. Bitte versuche es später erneut." },
        { status: 503 }
      );
    }

    const escapedName = name.replace(/[<>]/g, "");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: ["info@pxxl.com"],
        reply_to: email,
        subject: `DR1FT Website-Anfrage von ${escapedName}`,
        text: `Neue Anfrage über die DR1FT-Website\n\nName: ${escapedName}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("[DR1FT contact] Email provider returned an error:", response.status, details.slice(0, 500));
      return NextResponse.json({ error: "Die Nachricht konnte gerade nicht versendet werden. Bitte versuche es später erneut." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DR1FT contact] Request failed:", error);
    return NextResponse.json({ error: "Ungültige Anfrage. Bitte überprüfe deine Eingaben." }, { status: 400 });
  }
}
