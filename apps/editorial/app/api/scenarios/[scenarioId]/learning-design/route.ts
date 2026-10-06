import { NextResponse } from "next/server";
import { generateLearningDesign } from "../../../../../../scenarios/learning-design-actions";

export async function POST(
  request: Request,
  { params }: { params: { scenarioId: string } },
) {
  try {
    const config = await request.json();
    const result = await generateLearningDesign(params.scenarioId, config);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
