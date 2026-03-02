import { NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: Request) {
    try {
        const body = await request.json();
        const { query, filters, tab, includeCounts = true, includeMetadata = true } = body;

        // 1. Optionally get counts for ALL tabs (to show badges)
        const counts = includeCounts
            ? await SearchService.getTabCounts(query || '', filters)
            : null;

        // 2. Get specific tab results based on 'tab' param
        let resultsData: { results: any[]; total: number } = { results: [], total: 0 };
        const activeTab = tab || 'tournaments';

        switch (activeTab) {
            case 'global': {
                const globalResults = await SearchService.searchGlobal(query || '', filters);
                const flattened = [
                    ...globalResults.results.tournaments.map((item) => ({ ...item, __entityType: 'tournament' })),
                    ...globalResults.results.players.map((item) => ({ ...item, __entityType: 'player' })),
                    ...globalResults.results.clubs.map((item) => ({ ...item, __entityType: 'club' })),
                    ...globalResults.results.leagues.map((item) => ({ ...item, __entityType: 'league' })),
                ];

                resultsData = { results: flattened, total: globalResults.total };
                break;
            }
            case 'tournaments':
                resultsData = await SearchService.searchTournaments(query || '', filters);
                break;
            case 'players':
                if (filters?.year && filters.year < new Date().getFullYear()) {
                    resultsData = await SearchService.getSeasonTopPlayers(
                        Number(filters.year), 
                        filters.limit || 10, 
                        ((filters.page || 1) - 1) * (filters.limit || 10),
                        filters
                    );
                } else {
                    resultsData = await SearchService.searchPlayers(query || '', filters);
                }
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

        // 3. Optionally get metadata
        const metadata = includeMetadata
            ? await SearchService.getMetadata(query || '', filters)
            : null;

        return NextResponse.json({
            results: resultsData.results,
            pagination: {
                total: resultsData.total,
                page: filters?.page || 1,
                limit: filters?.limit || 10
            },
            counts: counts || undefined,
            metadata: metadata || undefined,
            groupedResults: tab === 'global' && Array.isArray(resultsData.results)
                ? {
                    tournaments: resultsData.results.filter((item) => item.__entityType === 'tournament'),
                    players: resultsData.results.filter((item) => item.__entityType === 'player'),
                    clubs: resultsData.results.filter((item) => item.__entityType === 'club'),
                    leagues: resultsData.results.filter((item) => item.__entityType === 'league'),
                }
                : undefined
        });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export const POST = withApiTelemetry('/api/search', __POST as any);
