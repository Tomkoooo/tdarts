import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import jwt from 'jsonwebtoken';

function resolveTimeRange(searchParams: URLSearchParams): { startDate: Date; endDate: Date } {
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (start && end) {
    return {
      startDate: new Date(start),
      endDate: new Date(end),
    };
  }

  const range = searchParams.get('range') || '24h';
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (range) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 1);
      break;
  }
  return { startDate, endDate };
}

export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)));
    const { startDate, endDate } = resolveTimeRange(searchParams);

    const topRoutes = await ApiRequestMetricModel.aggregate([
      { $match: { bucket: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { routeKey: '$routeKey', method: '$method' },
          count: { $sum: '$count' },
          errorCount: { $sum: '$errorCount' },
          totalDurationMs: { $sum: '$totalDurationMs' },
          maxDurationMs: { $max: '$maxDurationMs' },
          totalRequestBytes: { $sum: '$totalRequestBytes' },
          totalResponseBytes: { $sum: '$totalResponseBytes' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const data = topRoutes.map((row) => {
      const avgDurationMs = row.count > 0 ? row.totalDurationMs / row.count : 0;
      const errorRate = row.count > 0 ? (row.errorCount / row.count) * 100 : 0;
      const totalTrafficKb = ((row.totalRequestBytes || 0) + (row.totalResponseBytes || 0)) / 1024;
      return {
        routeKey: row._id.routeKey,
        method: row._id.method,
        count: row.count,
        errorCount: row.errorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        avgDurationMs: Math.round(avgDurationMs * 100) / 100,
        maxDurationMs: row.maxDurationMs || 0,
        totalTrafficKb: Math.round(totalTrafficKb * 100) / 100,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching api traffic top routes:', error);
    return NextResponse.json({ error: 'Failed to fetch top api routes' }, { status: 500 });
  }
}
