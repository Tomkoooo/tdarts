import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
    try {
        const { matchId } = await params;
        const body = await request.json();

        // Validate required fields
        if (body.player1LegsWon === undefined || body.player1LegsWon === null ||
            body.player2LegsWon === undefined || body.player2LegsWon === null ||
            !body.player1Stats || !body.player2Stats) {
            throw new BadRequestError('Missing required fields: player1LegsWon, player2LegsWon, player1Stats, player2Stats');
        }

        // Validate no tie
        if (body.player1LegsWon === body.player2LegsWon) {
            throw new BadRequestError('Match cannot end in a tie');
        }

        // Call the service method to finish the match
        const result = await MatchService.finishMatch(matchId, {
            player1LegsWon: body.player1LegsWon,
            player2LegsWon: body.player2LegsWon,
            player1Stats: body.player1Stats,
            player2Stats: body.player2Stats
        });

        if (!result) {
            throw new BadRequestError('Failed to finish match');
        }

        // For knockout matches, check if we need to generate next round
        if (result.type === 'knockout') {
            // The TournamentService.updateBoardStatusAfterMatch method will handle
            // automatic next round generation if all matches in the current round are finished
            await TournamentService.updateBoardStatusAfterMatch(matchId);
        }

        return NextResponse.json({
            success: true,
            message: 'Match finished successfully',
            match: result
        });
    } catch (error: any) {
        console.error('finish match error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to finish match' 
            }, 
            { status: 400 }
        );
    }
} 