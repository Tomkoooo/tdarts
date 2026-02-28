import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        if (!query.trim()) {
            return NextResponse.json({
                success: true,
                suggestions: []
            });
        }

        const suggestions = await SearchService.getSearchSuggestions(query);

        return NextResponse.json({
            success: true,
            suggestions
        });
    } catch (error: any) {
        console.error('Search suggestions error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get suggestions' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/search/suggestions', __GET as any);
