import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { ClubService } from "@/database/services/club.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const userId = request.headers.get('x-user-id');
  const tournament: any = await TournamentService.getTournament(code)
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (userId) {
    const userClubRole = await ClubService.getUserRoleInClub(userId, tournament.clubId._id);
    const userPlayerStatus = await TournamentService.getPlayerStatusInTournament(code, userId);
    return NextResponse.json({
      userClubRole: userClubRole,
      userPlayerStatus: userPlayerStatus
    });
  }
  return NextResponse.json('guest');
}