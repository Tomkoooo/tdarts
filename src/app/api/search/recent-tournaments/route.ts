import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5;

        const tournaments = await SearchService.getRecentTournaments(limit);

        return NextResponse.json({
            success: true,
            tournaments
        });
    } catch (error: any) {
        console.error('Recent tournaments error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get recent tournaments' },
            { status: 500 }
        );
    }
} 