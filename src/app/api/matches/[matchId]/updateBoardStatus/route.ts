import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
    try {
        const { matchId } = await params;

        // Call the service method to update board status
        const result = await TournamentService.updateBoardStatusAfterMatch(matchId);

        if (!result) {
            throw new BadRequestError('Failed to update board status');
        }

        return NextResponse.json({
            success: true,
            message: 'Board status updated successfully'
        });
    } catch (error: any) {
        console.error('updateBoardStatus error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to update board status' 
            }, 
            { status: 400 }
        );
    }
} 