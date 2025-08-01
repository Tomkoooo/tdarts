import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const body = await request.json();

        // Validate required fields
        if (body.currentRound === undefined || body.currentRound === null) {
            throw new BadRequestError('Missing required field: currentRound');
        }

        // Validate currentRound is a positive integer
        if (!Number.isInteger(body.currentRound) || body.currentRound < 1) {
            throw new BadRequestError('currentRound must be a positive integer');
        }

        console.log(body.currentRound);

        // Call the service method to generate next round
        const result = await TournamentService.generateNextKnockoutRound(code, body.currentRound);

        if (!result) {
            throw new BadRequestError('Failed to generate next round');
        }

        return NextResponse.json({
            success: true,
            message: 'Next round generated successfully'
        });
    } catch (error: any) {
        console.error('generateNextRound error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to generate next round' 
            }, 
            { status: 400 }
        );
    }
} 