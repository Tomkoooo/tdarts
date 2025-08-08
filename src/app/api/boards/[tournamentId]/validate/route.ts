import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const { password } = await request.json();
  console.log(tournamentId);
  const isValid = await TournamentService.validateTournamentByPassword(tournamentId, password);
    return NextResponse.json({ isValid });
}