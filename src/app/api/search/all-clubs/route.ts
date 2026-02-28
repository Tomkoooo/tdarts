import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

        const clubs = await SearchService.getAllClubs(limit);

        return NextResponse.json({
            success: true,
            clubs: clubs.map(club => ({
                _id: club._id,
                name: club.name,
                description: club.description,
                location: club.location,
                memberCount: club.members?.length || 0,
                moderatorCount: club.moderators?.length || 0,
                boardCount: 0,
                type: 'club'
            }))
        });
    } catch (error: any) {
        console.error('Get all clubs error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch clubs' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/search/all-clubs', __GET as any);
