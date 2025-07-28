import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function GET(request: NextRequest, { params }: { params: { tournamentId: string; boardNumber: string } }) {
    try {
        const { tournamentId, boardNumber } = await params;
        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('matchId');
        
        // Get tournament to find clubId
        const tournament = await TournamentService.getTournament(tournamentId);
        if (!tournament || !tournament.clubId) {
            throw new BadRequestError('Tournament or club not found');
        }
        
        const clubId = tournament.clubId._id.toString();
        const boardNum = parseInt(boardNumber);
        
        // Use MatchService to get the appropriate match
        const match = await MatchService.getMatch(tournamentId, clubId, boardNum, matchId || undefined);
        
        return NextResponse.json({ match });
    } catch (error) {
        console.error('getCurrentMatch error:', error);
        return NextResponse.json({ error: 'Failed to get match' }, { status: 500 });
    }
}