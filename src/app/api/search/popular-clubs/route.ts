import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5;

        const clubs = await SearchService.getPopularClubs(limit);

        return NextResponse.json({
            success: true,
            clubs
        });
    } catch (error: any) {
        console.error('Popular clubs error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get popular clubs' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/search/popular-clubs', __GET as any);
