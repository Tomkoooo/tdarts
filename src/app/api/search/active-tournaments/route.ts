import { NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';

export async function GET() {
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

