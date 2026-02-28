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

function granularitySeconds(granularity: 'minute' | 'hour' | 'day'): number {
  if (granularity === 'hour') return 3600;
  if (granularity === 'day') return 86400;
  return 60;
}

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
          totalRequestBytes: { $sum: '$totalRequestBytes' },
          totalResponseBytes: { $sum: '$totalResponseBytes' },
          totalCount: { $sum: '$count' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const allTimePerBucket = await ApiRequestMetricModel.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id: toDateTruncId(granularity, timeZone),
          totalRequestBytes: { $sum: '$totalRequestBytes' },
          totalResponseBytes: { $sum: '$totalResponseBytes' },
          totalCount: { $sum: '$count' },
        },
      },
    ]);

    const allTimeAggregation = allTimePerBucket.reduce(
      (acc, row) => {
        acc.totalRequestBytes += row.totalRequestBytes || 0;
        acc.totalResponseBytes += row.totalResponseBytes || 0;
        acc.totalCount += row.totalCount || 0;
        acc.bucketCount += 1;
        return acc;
      },
      {
        totalRequestBytes: 0,
        totalResponseBytes: 0,
        totalCount: 0,
        bucketCount: 0,
      }
    );

    const allTimeAvgRequestKb =
      allTimeAggregation.bucketCount > 0
        ? allTimeAggregation.totalRequestBytes / 1024 / allTimeAggregation.bucketCount
        : 0;

    const allTimeAvgResponseKb =
      allTimeAggregation.bucketCount > 0
        ? allTimeAggregation.totalResponseBytes / 1024 / allTimeAggregation.bucketCount
        : 0;

    const allTimeAvgTotalKb =
      allTimeAggregation.bucketCount > 0
        ? (allTimeAggregation.totalRequestBytes + allTimeAggregation.totalResponseBytes) / 1024 / allTimeAggregation.bucketCount
        : 0;

    const labels = series.map((s) => formatBucketLabel(s._id, timeZone, granularity));
    const requestData = series.map((s) => Math.round(((s.totalRequestBytes || 0) / 1024) * 100) / 100);
    const responseData = series.map((s) => Math.round(((s.totalResponseBytes || 0) / 1024) * 100) / 100);
    const throughputBytesData = series.map((s) => (s.totalRequestBytes || 0) + (s.totalResponseBytes || 0));
    const throughputBytesPerSecondData = throughputBytesData.map((value) =>
      Math.round((value / granularitySeconds(granularity)) * 100) / 100
    );
    const avgRequestLine = series.map(() => Math.round(allTimeAvgRequestKb * 100) / 100);
    const avgResponseLine = series.map(() => Math.round(allTimeAvgResponseKb * 100) / 100);
    const avgTotalLine = series.map(() => Math.round(allTimeAvgTotalKb * 100) / 100);

    const selectedTotalRequestBytes = series.reduce((acc, item) => acc + (item.totalRequestBytes || 0), 0);
    const selectedTotalResponseBytes = series.reduce((acc, item) => acc + (item.totalResponseBytes || 0), 0);
    const selectedTotalCount = series.reduce((acc, item) => acc + (item.totalCount || 0), 0);
    const selectedTotalMovedBytes = selectedTotalRequestBytes + selectedTotalResponseBytes;

    return NextResponse.json({
      labels,
      datasets: [
        {
          label: 'Incoming payload (KB)',
          data: requestData,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgb(16, 185, 129)',
        },
        {
          label: 'Outgoing payload (KB)',
          data: responseData,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
        },
        {
          label: 'All-time avg incoming (KB)',
          data: avgRequestLine,
          backgroundColor: 'rgba(107, 114, 128, 0.05)',
          borderColor: 'rgb(107, 114, 128)',
        },
        {
          label: 'All-time avg outgoing (KB)',
          data: avgResponseLine,
          backgroundColor: 'rgba(107, 114, 128, 0.05)',
          borderColor: 'rgb(99, 102, 241)',
        },
        {
          label: 'All-time avg total (KB)',
          data: avgTotalLine,
          backgroundColor: 'rgba(107, 114, 128, 0.05)',
          borderColor: 'rgb(156, 163, 175)',
        },
      ],
      throughput: {
        labels,
        datasets: [
          {
            label: `Összes forgalom (bytes / ${granularity})`,
            data: throughputBytesData,
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: 'rgb(99, 102, 241)',
          },
          {
            label: `Átlagos forgalom (bytes/sec)`,
            data: throughputBytesPerSecondData,
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            borderColor: 'rgb(14, 165, 233)',
          },
        ],
      },
      summary: {
        totalRequestBytes: selectedTotalRequestBytes,
        totalResponseBytes: selectedTotalResponseBytes,
        totalMovedBytes: selectedTotalMovedBytes,
        totalRequests: selectedTotalCount,
        avgRequestPackageBytes: selectedTotalCount > 0 ? Math.round(selectedTotalRequestBytes / selectedTotalCount) : 0,
        avgResponsePackageBytes: selectedTotalCount > 0 ? Math.round(selectedTotalResponseBytes / selectedTotalCount) : 0,
        avgTotalPackageBytes: selectedTotalCount > 0 ? Math.round(selectedTotalMovedBytes / selectedTotalCount) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching api traffic payload chart:', error);
    return NextResponse.json({ error: 'Failed to fetch api payload chart data' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/payload', __GET as any);
