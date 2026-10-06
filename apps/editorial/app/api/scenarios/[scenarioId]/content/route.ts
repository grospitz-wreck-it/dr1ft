import { NextResponse } from "next/server";
import { generateScenarioContent } from "../../../../../../scenarios/actions";

export async function POST(
  _request: Request,
  { params }: { params: { scenarioId: string } },
) {
  try {
    await generateScenarioContent(params.scenarioId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content-Generierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
