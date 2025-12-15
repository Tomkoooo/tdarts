import { NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query, filters, tab } = body;

        // 1. Get Counts for ALL tabs (to show badges)
        const counts = await SearchService.getTabCounts(query || '', filters);

        // 2. Get specific tab results based on 'tab' param
        let resultsData: { results: any[]; total: number } = { results: [], total: 0 };
        const activeTab = tab || 'tournaments';

        switch (activeTab) {
            case 'tournaments':
                resultsData = await SearchService.searchTournaments(query || '', filters);
                break;
            case 'players':
                resultsData = await SearchService.searchPlayers(query || '', filters);
                break;
            case 'clubs':
                resultsData = await SearchService.searchClubs(query || '', filters);
                break;
            case 'leagues':
                resultsData = await SearchService.searchLeagues(query || '', filters);
                break;
            default:
                resultsData = await SearchService.searchTournaments(query || '', filters);
        }

        // 3. Get Metadata
        const metadata = await SearchService.getMetadata(query || '', filters);

        return NextResponse.json({
            results: resultsData.results,
            pagination: {
                total: resultsData.total,
                page: filters?.page || 1,
                limit: filters?.limit || 10
            },
            counts: counts,
            metadata: metadata
        });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}