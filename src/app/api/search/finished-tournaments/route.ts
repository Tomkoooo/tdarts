import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

        const tournaments = await SearchService.getFinishedTournaments(limit);

        return NextResponse.json({
            success: true,
            tournaments
        });
    } catch (error: any) {
        console.error('Get finished tournaments error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch finished tournaments' },
            { status: 500 }
        );
    }
}

