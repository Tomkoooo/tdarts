import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const skip = (page - 1) * limit;

        const result = await SearchService.getTopPlayers(limit, skip);

        return NextResponse.json({
            success: true,
            players: result.players,
            total: result.total,
            page,
            limit
        });
    } catch (error: any) {
        console.error('Top players error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get top players' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/search/top-players', __GET as any);
