import { NextRequest, NextResponse } from 'next/server';
import { ErrorService } from '@/database/services/error.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const level = searchParams.get('level') as any;
    const category = searchParams.get('category') as any;
    const userId = searchParams.get('userId');
    const clubId = searchParams.get('clubId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const filters: any = {
      limit,
      skip
    };

    if (level) filters.level = level;
    if (category) filters.category = category;
    if (userId) filters.userId = userId;
    if (clubId) filters.clubId = clubId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const logs = await ErrorService.getLogs(filters);

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
