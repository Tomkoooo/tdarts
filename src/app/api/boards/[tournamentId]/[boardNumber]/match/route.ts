import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest, { params }: { params: Promise<{ tournamentId: string; boardNumber: string }> }) {
    try {
        const { tournamentId, boardNumber } = await params;
        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('matchId');

        if (!matchId) {
            throw new BadRequestError('Matchid is required')
        }
        
        // Get tournament to find clubId
        const tournament = await TournamentService.getTournament(tournamentId);
        if (!tournament || !tournament.clubId) {
            throw new BadRequestError('Tournament or club not found');
        }
        
        const clubId = tournament.clubId._id.toString();
        const boardNum = parseInt(boardNumber);
        
        // Use MatchService to get the appropriate match
        const match = await MatchService.getMatch(tournamentId, clubId, boardNum, matchId);
        
        return NextResponse.json({ match });
    } catch (error) {
        console.error('getCurrentMatch error:', error);
        return NextResponse.json({ error: 'Failed to get match' }, { status: 500 });
    }
}

export const GET = withApiTelemetry('/api/boards/[tournamentId]/[boardNumber]/match', __GET as any);
