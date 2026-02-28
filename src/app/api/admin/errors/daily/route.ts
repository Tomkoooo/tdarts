import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Verify admin access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const showAuthErrors = searchParams.get('showAuthErrors') === 'true';
    const showExpectedErrors = searchParams.get('showExpectedErrors') === 'true';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build match criteria
    const matchCriteria: any = {
      level: 'error',
      timestamp: { $gte: startDate, $lte: endDate }
    };

    // Keep old showAuthErrors switch for backward compatibility.
    if (!showAuthErrors) {
      matchCriteria.category = { $ne: 'auth' };
    }

    // Structured expected_user_error filtering.
    if (!showExpectedErrors) {
      matchCriteria.expected = { $ne: true };
    }

    // Get daily error breakdown
    const dailyErrors = await LogModel.aggregate([
      {
        $match: matchCriteria
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            category: '$category'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          categories: {
            $push: {
              category: '$_id.category',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format the response
    const formattedErrors = dailyErrors.map(day => ({
      date: day._id,
      count: day.totalCount,
      categories: day.categories.reduce((acc: any, cat: any) => {
        acc[cat.category] = cat.count;
        return acc;
      }, {} as Record<string, number>)
    }));

    // Return in ChartData format for DailyChart component
    const labels = formattedErrors.map(day => new Date(day.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }));
    const data = formattedErrors.map(day => day.count);

    return NextResponse.json({
      labels: labels,
      datasets: [{
        label: 'Hibák',
        data: data,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgb(239, 68, 68)'
      }]
    });

  } catch (error) {
    console.error('Error fetching daily errors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily error data' },
      { status: 500 }
    );
  }
}
