import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5;

        const players = await SearchService.getTopPlayers(limit);

        return NextResponse.json({
            success: true,
            players
        });
    } catch (error: any) {
        console.error('Top players error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get top players' },
            { status: 500 }
        );
    }
} 