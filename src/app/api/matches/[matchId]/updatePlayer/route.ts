import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { AuthService } from "@/database/services/auth.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
    try {
        const { matchId } = await params;
        const body = await request.json();
        const token = request.cookies.get('token')?.value;
        if (!token) {
            throw new BadRequestError('Unauthorized');
        }
        const user = await AuthService.verifyToken(token);
        const requesterId = user._id.toString();

        // Validate required fields
        if (!body.tournamentId) {
            throw new BadRequestError('Missing required field: tournamentId');
        }

        if (!body.playerPosition || !['player1', 'player2'].includes(body.playerPosition)) {
            throw new BadRequestError('Missing or invalid field: playerPosition (must be player1 or player2)');
        }

        if (!body.playerId) {
            throw new BadRequestError('Missing required field: playerId');
        }

        // Call the service method to update match player
        const result = await TournamentService.updateMatchPlayer(
            body.tournamentId, 
            requesterId,
            matchId, 
            body.playerPosition, 
            body.playerId
        );

        if (!result) {
            throw new BadRequestError('Failed to update match player');
        }

        return NextResponse.json({
            success: true,
            message: 'Match player updated successfully'
        });
    } catch (error: any) {
        console.error('updateMatchPlayer error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to update match player' 
            }, 
            { status: 400 }
        );
    }
}

export const POST = withApiTelemetry('/api/matches/[matchId]/updatePlayer', __POST as any);
