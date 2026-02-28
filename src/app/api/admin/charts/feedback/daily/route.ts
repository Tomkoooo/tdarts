import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { connectMongo } from '@/lib/mongoose';
import { FeedbackModel } from '@/database/models/feedback.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
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

    // Get data for the last 30 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats = [];
    const labels = [];

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await FeedbackModel.countDocuments({
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });

      dailyStats.push(count);
      labels.push(currentDate.toLocaleDateString('hu-HU', { day: '2-digit', month: '2-digit' }));
    }

    console.log('Daily feedback stats response:', { labels, dailyStats });

    return NextResponse.json({
      labels,
      datasets: [{
        label: 'Visszajelzések',
        data: dailyStats,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)'
      }]
    });
  } catch (error) {
    console.error('Error fetching daily feedback stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/feedback/daily', __GET as any);
