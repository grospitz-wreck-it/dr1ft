import { NextResponse } from "next/server";
import { generateScenarioContent } from "../../../../scenarios/actions";

export async function POST(
  _request: Request,
  { params }: { params: { scenarioId: string } },
) {
  try {
    const result = await generateScenarioContent(params.scenarioId, false);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content-Generierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
