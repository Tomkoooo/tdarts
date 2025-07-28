import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;

        // Call the service method to generate manual knockout
        const result = await TournamentService.generateManualKnockout(code);

        if (!result) {
            throw new BadRequestError('Failed to generate manual knockout');
        }

        return NextResponse.json({
            success: true,
            message: 'Manual knockout generated successfully'
        });
    } catch (error: any) {
        console.error('generateManualKnockout error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to generate manual knockout' 
            }, 
            { status: 400 }
        );
    }
} 