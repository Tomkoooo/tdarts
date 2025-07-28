import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: { tournamentId: string; boardNumber: string } }) {
    try {
        const { tournamentId, boardNumber } = await params;
        const { matchId, legsToWin, startingPlayer } = await request.json();
        
        if (!matchId || !legsToWin || !startingPlayer) {
            throw new BadRequestError('Missing required parameters: matchId, legsToWin, startingPlayer');
        }
        
        const result = await MatchService.startMatch(matchId, legsToWin, startingPlayer);
        
        return NextResponse.json({ success: true, match: result });
    } catch (error) {
        console.error('startMatch error:', error);
        return NextResponse.json({ error: 'Failed to start match' }, { status: 500 });
    }
}
