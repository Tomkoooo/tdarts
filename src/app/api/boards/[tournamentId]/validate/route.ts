import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { password } = await request.json();
  console.log(code);
  const isValid = await TournamentService.validateTournamentByPassword(code, password);
    return NextResponse.json({ isValid });
}