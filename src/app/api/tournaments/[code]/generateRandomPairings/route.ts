import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const body = await request.json();

        // Validate required fields
        if (body.round === undefined || body.round === null) {
            throw new BadRequestError('Missing required field: round');
        }

        if (!body.selectedPlayerIds || !Array.isArray(body.selectedPlayerIds)) {
            throw new BadRequestError('Missing or invalid field: selectedPlayerIds');
        }

        if (body.selectedPlayerIds.length < 2) {
            throw new BadRequestError('At least 2 players must be selected for pairing');
        }

        // Call the service method to generate random pairings
        const result = await TournamentService.generateRandomPairings(code, body.round, body.selectedPlayerIds);

        if (!result || result.length === 0) {
            throw new BadRequestError('Failed to generate random pairings');
        }

        return NextResponse.json({
            success: true,
            message: `${result.length} matches created with random pairings`,
            matches: result
        });
    } catch (error: any) {
        console.error('generateRandomPairings error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to generate random pairings' 
            }, 
            { status: 400 }
        );
    }
} 