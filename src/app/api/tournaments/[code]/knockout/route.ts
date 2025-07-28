import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;

        // Get tournament with knockout data
        const tournament = await TournamentService.getTournament(code);

        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Check if tournament has knockout data
        if (!tournament.knockout || tournament.knockout.length === 0) {
            return NextResponse.json({
                success: true,
                knockout: null,
                message: 'No knockout data available'
            });
        }

        return NextResponse.json({
            success: true,
            knockout: tournament.knockout,
            tournamentStatus: tournament.tournamentSettings.status
        });
    } catch (error: any) {
        console.error('getKnockout error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to get knockout data' 
            }, 
            { status: 400 }
        );
    }
} 