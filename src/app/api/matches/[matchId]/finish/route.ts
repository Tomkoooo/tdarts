import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
    try {
        const { matchId } = await params;
        const body = await request.json();

        console.log('=== MATCH FINISH API CALL ===');
        console.log('Match ID:', matchId);
        console.log('Received data:', JSON.stringify(body, null, 2));
        console.log('============================');

        // Validate required fields (simplified - only legs won counts needed)
        if (body.player1LegsWon === undefined || body.player1LegsWon === null ||
            body.player2LegsWon === undefined || body.player2LegsWon === null) {
            throw new BadRequestError('Missing required fields: player1LegsWon, player2LegsWon');
        }

        // Validate no tie
        if (body.player1LegsWon === body.player2LegsWon) {
            throw new BadRequestError('Match cannot end in a tie');
        }

        // Extract admin userId if this is a manual change
        let adminId: string | null = null;
        if (body.isManual) {
            const { AuthorizationService } = await import('@/database/services/authorization.service');
            adminId = await AuthorizationService.getUserIdFromRequest(request);
            
            if (!adminId) {
                throw new BadRequestError('Admin authentication required for manual changes');
            }
        }

        // Call the service method to finish the match
        // Backend will calculate all stats from saved legs
        // If allowManualFinish is true, skip leg validation (for admin manual entry)
        const result = await MatchService.finishMatch(matchId, {
            player1LegsWon: body.player1LegsWon,
            player2LegsWon: body.player2LegsWon,
            allowManualFinish: body.allowManualFinish || false,
            isManual: body.isManual || false,
            adminId: adminId
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