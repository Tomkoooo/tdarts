import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
    try {
        const { matchId } = await params;
        const body = await request.json();

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