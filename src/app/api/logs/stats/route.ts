import { NextRequest, NextResponse } from 'next/server';
import { ErrorService } from '@/database/services/error.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const stats = await ErrorService.getErrorStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching error stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch error stats' },
      { status: 500 }
    );
  }
}
