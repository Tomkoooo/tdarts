import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const tournament = await TournamentService.getTournament(code);
        
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        return NextResponse.json({
            success: true,
            knockoutMethod: tournament.tournamentSettings?.knockoutMethod || 'automatic'
        });
    } catch (error: any) {
        console.error('getKnockoutMethod error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to get knockout method' 
            }, 
            { status: 400 }
        );
    }
} 