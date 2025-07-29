import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const body = await request.json();

        // Validate required fields
        if (body.useSeededPlayers === undefined || body.useSeededPlayers === null) {
            throw new BadRequestError('Missing required field: useSeededPlayers');
        }

        if (body.seededPlayersCount === undefined || body.seededPlayersCount === null) {
            throw new BadRequestError('Missing required field: seededPlayersCount');
        }

        // Get tournament to check format
        const tournament = await TournamentService.getTournament(code);
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        const format = tournament.tournamentSettings?.format || 'group_knockout';

        // Validate playersCount only for group_knockout format
        if (format === 'group_knockout') {
            if (body.playersCount === undefined || body.playersCount === null) {
                throw new BadRequestError('Missing required field: playersCount for group_knockout format');
            }

            // Validate playersCount is a power of 2
            if (!Number.isInteger(Math.log2(body.playersCount))) {
                throw new BadRequestError('playersCount must be a power of 2 (2, 4, 8, 16, 32)');
            }

            // Validate seeded players count
            if (body.useSeededPlayers && body.seededPlayersCount > body.playersCount) {
                throw new BadRequestError('seededPlayersCount cannot be greater than playersCount');
            }
        }

        // Call the service method to generate knockout
        const result = await TournamentService.generateKnockout(code, {
            playersCount: body.playersCount,
            useSeededPlayers: body.useSeededPlayers,
            seededPlayersCount: body.seededPlayersCount
        });

        if (!result) {
            throw new BadRequestError('Failed to generate knockout rounds');
        }

        return NextResponse.json({
            success: true,
            message: 'Knockout rounds generated successfully'
        });
    } catch (error: any) {
        console.error('generateKnockout error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to generate knockout rounds' 
            }, 
            { status: 400 }
        );
    }
}
