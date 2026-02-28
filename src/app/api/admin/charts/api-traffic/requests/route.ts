import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import jwt from 'jsonwebtoken';

function formatLabel(bucket: string, timeZone: string) {
  return new Date(bucket).toLocaleString('hu-HU', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
    const timeZone = searchParams.get('tz') || 'UTC';
    const { startDate, endDate } = resolveTimeRange(searchParams);

    const series = await ApiRequestMetricModel.aggregate([
      { $match: { bucket: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$bucket', count: { $sum: '$count' } } },
      { $sort: { _id: 1 } },
    ]);

    const allTimeAvgAggregation = await ApiRequestMetricModel.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: '$count' },
          bucketCount: { $sum: 1 },
        },
      },
    ]);

    const allTimeAvgPerBucket =
      allTimeAvgAggregation.length > 0 && allTimeAvgAggregation[0].bucketCount > 0
        ? allTimeAvgAggregation[0].totalCount / allTimeAvgAggregation[0].bucketCount
        : 0;

    const labels = series.map((s) => formatLabel(s._id, timeZone));
    const data = series.map((s) => s.count);
    const avgLine = series.map(() => Math.round(allTimeAvgPerBucket * 100) / 100);

    return NextResponse.json({
      labels,
      datasets: [
        {
          label: 'API hívások',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
        },
        {
          label: 'All-time átlag / bucket',
          data: avgLine,
          backgroundColor: 'rgba(107, 114, 128, 0.05)',
          borderColor: 'rgb(107, 114, 128)',
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching api traffic requests chart:', error);
    return NextResponse.json({ error: 'Failed to fetch api request chart data' }, { status: 500 });
  }
}
