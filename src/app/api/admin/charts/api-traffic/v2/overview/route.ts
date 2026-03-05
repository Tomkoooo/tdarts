import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { ApiRouteAnomalyModel } from '@/database/models/api-route-anomaly.model';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';
import { ensureAdmin, parseTelemetryFilters } from '../shared';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const { startDate, endDate, routeKey, method } = parseTelemetryFilters(searchParams);

    const metricMatch: Record<string, unknown> = { bucket: { $gte: startDate, $lte: endDate } };
    const anomalyMatch: Record<string, unknown> = { isActive: true };
    const errorMatch: Record<string, unknown> = { occurredAt: { $gte: startDate, $lte: endDate } };
    if (routeKey) {
      metricMatch.routeKey = routeKey;
      anomalyMatch.routeKey = routeKey;
      errorMatch.routeKey = routeKey;
    }
    if (method) {
      metricMatch.method = method;
      anomalyMatch.method = method;
      errorMatch.method = method;
    }

    const windowMs = endDate.getTime() - startDate.getTime();
    const baselineStart = new Date(startDate.getTime() - windowMs);
    const baselineMatch: Record<string, unknown> = { bucket: { $gte: baselineStart, $lt: startDate } };
    if (routeKey) baselineMatch.routeKey = routeKey;
    if (method) baselineMatch.method = method;

    const [aggRows, baselineRows, activeAnomalies, errorSummary] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        { $match: metricMatch },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            maxDurationMs: { $max: '$maxDurationMs' },
            totalRequestBytes: { $sum: '$totalRequestBytes' },
            totalResponseBytes: { $sum: '$totalResponseBytes' },
          },
        },
      ]),
      ApiRequestMetricModel.aggregate([
        { $match: baselineMatch },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            totalRequestBytes: { $sum: '$totalRequestBytes' },
            totalResponseBytes: { $sum: '$totalResponseBytes' },
          },
        },
      ]),
      ApiRouteAnomalyModel.countDocuments(anomalyMatch),
      ApiRequestErrorEventModel.aggregate([
        { $match: errorMatch },
        {
          $group: {
            _id: null,
            total4xx: {
              $sum: {
                $cond: [{ $and: [{ $gte: ['$status', 400] }, { $lt: ['$status', 500] }] }, 1, 0],
              },
            },
            total5xx: {
              $sum: {
                $cond: [{ $and: [{ $gte: ['$status', 500] }, { $lt: ['$status', 600] }] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const agg = aggRows[0] || {};
    const bl = baselineRows[0] || {};
    const totalCalls = Number(agg.totalCalls || 0);
    const totalErrors = Number(agg.totalErrors || 0);
    const totalRequestBytes = Number(agg.totalRequestBytes || 0);
    const totalResponseBytes = Number(agg.totalResponseBytes || 0);
    const totalMovedBytes = totalRequestBytes + totalResponseBytes;
    const avgLatencyMs = totalCalls > 0 ? Number(agg.totalDurationMs || 0) / totalCalls : 0;
    const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;
    const avgPacketBytes = totalCalls > 0 ? totalMovedBytes / totalCalls : 0;

    const blCalls = Number(bl.totalCalls || 0);
    const blAvgLatencyMs = blCalls > 0 ? Number(bl.totalDurationMs || 0) / blCalls : 0;
    const blErrorRate = blCalls > 0 ? Number(bl.totalErrors || 0) / blCalls : 0;

    const status =
      activeAnomalies > 0 || errorRate >= 0.05 ? 'critical' : errorRate >= 0.02 || avgLatencyMs >= 400 ? 'degraded' : 'healthy';

    return NextResponse.json({
      success: true,
      data: {
        status,
        kpis: {
          totalCalls,
          totalErrors,
          errorRate: Number((errorRate * 100).toFixed(2)),
          avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
          peakLatencyMs: Number(agg.maxDurationMs || 0),
          totalRequestBytes,
          totalResponseBytes,
          totalMovedBytes,
          avgPacketBytes: Math.round(avgPacketBytes),
          baselineAvgLatencyMs: Number(blAvgLatencyMs.toFixed(2)),
          baselineErrorRate: Number((blErrorRate * 100).toFixed(2)),
        },
        incidents: {
          activeAnomalies,
          count4xx: Number(errorSummary[0]?.total4xx || 0),
          count5xx: Number(errorSummary[0]?.total5xx || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching telemetry v2 overview:', error);
    return NextResponse.json({ error: 'Failed to fetch telemetry overview' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/v2/overview', __GET as any);
