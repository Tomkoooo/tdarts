
import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { z } from 'zod';
import { withApiTelemetry } from '@/lib/api-telemetry';

const updateBoardSchema = z.object({
    name: z.string().optional(),
    scoliaSerialNumber: z.string().optional(),
    scoliaAccessToken: z.string().optional(),
});

async function __PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ code: string; boardNumber: string }> }
) {
    try {
         const { code, boardNumber } = await params;

        const body = await req.json();
        
        const validatedData = updateBoardSchema.parse(body);
        const boardNum = parseInt(boardNumber);

        if (isNaN(boardNum)) {
             return NextResponse.json({ error: 'Invalid board number' }, { status: 400 });
        }

        // We need to implement updateBoard in TournamentService
        const updatedTournament = await TournamentService.updateBoard(code, boardNum, validatedData as { 
            name?: string; 
            scoliaSerialNumber?: string; 
            scoliaAccessToken?: string 
        });

        return NextResponse.json({ success: true, tournament: updatedTournament });
    } catch (error: any) {
        console.error('Error updating board:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update board' }, 
            { status: 500 }
        );
    }
}

export const PATCH = withApiTelemetry('/api/tournaments/[code]/boards/[boardNumber]', __PATCH as any);
