import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { AuthService } from '@/database/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectMongo();

    // Get the last 12 months of error data
    const months = [];
    const data = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const errorCount = await LogModel.countDocuments({
        level: 'error',
        timestamp: {
          $gte: monthStart,
          $lte: monthEnd
        }
      });

      const monthName = date.toLocaleDateString('hu-HU', { month: 'short' });
      months.push(monthName);
      data.push(errorCount);
    }

    return NextResponse.json({
      labels: months,
      datasets: [{
        label: 'Hibák',
        data: data,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgb(239, 68, 68)'
      }]
    });

  } catch (error) {
    console.error('Error fetching error chart data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
