import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function GET(request: NextRequest, { params }: { params: { tournamentId: string } }) {
    try {
        const { tournamentId } = params;
        const boards = await TournamentService.getBoards(tournamentId);

        return NextResponse.json({ 
            boards
        });
    } catch (error) {
        console.error('getBoards error:', error);
        return NextResponse.json({ error: 'Failed to get boards' }, { status: 500 });
    }
} 