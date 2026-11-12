import { NextResponse } from "next/server";
import { createLearningContentItem, updateExistingContentMedia } from "../../../../scenarios/learning-content-actions";

export async function POST(request: Request, { params }: { params: { scenarioId: string } }) {
  try {
    const body = await request.json();
    const result = body.contentItemId
      ? await updateExistingContentMedia(params.scenarioId, body.contentItemId, body)
      : await createLearningContentItem(params.scenarioId, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inhalt konnte nicht erstellt werden." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { scenarioId: string } }) {
  try {
    const body = await request.json();
    const result = await updateExistingContentMedia(params.scenarioId, String(body.contentItemId ?? ""), { remove: true });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Medium konnte nicht entfernt werden." }, { status: 500 });
  }
}
