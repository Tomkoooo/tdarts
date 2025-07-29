import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; boardNumber: string }> }
) {
  try {
    const { tournamentId, boardNumber } = await params;
        
        // Get tournament to find clubId
        const tournament = await TournamentService.getTournament(tournamentId);
        if (!tournament || !tournament.clubId) {
            throw new BadRequestError('Tournament or club not found');
        }
        
        const clubId = tournament.clubId._id.toString();
        const boardNum = parseInt(boardNumber);
        
        // Use MatchService to get all matches for the board
        const matches = await MatchService.getBoardMatches(tournamentId, clubId, boardNum);
        
        return NextResponse.json({ matches });
    } catch (error) {
        console.error('getBoardMatches error:', error);
        return NextResponse.json({ error: 'Failed to get matches' }, { status: 500 });
    }
} 