import { NextResponse } from 'next/server';
import { SearchService } from '@/database/services/search.service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const showFinished = searchParams.get('showFinished') === 'true';

        const cities = await SearchService.getPopularCities(10, showFinished);
        
        return NextResponse.json({
            success: true,
            cities
        });
    } catch (error: any) {
        console.error('Metadata fetch error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch metadata' },
            { status: 500 }
        );
    }
}
