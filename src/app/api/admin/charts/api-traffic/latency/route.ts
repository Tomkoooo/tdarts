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
      {
        $group: {
          _id: toDateTruncId(granularity, timeZone),
          totalDurationMs: { $sum: '$totalDurationMs' },
          count: { $sum: '$count' },
          maxDurationMs: { $max: '$maxDurationMs' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const allTimeAggregation = await ApiRequestMetricModel.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id: null,
          totalDurationMs: { $sum: '$totalDurationMs' },
          totalCount: { $sum: '$count' },
        },
      },
    ]);

    const allTimeAvgMs =
      allTimeAggregation.length > 0 && allTimeAggregation[0].totalCount > 0
        ? allTimeAggregation[0].totalDurationMs / allTimeAggregation[0].totalCount
        : 0;

    const labels = series.map((s) => formatBucketLabel(s._id, timeZone, granularity));
    const data = series.map((s) => {
      const avg = s.count > 0 ? s.totalDurationMs / s.count : 0;
      return Math.round(avg * 100) / 100;
    });
    const avgLine = series.map(() => Math.round(allTimeAvgMs * 100) / 100);

    return NextResponse.json({
      labels,
      datasets: [
        {
          label: 'Átlagos API késleltetés (ms)',
          data,
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          borderColor: 'rgb(245, 158, 11)',
        },
        {
          label: 'All-time átlag latency (ms)',
          data: avgLine,
          backgroundColor: 'rgba(107, 114, 128, 0.05)',
          borderColor: 'rgb(107, 114, 128)',
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching api traffic latency chart:', error);
    return NextResponse.json({ error: 'Failed to fetch api latency chart data' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/latency', __GET as any);
