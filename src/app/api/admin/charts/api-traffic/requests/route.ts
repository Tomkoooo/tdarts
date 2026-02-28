import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';
import {
  formatBucketLabel,
  resolveGranularity,
  resolveRouteFilters,
  resolveTimeRange,
  toDateTruncId,
} from '@/lib/admin-telemetry';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const timeZone = searchParams.get('tz') || 'UTC';
    const granularity = resolveGranularity(searchParams);
    const { startDate, endDate } = resolveTimeRange(searchParams);
    const { routeKey, method } = resolveRouteFilters(searchParams);
    const matchBase: Record<string, any> = {};
    if (routeKey) matchBase.routeKey = routeKey;
    if (method) matchBase.method = method;

    const series = await ApiRequestMetricModel.aggregate([
      {
        $match: {
          ...matchBase,
          bucket: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: toDateTruncId(granularity, timeZone), count: { $sum: '$count' } } },
      { $sort: { _id: 1 } },
    ]);

    const allTimeAvgAggregation = await ApiRequestMetricModel.aggregate([
      { $match: matchBase },
      { $group: { _id: toDateTruncId(granularity, timeZone), count: { $sum: '$count' } } },
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

    const labels = series.map((s) => formatBucketLabel(s._id, timeZone, granularity));
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

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/requests', __GET as any);
