import { NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET() {
    try {
        const tournaments = await SearchService.getActiveTournaments();

        return NextResponse.json({
            success: true,
            tournaments
        });
    } catch (error: any) {
        console.error('Get active tournaments error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch active tournaments' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/search/active-tournaments', __GET as any);
