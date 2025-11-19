import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const type = searchParams.get('type') as 'players' | 'tournaments' | 'clubs' | 'all' || 'all';
        const status = searchParams.get('status') || undefined;
        const format = searchParams.get('format') || undefined;
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const minPlayers = searchParams.get('minPlayers') ? parseInt(searchParams.get('minPlayers')!) : undefined;
        const maxPlayers = searchParams.get('maxPlayers') ? parseInt(searchParams.get('maxPlayers')!) : undefined;
        const location = searchParams.get('location') || undefined;
        const tournamentType = searchParams.get('tournamentType') as 'amateur' | 'open' || undefined;

        const filters = {
            type,
            status,
            format,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            minPlayers,
            maxPlayers,
            location,
            tournamentType
        };

        // Check if we have any active filters
        const hasActiveFilters = status || format || dateFrom || dateTo || minPlayers || maxPlayers || location || tournamentType;

        // Return empty results only if no query AND no filters
        if (!query.trim() && !hasActiveFilters && type === 'all') {
            return NextResponse.json({
                success: true,
                results: {
                    players: [],
                    tournaments: [],
                    clubs: [],
                    totalResults: 0
                }
            });
        }

        const results = await SearchService.search(query, filters);
        
        return NextResponse.json({
            success: true,
            results
        });
    } catch (error: any) {
        console.error('Search error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Search failed' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, filters = {} } = body;

        // Check if we have any active filters
        const hasActiveFilters = 
            filters.status || 
            filters.format || 
            filters.dateFrom || 
            filters.dateTo || 
            filters.minPlayers || 
            filters.maxPlayers || 
            filters.location || 
            filters.tournamentType;

        // Return empty results only if no query AND no filters
        if ((!query || !query.trim()) && !hasActiveFilters && (!filters.type || filters.type === 'all')) {
            return NextResponse.json({
                success: true,
                results: {
                    players: [],
                    tournaments: [],
                    clubs: [],
                    totalResults: 0
                }
            });
        }

        const results = await SearchService.search(query, filters);

        return NextResponse.json({
            success: true,
            results
        });
    } catch (error: any) {
        console.error('Search error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Search failed' },
            { status: 500 }
        );
    }
} 