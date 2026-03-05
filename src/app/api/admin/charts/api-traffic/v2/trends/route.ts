import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { formatBucketLabel, toDateTruncId } from '@/lib/admin-telemetry';
import { ensureAdmin, parseTelemetryFilters } from '../shared';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const { startDate, endDate, routeKey, method, granularity, timeZone } = parseTelemetryFilters(searchParams);
    const match: Record<string, unknown> = { bucket: { $gte: startDate, $lte: endDate } };
    if (routeKey) match.routeKey = routeKey;
    if (method) match.method = method;
    const windowMs = endDate.getTime() - startDate.getTime();
    const baselineStart = new Date(startDate.getTime() - windowMs);
    const baselineEnd = startDate;
    const baselineMatch: Record<string, unknown> = { bucket: { $gte: baselineStart, $lt: baselineEnd } };
    if (routeKey) baselineMatch.routeKey = routeKey;
    if (method) baselineMatch.method = method;

    const [rows, baselineByBucketRows, baselineSummaryRows, currentSummaryRows] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: toDateTruncId(granularity, timeZone),
            calls: { $sum: '$count' },
            errors: { $sum: '$errorCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            totalRequestBytes: { $sum: '$totalRequestBytes' },
            totalResponseBytes: { $sum: '$totalResponseBytes' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ApiRequestMetricModel.aggregate([
        { $match: baselineMatch },
        { $group: { _id: toDateTruncId(granularity, timeZone), calls: { $sum: '$count' } } },
      ]),
      ApiRequestMetricModel.aggregate([
        { $match: baselineMatch },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalDurationMs: { $sum: '$totalDurationMs' },
          },
        },
      ]),
      ApiRequestMetricModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalDurationMs: { $sum: '$totalDurationMs' },
          },
        },
      ]),
    ]);
    const baselineSummary = baselineSummaryRows[0] || {};
    const currentSummary = currentSummaryRows[0] || {};
    const baselineCalls =
      baselineByBucketRows.length > 0
        ? baselineByBucketRows.reduce((acc, row) => acc + Number(row.calls || 0), 0) / baselineByBucketRows.length
        : 0;
    const baselineLatencyRaw =
      Number(baselineSummary.totalCalls || 0) > 0
        ? Number(baselineSummary.totalDurationMs || 0) / Number(baselineSummary.totalCalls || 1)
        : 0;
    const currentWindowAvgLatency =
      Number(currentSummary.totalCalls || 0) > 0
        ? Number(currentSummary.totalDurationMs || 0) / Number(currentSummary.totalCalls || 1)
        : 0;
    // Fallback: if there is no baseline data in the previous window, use current-window average
    // so the UI never renders a misleading 0.00ms "baseline avg latency".
    const baselineLatency = baselineLatencyRaw > 0 ? baselineLatencyRaw : currentWindowAvgLatency;

    const points = rows.map((row) => {
      const calls = Number(row.calls || 0);
      const errors = Number(row.errors || 0);
      const requestBytes = Number(row.totalRequestBytes || 0);
      const responseBytes = Number(row.totalResponseBytes || 0);
      const totalBytes = requestBytes + responseBytes;
      const avgLatencyMs = calls > 0 ? Number(row.totalDurationMs || 0) / calls : 0;
      return {
        bucket: row._id,
        label: formatBucketLabel(row._id, timeZone, granularity),
        calls,
        baselineCalls: Number(baselineCalls.toFixed(2)),
        errors,
        errorRate: Number(((calls > 0 ? errors / calls : 0) * 100).toFixed(2)),
        avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
        baselineLatencyMs: Number(baselineLatency.toFixed(2)),
        requestBytes,
        responseBytes,
        totalBytes,
        avgPacketBytes: calls > 0 ? Math.round(totalBytes / calls) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        points,
      },
    });
  } catch (error) {
    console.error('Error fetching telemetry v2 trends:', error);
    return NextResponse.json({ error: 'Failed to fetch telemetry trends' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/v2/trends', __GET as any);
