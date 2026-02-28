import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

        const tournaments = await SearchService.getAllTournaments(limit);

        return NextResponse.json({
            success: true,
            tournaments
        });
    } catch (error: any) {
        console.error('Get all tournaments error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch tournaments' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/search/all-tournaments', __GET as any);
