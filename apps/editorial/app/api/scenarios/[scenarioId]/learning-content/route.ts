import { NextResponse } from "next/server";
import { generateLearningContent } from "../../../../scenarios/learning-content-actions";

export async function POST(
  request: Request,
  { params }: { params: { scenarioId: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await generateLearningContent(params.scenarioId, body?.learningDesignId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content-Generierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
