import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;

        const { knockout, tournamentStatus } = await TournamentService.getTournamentKnockoutView(code);

        // Check if tournament has knockout data
        if (!knockout || knockout.length === 0) {
            return NextResponse.json({
                success: true,
                knockout: null,
                message: 'No knockout data available'
            });
        }

        return NextResponse.json({
            success: true,
            knockout,
            tournamentStatus
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

export const GET = withApiTelemetry('/api/tournaments/[code]/knockout', __GET as any);
