import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const tournament: any = await TournamentService.getTournament(code)
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json(tournament);
}