import { NextResponse } from "next/server";
import { createLearningContentItem } from "../../../../scenarios/learning-content-actions";

export async function POST(request: Request, { params }: { params: { scenarioId: string } }) {
  try {
    const body = await request.json();
    const result = body.contentItemId
      ? await (await import("../../../../learning-content-actions")).updateExistingContentMedia(params.scenarioId, body.contentItemId, body)
      : await createLearningContentItem(params.scenarioId, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inhalt konnte nicht erstellt werden." }, { status: 500 });
  }
}
