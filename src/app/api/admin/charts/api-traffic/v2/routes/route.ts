import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { buildRouteSearchRegex, ensureAdmin, parseTelemetryFilters } from '../shared';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const { startDate, endDate, method, routeSearch } = parseTelemetryFilters(searchParams);
    const search = (searchParams.get('search') || routeSearch || '').trim();
    const onlyProblematic = searchParams.get('onlyProblematic') === 'true';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || 20)));
    const skip = (page - 1) * limit;
    const sortBy = (searchParams.get('sortBy') || 'errors').toLowerCase();
    const sortDir = (searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    const windowMs = endDate.getTime() - startDate.getTime();
    const baselineStart = new Date(startDate.getTime() - windowMs);
    const match: Record<string, unknown> = { bucket: { $gte: baselineStart, $lte: endDate } };
    if (method) match.method = method;
    if (search) {
      match.routeKey = { $regex: buildRouteSearchRegex(search) || '', $options: 'i' };
    }

    const sortKeyMap: Record<string, string> = {
      route: '_id.routeKey',
      calls: 'totalCalls',
      errors: 'totalErrors',
      errorrate: 'errorRate',
      latency: 'avgLatencyMs',
      traffic: 'totalTrafficBytes',
      lastseen: 'lastSeen',
    };
    const sortKey = sortKeyMap[sortBy] || 'totalErrors';

    const groupedRows = await ApiRequestMetricModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { routeKey: '$routeKey', method: '$method' },
          totalCalls: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$count', 0] } },
          totalErrors: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$errorCount', 0] } },
          totalDurationMs: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$totalDurationMs', 0] } },
          totalRequestBytes: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$totalRequestBytes', 0] } },
          totalResponseBytes: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$totalResponseBytes', 0] } },
          baselineCalls: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$count', 0] } },
          baselineErrors: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$errorCount', 0] } },
          baselineDurationMs: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$totalDurationMs', 0] } },
          baselineRequestBytes: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$totalRequestBytes', 0] } },
          baselineResponseBytes: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$totalResponseBytes', 0] } },
          lastSeen: { $max: '$bucket' },
        },
      },
      {
        $addFields: {
          totalTrafficBytes: { $add: ['$totalRequestBytes', '$totalResponseBytes'] },
          avgLatencyMs: {
            $cond: [{ $gt: ['$totalCalls', 0] }, { $divide: ['$totalDurationMs', '$totalCalls'] }, 0],
          },
          errorRate: {
            $cond: [{ $gt: ['$totalCalls', 0] }, { $multiply: [{ $divide: ['$totalErrors', '$totalCalls'] }, 100] }, 0],
          },
          baselineAvgLatencyMs: {
            $cond: [{ $gt: ['$baselineCalls', 0] }, { $divide: ['$baselineDurationMs', '$baselineCalls'] }, 0],
          },
          baselineErrorRate: {
            $cond: [{ $gt: ['$baselineCalls', 0] }, { $multiply: [{ $divide: ['$baselineErrors', '$baselineCalls'] }, 100] }, 0],
          },
          avgIncomingPacketBytes: {
            $cond: [{ $gt: ['$totalCalls', 0] }, { $divide: ['$totalRequestBytes', '$totalCalls'] }, 0],
          },
          avgOutgoingPacketBytes: {
            $cond: [{ $gt: ['$totalCalls', 0] }, { $divide: ['$totalResponseBytes', '$totalCalls'] }, 0],
          },
          baselineAvgPacketBytes: {
            $cond: [
              { $gt: ['$baselineCalls', 0] },
              { $divide: [{ $add: ['$baselineRequestBytes', '$baselineResponseBytes'] }, '$baselineCalls'] },
              0,
            ],
          },
        },
      },
      ...(onlyProblematic ? [{ $match: { $or: [{ totalErrors: { $gt: 0 } }, { avgLatencyMs: { $gte: 350 } }] } }] : []),
      { $project: { _id: 0, routeKey: '$_id.routeKey', method: '$_id.method', totalCalls: 1, totalErrors: 1, errorRate: 1, avgLatencyMs: 1, totalRequestBytes: 1, totalResponseBytes: 1, totalTrafficBytes: 1, avgPacketBytes: { $cond: [{ $gt: ['$totalCalls', 0] }, { $divide: ['$totalTrafficBytes', '$totalCalls'] }, 0] }, baselineAvgLatencyMs: 1, baselineErrorRate: 1, avgIncomingPacketBytes: 1, avgOutgoingPacketBytes: 1, baselineAvgPacketBytes: 1, lastSeen: 1 } },
    ]);
    const normalized = groupedRows.map((row) => {
      const baselineAvgLatencyMs = Number(row.baselineAvgLatencyMs || 0);
      const avgLatencyMs = Number(row.avgLatencyMs || 0);
      const baselineErrorRate = Number(row.baselineErrorRate || 0);
      const errorRate = Number(row.errorRate || 0);
      const avgPacketBytes = Number(row.avgPacketBytes || 0);
      const baselineAvgPacketBytes = Number(row.baselineAvgPacketBytes || 0);
      return {
        ...row,
        errorRate: Number(errorRate.toFixed(2)),
        avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
        avgPacketBytes: Math.round(avgPacketBytes),
        baselineAvgLatencyMs: Number(baselineAvgLatencyMs.toFixed(2)),
        latencyRatio: baselineAvgLatencyMs > 0 ? Number((avgLatencyMs / baselineAvgLatencyMs).toFixed(2)) : 0,
        baselineErrorRate: Number(baselineErrorRate.toFixed(2)),
        errorRateRatio: baselineErrorRate > 0 ? Number((errorRate / baselineErrorRate).toFixed(2)) : 0,
        avgIncomingPacketBytes: Math.round(Number(row.avgIncomingPacketBytes || 0)),
        avgOutgoingPacketBytes: Math.round(Number(row.avgOutgoingPacketBytes || 0)),
        baselineAvgPacketBytes: Math.round(baselineAvgPacketBytes),
      };
    });

    const sorted = [...normalized].sort((a, b) => {
      const aVal = (a as Record<string, any>)[sortKey] ?? 0;
      const bVal = (b as Record<string, any>)[sortKey] ?? 0;
      if (aVal === bVal) return `${a.routeKey}${a.method}`.localeCompare(`${b.routeKey}${b.method}`);
      return sortDir === 1 ? (aVal > bVal ? 1 : -1) : aVal > bVal ? -1 : 1;
    });
    const total = sorted.length;
    const data = sorted.slice(skip, skip + limit);

    const insights = {
      highBaselineLatency: [...normalized]
        .filter((row) => row.baselineAvgLatencyMs > 0)
        .sort((a, b) => b.baselineAvgLatencyMs - a.baselineAvgLatencyMs)
        .slice(0, 5),
      latencyRegressed: [...normalized]
        .filter((row) => row.latencyRatio >= 1.25 && row.avgLatencyMs >= 200)
        .sort((a, b) => b.latencyRatio - a.latencyRatio)
        .slice(0, 5),
      largestIncomingPackets: [...normalized]
        .sort((a, b) => b.avgIncomingPacketBytes - a.avgIncomingPacketBytes)
        .slice(0, 5),
      largestOutgoingPackets: [...normalized]
        .sort((a, b) => b.avgOutgoingPacketBytes - a.avgOutgoingPacketBytes)
        .slice(0, 5),
      risingErrorRate: [...normalized]
        .filter((row) => row.errorRateRatio >= 1.5 && row.errorRate >= 1)
        .sort((a, b) => b.errorRateRatio - a.errorRateRatio)
        .slice(0, 5),
    };

    return NextResponse.json({
      success: true,
      data,
      insights,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching telemetry v2 routes:', error);
    return NextResponse.json({ error: 'Failed to fetch telemetry routes' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/v2/routes', __GET as any);
