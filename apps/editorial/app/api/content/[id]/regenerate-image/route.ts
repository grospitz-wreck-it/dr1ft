import { NextResponse } from "next/server";
import { regenerateContentImage } from "../../../../content/actions";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const payload = await request.json().catch(() => ({}));
    const instructions = typeof payload.instructions === "string" ? payload.instructions : "";
    const result = await regenerateContentImage(params.id, instructions);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bild konnte nicht neu generiert werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
