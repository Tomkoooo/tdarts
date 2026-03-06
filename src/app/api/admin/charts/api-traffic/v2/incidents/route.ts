import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ApiRouteAnomalyModel } from '@/database/models/api-route-anomaly.model';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';
import { buildRouteSearchRegex, ensureAdmin, parseTelemetryFilters } from '../shared';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const { startDate, endDate, routeKey, routeSearch, method } = parseTelemetryFilters(searchParams);
    const routeSearchRegex = buildRouteSearchRegex(routeSearch);
    const limit = Math.min(30, Math.max(5, Number(searchParams.get('limit') || 12)));

    const anomalyMatch: Record<string, unknown> = { isActive: true };
    const errorMatch: Record<string, unknown> = { occurredAt: { $gte: startDate, $lte: endDate } };
    if (routeKey) {
      anomalyMatch.routeKey = routeKey;
      errorMatch.routeKey = routeKey;
    } else if (routeSearchRegex) {
      const regexMatch = { $regex: routeSearchRegex, $options: 'i' };
      anomalyMatch.routeKey = regexMatch;
      errorMatch.routeKey = regexMatch;
    }
    if (method) {
      anomalyMatch.method = method;
      errorMatch.method = method;
    }

    const [anomalies, recentErrors] = await Promise.all([
      ApiRouteAnomalyModel.find(anomalyMatch)
        .sort({ ratio: -1, lastDetectedAt: -1 })
        .limit(limit)
        .lean(),
      ApiRequestErrorEventModel.find(errorMatch)
        .sort({ status: -1, occurredAt: -1 })
        .limit(limit)
        .select('_id occurredAt routeKey method status durationMs requestBytes responseBytes source errorMessage')
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        anomalies: anomalies.map((item) => ({
          routeKey: item.routeKey,
          method: item.method,
          signal: item.signal,
          ratio: Number((item.ratio || 0).toFixed(2)),
          currentValue: Number((item.currentValue || 0).toFixed(2)),
          baselineValue: Number((item.baselineValue || 0).toFixed(2)),
          lastDetectedAt: item.lastDetectedAt,
        })),
        errors: recentErrors.map((item) => ({
          id: String(item._id),
          occurredAt: item.occurredAt,
          routeKey: item.routeKey,
          method: item.method,
          status: item.status,
          durationMs: Math.round(item.durationMs || 0),
          requestBytes: item.requestBytes || 0,
          responseBytes: item.responseBytes || 0,
          source: item.source,
          errorMessage: item.errorMessage || '',
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching telemetry v2 incidents:', error);
    return NextResponse.json({ error: 'Failed to fetch telemetry incidents' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/v2/incidents', __GET as any);
