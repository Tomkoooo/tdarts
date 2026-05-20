'use server';

import {
  ApiRequestErrorEventModel,
  ApiRequestMetricModel,
  ApiRouteAnomalyModel,
  connectMongo,
} from '@tdarts/core';
import { ADMIN_CAPABILITIES } from '@/features/admin/lib/admin-capabilities';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { serializeForClient } from '@/shared/lib/serializeForClient';

type Primitive = string | number | boolean;
export type AdminTelemetryQueryParams = Record<string, Primitive>;

function success(data: unknown, status = 200) {
  return { ok: true as const, status, data: serializeForClient(data) };
}

function failure(message: string, status = 400) {
  return {
    ok: false as const,
    status,
    data: { success: false, error: message, message },
  };
}

async function assertAdminTelemetry() {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
    return {};
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    const status = msg === 'Unauthorized' ? 401 : 403;
    return { error: failure(msg, status) };
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveDateRange(params: AdminTelemetryQueryParams) {
  const endDate = params.end ? new Date(String(params.end)) : new Date();
  const startDate = params.start ? new Date(String(params.start)) : new Date(endDate);
  if (!params.start) {
    const range = String(params.range || '24h');
    if (range === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (range === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (range === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setDate(startDate.getDate() - 1);
  }
  return { startDate, endDate };
}

function toInt(input: Primitive | undefined, fallback: number) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(input: Primitive | undefined, fallback = false) {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return input !== 0;
  if (typeof input === 'string') return input === 'true' || input === '1';
  return fallback;
}

function buildTelemetryMatch(params: AdminTelemetryQueryParams) {
  const { startDate, endDate } = resolveDateRange(params);
  const routeKey = String(params.routeKey || '').trim();
  const method = String(params.method || '').toUpperCase();
  const search = String(params.search || '').trim();
  const source = String(params.source || 'all').toLowerCase();
  const match: any = {
    bucket: { $gte: startDate, $lte: endDate },
  };
  if (routeKey) match.routeKey = routeKey;
  if (method && method !== 'ALL') match.method = method;
  if (source && source !== 'all') match.source = source;
  if (search) match.routeKey = { $regex: escapeRegex(search), $options: 'i' };
  return { match, startDate, endDate };
}

function formatTelemetryTrendLabel(date: Date, timeZone: string, unit: 'minute' | 'hour' | 'day'): string {
  if (unit === 'day') {
    return date.toLocaleString('hu-HU', { timeZone, year: 'numeric', month: 'short', day: 'numeric' });
  }
  if (unit === 'hour') {
    return date.toLocaleString('hu-HU', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return date.toLocaleString('hu-HU', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function calcDirection(current: number, baseline: number): 'up' | 'down' | 'flat' {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) return 'flat';
  if (Math.abs(current - baseline) < 0.0001) return 'flat';
  return current > baseline ? 'up' : 'down';
}

function calcDeltaPct(current: number, baseline: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) return 0;
  if (baseline === 0) return current > 0 ? 100 : 0;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

export async function adminTelemetryOverviewAction(params: AdminTelemetryQueryParams) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { match, startDate, endDate } = buildTelemetryMatch(params);
    const windowMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - windowMs);
    const prevEnd = new Date(startDate.getTime());

    const [rows, prevRows, activeAnomalies, errAgg] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalTimeouts: { $sum: '$timeoutCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            minLatencyMs: { $min: '$minDurationMs' },
            peakLatencyMs: { $max: '$maxDurationMs' },
            totalRequestBytes: { $sum: '$totalRequestBytes' },
            minRequestBytes: { $min: '$minRequestBytes' },
            totalResponseBytes: { $sum: '$totalResponseBytes' },
            minResponseBytes: { $min: '$minResponseBytes' },
            maxRequestBytes: { $max: '$maxRequestBytes' },
            maxResponseBytes: { $max: '$maxResponseBytes' },
            readCalls: {
              $sum: {
                $cond: [{ $eq: ['$operationClass', 'read'] }, '$count', 0],
              },
            },
            writeCalls: {
              $sum: {
                $cond: [{ $eq: ['$operationClass', 'write'] }, '$count', 0],
              },
            },
            pageSampleCount: { $sum: '$pageLoadMetrics.sampleCount' },
            ttfbTotalMs: { $sum: '$pageLoadMetrics.ttfbTotalMs' },
            fcpTotalMs: { $sum: '$pageLoadMetrics.fcpTotalMs' },
            lcpTotalMs: { $sum: '$pageLoadMetrics.lcpTotalMs' },
            inpTotalMs: { $sum: '$pageLoadMetrics.inpTotalMs' },
            ttfbMaxMs: { $max: '$pageLoadMetrics.ttfbMaxMs' },
            fcpMaxMs: { $max: '$pageLoadMetrics.fcpMaxMs' },
            lcpMaxMs: { $max: '$pageLoadMetrics.lcpMaxMs' },
            inpMaxMs: { $max: '$pageLoadMetrics.inpMaxMs' },
          },
        },
      ]),
      ApiRequestMetricModel.aggregate([
        { $match: { ...match, bucket: { $gte: prevStart, $lte: prevEnd } } },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalTimeouts: { $sum: '$timeoutCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            totalTrafficBytes: { $sum: { $add: ['$totalRequestBytes', '$totalResponseBytes'] } },
          },
        },
      ]),
      ApiRouteAnomalyModel.countDocuments({ isActive: true }),
      ApiRequestErrorEventModel.aggregate([
        {
          $match: {
            occurredAt: { $gte: startDate, $lte: endDate },
            ...(match.method ? { method: match.method } : {}),
            ...(match.routeKey ? { routeKey: match.routeKey } : {}),
            ...(match.source ? { sourceType: match.source } : {}),
          },
        },
        {
          $group: {
            _id: null,
            count4xx: { $sum: { $cond: [{ $and: [{ $gte: ['$status', 400] }, { $lt: ['$status', 500] }] }, 1, 0] } },
            count5xx: { $sum: { $cond: [{ $gte: ['$status', 500] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const cur = rows[0] || {};
    const prev = prevRows[0] || {};
    const totalCalls = Number(cur.totalCalls || 0);
    const totalErrors = Number(cur.totalErrors || 0);
    const totalTimeouts = Number(cur.totalTimeouts || 0);
    const totalDurationMs = Number(cur.totalDurationMs || 0);
    const totalRequestBytes = Number(cur.totalRequestBytes || 0);
    const totalResponseBytes = Number(cur.totalResponseBytes || 0);
    const totalTrafficBytes = totalRequestBytes + totalResponseBytes;
    const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));
    const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;
    const avgLatencyMs = totalCalls > 0 ? totalDurationMs / totalCalls : 0;
    const avgPacketBytes = totalCalls > 0 ? totalTrafficBytes / totalCalls : 0;
    const callsPerSecond = totalCalls / windowSeconds;
    const baselineCalls = Number(prev.totalCalls || 0);
    const baselineErrors = Number(prev.totalErrors || 0);
    const baselineTimeouts = Number(prev.totalTimeouts || 0);
    const baselineDuration = Number(prev.totalDurationMs || 0);
    const baselineTraffic = Number(prev.totalTrafficBytes || 0);
    const baselineErrorRate = baselineCalls > 0 ? baselineErrors / baselineCalls : 0;
    const baselineAvgLatencyMs = baselineCalls > 0 ? baselineDuration / baselineCalls : 0;
    const baselineCallsPerSecond = baselineCalls / windowSeconds;
    const baselineTimeoutRate = baselineCalls > 0 ? baselineTimeouts / baselineCalls : 0;
    const timeoutRate = totalCalls > 0 ? totalTimeouts / totalCalls : 0;
    const readCalls = Number(cur.readCalls || 0);
    const writeCalls = Number(cur.writeCalls || 0);
    const rwRatio = writeCalls > 0 ? readCalls / writeCalls : readCalls > 0 ? readCalls : 0;
    const pageSampleCount = Number(cur.pageSampleCount || 0);

    const status =
      errorRate > 0.12 || avgLatencyMs > 900 || timeoutRate > 0.08
        ? 'critical'
        : errorRate > 0.05 || avgLatencyMs > 450 || timeoutRate > 0.03
          ? 'degraded'
          : 'healthy';
    const incident = errAgg[0] || {};

    const deltas = {
      calls: {
        direction: calcDirection(totalCalls, baselineCalls),
        deltaPct: calcDeltaPct(totalCalls, baselineCalls),
      },
      callsPerSecond: {
        direction: calcDirection(callsPerSecond, baselineCallsPerSecond),
        deltaPct: calcDeltaPct(callsPerSecond, baselineCallsPerSecond),
      },
      errors: {
        direction: calcDirection(errorRate, baselineErrorRate),
        deltaPct: calcDeltaPct(errorRate, baselineErrorRate),
      },
      latency: {
        direction: calcDirection(avgLatencyMs, baselineAvgLatencyMs),
        deltaPct: calcDeltaPct(avgLatencyMs, baselineAvgLatencyMs),
      },
      traffic: {
        direction: calcDirection(totalTrafficBytes, baselineTraffic),
        deltaPct: calcDeltaPct(totalTrafficBytes, baselineTraffic),
      },
      timeouts: {
        direction: calcDirection(timeoutRate, baselineTimeoutRate),
        deltaPct: calcDeltaPct(timeoutRate, baselineTimeoutRate),
      },
    };

    return success({
      data: {
        status,
        window: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          seconds: windowSeconds,
        },
        kpis: {
          totalCalls,
          totalErrors,
          totalTimeouts,
          errorRate,
          timeoutRate,
          callsPerSecond,
          avgLatencyMs,
          minLatencyMs: Number(cur.minLatencyMs || 0),
          peakLatencyMs: Number(cur.peakLatencyMs || 0),
          totalRequestBytes,
          totalResponseBytes,
          totalMovedBytes: totalTrafficBytes,
          avgPacketBytes,
          minPacketBytes: Number(cur.minRequestBytes || 0) + Number(cur.minResponseBytes || 0),
          maxPacketBytes: Number(cur.maxRequestBytes || 0) + Number(cur.maxResponseBytes || 0),
          readCalls,
          writeCalls,
          readWriteRatio: rwRatio,
          pageLoad: {
            sampleCount: pageSampleCount,
            avgTtfbMs: pageSampleCount > 0 ? Number(cur.ttfbTotalMs || 0) / pageSampleCount : 0,
            avgFcpMs: pageSampleCount > 0 ? Number(cur.fcpTotalMs || 0) / pageSampleCount : 0,
            avgLcpMs: pageSampleCount > 0 ? Number(cur.lcpTotalMs || 0) / pageSampleCount : 0,
            avgInpMs: pageSampleCount > 0 ? Number(cur.inpTotalMs || 0) / pageSampleCount : 0,
            maxTtfbMs: Number(cur.ttfbMaxMs || 0),
            maxFcpMs: Number(cur.fcpMaxMs || 0),
            maxLcpMs: Number(cur.lcpMaxMs || 0),
            maxInpMs: Number(cur.inpMaxMs || 0),
          },
          baselineAvgLatencyMs,
          baselineErrorRate,
        },
        deltas,
        incidents: {
          activeAnomalies,
          count4xx: Number(incident.count4xx || 0),
          count5xx: Number(incident.count5xx || 0),
        },
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry overview', 500);
  }
}

export async function adminTelemetryTrendsAction(params: AdminTelemetryQueryParams) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { match, startDate, endDate } = buildTelemetryMatch(params);
    const granularity = String(params.granularity || 'hour');
    const tz = String(params.tz || 'UTC');
    const unit = granularity === 'day' ? 'day' : granularity === 'minute' ? 'minute' : 'hour';

    const rows = await ApiRequestMetricModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$bucket',
              unit,
              timezone: tz,
            },
          },
          calls: { $sum: '$count' },
          errors: { $sum: '$errorCount' },
          timeouts: { $sum: '$timeoutCount' },
          duration: { $sum: '$totalDurationMs' },
          requestBytes: { $sum: '$totalRequestBytes' },
          responseBytes: { $sum: '$totalResponseBytes' },
          readCalls: {
            $sum: {
              $cond: [{ $eq: ['$operationClass', 'read'] }, '$count', 0],
            },
          },
          writeCalls: {
            $sum: {
              $cond: [{ $eq: ['$operationClass', 'write'] }, '$count', 0],
            },
          },
          pageSamples: { $sum: '$pageLoadMetrics.sampleCount' },
          ttfbTotalMs: { $sum: '$pageLoadMetrics.ttfbTotalMs' },
          fcpTotalMs: { $sum: '$pageLoadMetrics.fcpTotalMs' },
          lcpTotalMs: { $sum: '$pageLoadMetrics.lcpTotalMs' },
          inpTotalMs: { $sum: '$pageLoadMetrics.inpTotalMs' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const points = rows.map((row: any) => {
      const calls = Number(row.calls || 0);
      const errors = Number(row.errors || 0);
      const requestBytes = Number(row.requestBytes || 0);
      const responseBytes = Number(row.responseBytes || 0);
      const totalBytes = requestBytes + responseBytes;
      const intervalSeconds = unit === 'minute' ? 60 : unit === 'hour' ? 3600 : 86400;
      const bucketDate = new Date(row._id);
      return {
        bucketAt: bucketDate.toISOString(),
        label: formatTelemetryTrendLabel(bucketDate, tz, unit),
        calls,
        errors,
        timeouts: Number(row.timeouts || 0),
        errorRate: calls > 0 ? errors / calls : 0,
        timeoutRate: calls > 0 ? Number(row.timeouts || 0) / calls : 0,
        avgLatencyMs: calls > 0 ? Number(row.duration || 0) / calls : 0,
        callsPerSecond: calls / intervalSeconds,
        readCalls: Number(row.readCalls || 0),
        writeCalls: Number(row.writeCalls || 0),
        requestBytes,
        responseBytes,
        totalBytes,
        avgPacketBytes: calls > 0 ? totalBytes / calls : 0,
        pageLoad: {
          sampleCount: Number(row.pageSamples || 0),
          avgTtfbMs: Number(row.pageSamples || 0) > 0 ? Number(row.ttfbTotalMs || 0) / Number(row.pageSamples || 0) : 0,
          avgFcpMs: Number(row.pageSamples || 0) > 0 ? Number(row.fcpTotalMs || 0) / Number(row.pageSamples || 0) : 0,
          avgLcpMs: Number(row.pageSamples || 0) > 0 ? Number(row.lcpTotalMs || 0) / Number(row.pageSamples || 0) : 0,
          avgInpMs: Number(row.pageSamples || 0) > 0 ? Number(row.inpTotalMs || 0) / Number(row.pageSamples || 0) : 0,
        },
      };
    });

    return success({
      data: {
        points,
        granularity: unit,
        timeZone: tz,
        bucketCount: points.length,
        window: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry trends', 500);
  }
}

export async function adminTelemetryIncidentsAction(params: AdminTelemetryQueryParams) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { startDate, endDate } = resolveDateRange(params);
    const search = String(params.search || '').trim();
    const routeKeyFilter = params.routeKey ? String(params.routeKey) : undefined;
    const errorQuery: Record<string, unknown> = {
      occurredAt: { $gte: startDate, $lte: endDate },
      ...(params.method && String(params.method).toUpperCase() !== 'ALL' ? { method: String(params.method).toUpperCase() } : {}),
      ...(routeKeyFilter ? { routeKey: routeKeyFilter } : {}),
      ...(search && !routeKeyFilter ? { routeKey: { $regex: escapeRegex(search), $options: 'i' } } : {}),
      ...(params.source && String(params.source) !== 'all' ? { sourceType: String(params.source) } : {}),
    };
    const anomalyQuery: Record<string, unknown> = {
      isActive: true,
      ...(search ? { routeKey: { $regex: escapeRegex(search), $options: 'i' } } : {}),
      ...(params.method && String(params.method).toUpperCase() !== 'ALL' ? { method: String(params.method).toUpperCase() } : {}),
      ...(routeKeyFilter ? { routeKey: routeKeyFilter } : {}),
      ...(params.source && String(params.source) !== 'all' ? { sourceType: String(params.source) } : {}),
    };
    const [anomalies, errors] = await Promise.all([
      ApiRouteAnomalyModel.find(anomalyQuery).sort({ ratio: -1, lastObservedAt: -1 }).limit(100),
      ApiRequestErrorEventModel.find(errorQuery)
        .sort({ occurredAt: -1 })
        .limit(200),
    ]);

    return success({
      data: {
        anomalies: anomalies.map((a: any) => ({
          sourceType: a.sourceType || 'api',
          routeKey: a.routeKey,
          method: a.method,
          signal: a.signal,
          ratio: Number(a.ratio || 0),
          currentValue: Number(a.currentValue || 0),
          baselineValue: Number(a.baselineValue || 0),
          lastDetectedAt: a.lastDetectedAt,
        })),
        errors: errors.map((e: any) => ({
          id: String(e._id),
          occurredAt: e.occurredAt,
          sourceType: e.sourceType || 'api',
          routeKey: e.routeKey,
          method: e.method,
          status: Number(e.status || 0),
          durationMs: Number(e.durationMs || 0),
          requestBytes: Number(e.requestBytes || 0),
          responseBytes: Number(e.responseBytes || 0),
          source: e.source || '',
          errorMessage: e.errorMessage || '',
        })),
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry incidents', 500);
  }
}

export async function adminTelemetryRoutesAction(params: AdminTelemetryQueryParams) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { match } = buildTelemetryMatch(params);
    const page = Math.max(1, toInt(params.page, 1));
    const limit = Math.max(1, Math.min(100, toInt(params.limit, 20)));
    const sortBy = String(params.sortBy || 'errors');
    const sortDir = String(params.sortDir || 'desc') === 'asc' ? 1 : -1;
    const onlyProblematic = toBool(params.onlyProblematic, false);

    const grouped = await ApiRequestMetricModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { sourceType: '$source', routeKey: '$routeKey', method: '$method' },
          totalCalls: { $sum: '$count' },
          totalErrors: { $sum: '$errorCount' },
          totalTimeouts: { $sum: '$timeoutCount' },
          totalDurationMs: { $sum: '$totalDurationMs' },
          minDurationMs: { $min: '$minDurationMs' },
          maxDurationMs: { $max: '$maxDurationMs' },
          totalRequestBytes: { $sum: '$totalRequestBytes' },
          totalResponseBytes: { $sum: '$totalResponseBytes' },
          readCalls: {
            $sum: {
              $cond: [{ $eq: ['$operationClass', 'read'] }, '$count', 0],
            },
          },
          writeCalls: {
            $sum: {
              $cond: [{ $eq: ['$operationClass', 'write'] }, '$count', 0],
            },
          },
          pageSamples: { $sum: '$pageLoadMetrics.sampleCount' },
          ttfbTotalMs: { $sum: '$pageLoadMetrics.ttfbTotalMs' },
          lcpTotalMs: { $sum: '$pageLoadMetrics.lcpTotalMs' },
          lastSeen: { $max: '$bucket' },
        },
      },
    ]);

    let rows = grouped.map((row: any) => {
      const totalCalls = Number(row.totalCalls || 0);
      const totalErrors = Number(row.totalErrors || 0);
      const totalRequestBytes = Number(row.totalRequestBytes || 0);
      const totalResponseBytes = Number(row.totalResponseBytes || 0);
      const totalTrafficBytes = totalRequestBytes + totalResponseBytes;
      return {
        sourceType: row._id.sourceType || 'api',
        routeKey: row._id.routeKey,
        method: row._id.method,
        totalCalls,
        totalErrors,
        totalTimeouts: Number(row.totalTimeouts || 0),
        errorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
        avgLatencyMs: totalCalls > 0 ? Number(row.totalDurationMs || 0) / totalCalls : 0,
        minLatencyMs: Number(row.minDurationMs || 0),
        maxLatencyMs: Number(row.maxDurationMs || 0),
        totalRequestBytes,
        totalResponseBytes,
        totalTrafficBytes,
        avgPacketBytes: totalCalls > 0 ? totalTrafficBytes / totalCalls : 0,
        avgIncomingPacketBytes: totalCalls > 0 ? totalRequestBytes / totalCalls : 0,
        avgOutgoingPacketBytes: totalCalls > 0 ? totalResponseBytes / totalCalls : 0,
        readCalls: Number(row.readCalls || 0),
        writeCalls: Number(row.writeCalls || 0),
        pageLoad: {
          sampleCount: Number(row.pageSamples || 0),
          avgTtfbMs: Number(row.pageSamples || 0) > 0 ? Number(row.ttfbTotalMs || 0) / Number(row.pageSamples || 0) : 0,
          avgLcpMs: Number(row.pageSamples || 0) > 0 ? Number(row.lcpTotalMs || 0) / Number(row.pageSamples || 0) : 0,
        },
        lastSeen: row.lastSeen,
      };
    });

    if (onlyProblematic) {
      rows = rows.filter((r: any) => r.errorRate > 0.02 || r.avgLatencyMs > 400 || r.avgPacketBytes > 512 * 1024);
    }

    const sortKeyMap: Record<string, string> = {
      route: 'routeKey',
      calls: 'totalCalls',
      errors: 'totalErrors',
      errorrate: 'errorRate',
      latency: 'avgLatencyMs',
      traffic: 'totalTrafficBytes',
      lastseen: 'lastSeen',
    };
    const sortField = sortKeyMap[String(sortBy).toLowerCase()] || 'totalErrors';
    rows.sort((a: any, b: any) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === bv) return 0;
      return av > bv ? sortDir : -sortDir;
    });

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    const insights = {
      highBaselineLatency: rows.filter((r: any) => r.avgLatencyMs > 600).slice(0, 10),
      latencyRegressed: rows.filter((r: any) => r.avgLatencyMs > 400 && r.totalCalls > 30).slice(0, 10),
      largestIncomingPackets: [...rows].sort((a: any, b: any) => b.avgIncomingPacketBytes - a.avgIncomingPacketBytes).slice(0, 10),
      largestOutgoingPackets: [...rows].sort((a: any, b: any) => b.avgOutgoingPacketBytes - a.avgOutgoingPacketBytes).slice(0, 10),
      risingErrorRate: rows.filter((r: any) => r.errorRate > 0.03).slice(0, 10),
      risingTimeouts: rows.filter((r: any) => r.totalTimeouts > 5).slice(0, 10),
    };

    return success({
      data: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      insights,
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry routes', 500);
  }
}

function parseMaybeJson(body: string | undefined) {
  if (!body) return { value: null, parseError: false };
  try {
    return { value: JSON.parse(body), parseError: false };
  } catch {
    return { value: body, parseError: true };
  }
}

export async function adminTelemetryRouteDetailsAction(params: AdminTelemetryQueryParams) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const routeKey = String(params.routeKey || '').trim();
    const method = String(params.method || '').toUpperCase();
    if (!routeKey || !method) return failure('routeKey and method are required', 400);
    const { startDate, endDate } = resolveDateRange(params);
    const granularity = String(params.granularity || 'hour');
    const tz = String(params.tz || 'UTC');
    const unit = granularity === 'day' ? 'day' : granularity === 'minute' ? 'minute' : 'hour';

    const [summaryRows, trendRows, recentErrors, selected] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        {
          $match: {
            routeKey,
            method,
            bucket: { $gte: startDate, $lte: endDate },
            ...(params.source && String(params.source) !== 'all' ? { source: String(params.source) } : {}),
          },
        },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalTimeouts: { $sum: '$timeoutCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            minLatencyMs: { $min: '$minDurationMs' },
            maxLatencyMs: { $max: '$maxDurationMs' },
            totalRequestBytes: { $sum: '$totalRequestBytes' },
            totalResponseBytes: { $sum: '$totalResponseBytes' },
            pageSamples: { $sum: '$pageLoadMetrics.sampleCount' },
            ttfbTotalMs: { $sum: '$pageLoadMetrics.ttfbTotalMs' },
            fcpTotalMs: { $sum: '$pageLoadMetrics.fcpTotalMs' },
            lcpTotalMs: { $sum: '$pageLoadMetrics.lcpTotalMs' },
            inpTotalMs: { $sum: '$pageLoadMetrics.inpTotalMs' },
          },
        },
      ]),
      ApiRequestMetricModel.aggregate([
        {
          $match: {
            routeKey,
            method,
            bucket: { $gte: startDate, $lte: endDate },
            ...(params.source && String(params.source) !== 'all' ? { source: String(params.source) } : {}),
          },
        },
        {
          $group: {
            _id: {
              $dateTrunc: {
                date: '$bucket',
                unit,
                timezone: tz,
              },
            },
            calls: { $sum: '$count' },
            errors: { $sum: '$errorCount' },
            timeouts: { $sum: '$timeoutCount' },
            duration: { $sum: '$totalDurationMs' },
            pageSamples: { $sum: '$pageLoadMetrics.sampleCount' },
            ttfbTotalMs: { $sum: '$pageLoadMetrics.ttfbTotalMs' },
            lcpTotalMs: { $sum: '$pageLoadMetrics.lcpTotalMs' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ApiRequestErrorEventModel.find({
        routeKey,
        method,
        occurredAt: { $gte: startDate, $lte: endDate },
        ...(params.source && String(params.source) !== 'all' ? { sourceType: String(params.source) } : {}),
      })
        .sort({ occurredAt: -1 })
        .limit(100),
      params.errorId ? ApiRequestErrorEventModel.findById(String(params.errorId)) : Promise.resolve(null),
    ]);

    const sum = summaryRows[0] || {};
    const totalCalls = Number(sum.totalCalls || 0);
    const totalErrors = Number(sum.totalErrors || 0);
    const totalTrafficBytes = Number(sum.totalRequestBytes || 0) + Number(sum.totalResponseBytes || 0);

    const trend = trendRows.map((row: any) => ({
      label: new Date(row._id).toLocaleString('hu-HU', { hour12: false }),
      calls: Number(row.calls || 0),
      errors: Number(row.errors || 0),
      timeouts: Number(row.timeouts || 0),
      avgLatencyMs: Number(row.calls || 0) > 0 ? Number(row.duration || 0) / Number(row.calls || 0) : 0,
      pageLoad: {
        sampleCount: Number(row.pageSamples || 0),
        avgTtfbMs: Number(row.pageSamples || 0) > 0 ? Number(row.ttfbTotalMs || 0) / Number(row.pageSamples || 0) : 0,
        avgLcpMs: Number(row.pageSamples || 0) > 0 ? Number(row.lcpTotalMs || 0) / Number(row.pageSamples || 0) : 0,
      },
    }));

    const recent = recentErrors.map((e: any) => ({
      id: String(e._id),
      occurredAt: e.occurredAt,
      method: e.method,
      routeKey: e.routeKey,
      status: Number(e.status || 0),
      durationMs: Number(e.durationMs || 0),
      requestBytes: Number(e.requestBytes || 0),
      responseBytes: Number(e.responseBytes || 0),
      source: e.source || '',
      sourceType: e.sourceType || 'api',
      errorMessage: e.errorMessage || '',
    }));

    const selectedError = selected
      ? (() => {
          const parsedReq = parseMaybeJson(selected.requestBody);
          const parsedRes = parseMaybeJson(selected.responseBody);
          return {
            id: String(selected._id),
            occurredAt: selected.occurredAt,
            routeKey: selected.routeKey,
            method: selected.method,
            status: selected.status,
            source: selected.source,
            durationMs: Number(selected.durationMs || 0),
            requestBytes: Number(selected.requestBytes || 0),
            responseBytes: Number(selected.responseBytes || 0),
            request: {
              headers: selected.requestHeaders || {},
              query: selected.requestQuery || {},
              body: parsedReq.value,
              bodyTruncated: Boolean(selected.requestBodyTruncated),
              bodyParseError: parsedReq.parseError,
              contentType: selected.contentType || null,
            },
            response: {
              headers: selected.responseHeaders || {},
              body: parsedRes.value,
              bodyTruncated: Boolean(selected.responseBodyTruncated),
              bodyParseError: parsedRes.parseError,
              errorMessage: selected.errorMessage || null,
            },
          };
        })()
      : null;

    return success({
      data: {
        routeKey,
        method,
        summary: {
          totalCalls,
          totalErrors,
          totalTimeouts: Number(sum.totalTimeouts || 0),
          errorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
          avgLatencyMs: totalCalls > 0 ? Number(sum.totalDurationMs || 0) / totalCalls : 0,
          minLatencyMs: Number(sum.minLatencyMs || 0),
          maxLatencyMs: Number(sum.maxLatencyMs || 0),
          totalTrafficBytes,
          avgPacketBytes: totalCalls > 0 ? totalTrafficBytes / totalCalls : 0,
          pageLoad: {
            sampleCount: Number(sum.pageSamples || 0),
            avgTtfbMs: Number(sum.pageSamples || 0) > 0 ? Number(sum.ttfbTotalMs || 0) / Number(sum.pageSamples || 0) : 0,
            avgFcpMs: Number(sum.pageSamples || 0) > 0 ? Number(sum.fcpTotalMs || 0) / Number(sum.pageSamples || 0) : 0,
            avgLcpMs: Number(sum.pageSamples || 0) > 0 ? Number(sum.lcpTotalMs || 0) / Number(sum.pageSamples || 0) : 0,
            avgInpMs: Number(sum.pageSamples || 0) > 0 ? Number(sum.inpTotalMs || 0) / Number(sum.pageSamples || 0) : 0,
          },
        },
        trend,
        recentErrors: recent,
        selectedError,
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load route details', 500);
  }
}

export async function adminTelemetryErrorResetsAction(payload: Record<string, unknown>) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const routesRaw = Array.isArray(payload.routes)
      ? payload.routes
      : payload.routeKey
        ? [{ routeKey: payload.routeKey, method: payload.method }]
        : [];

    const routes = routesRaw
      .map((r: any) => ({
        routeKey: String(r.routeKey || '').trim(),
        method: String(r.method || 'ALL').toUpperCase(),
      }))
      .filter((r: any) => r.routeKey);

    if (routes.length === 0) {
      return failure('No routes supplied', 400);
    }

    let resolved = 0;
    for (const route of routes) {
      const errorMatch: any = { routeKey: route.routeKey, isResolved: false };
      const anomalyMatch: any = { routeKey: route.routeKey, isActive: true };
      if (route.method !== 'ALL') {
        errorMatch.method = route.method;
        anomalyMatch.method = route.method;
      }
      if (payload.source && String(payload.source) !== 'all') {
        errorMatch.sourceType = String(payload.source);
        anomalyMatch.sourceType = String(payload.source);
      }
      const res = await ApiRequestErrorEventModel.updateMany(errorMatch, {
        $set: { isResolved: true, resolvedAt: new Date() },
      });
      resolved += Number((res as any).modifiedCount || 0);
      await ApiRouteAnomalyModel.updateMany(anomalyMatch, {
        $set: { isActive: false, lastObservedAt: new Date() },
      });
    }

    return success({
      success: true,
      data: {
        totalRoutesProcessed: routes.length,
        totalResolvedCount: resolved,
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to reset telemetry errors', 500);
  }
}

export async function adminTelemetryExportAction(params: AdminTelemetryQueryParams) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;
    const [overview, incidents, routes, trends] = await Promise.all([
      adminTelemetryOverviewAction(params),
      adminTelemetryIncidentsAction(params),
      adminTelemetryRoutesAction({ ...params, page: 1, limit: 500 }),
      adminTelemetryTrendsAction(params),
    ]);
    const overviewData = (overview as any)?.data ?? null;
    const incidentsData = (incidents as any)?.data ?? null;
    const routesData = (routes as any)?.data ?? null;
    const trendsData = (trends as any)?.data ?? null;

    return success({
      success: true,
      mode: String(params.mode || 'default'),
      generatedAt: new Date().toISOString(),
      filters: params,
      overview: overviewData,
      incidents: incidentsData,
      routes: routesData,
      trends: trendsData,
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to export telemetry snapshot', 500);
  }
}

export async function adminTelemetryImportSnapshotAction(payload: Record<string, unknown>) {
  try {
    const guard = await assertAdminTelemetry();
    if ('error' in guard) return guard.error;

    const snapshot = payload?.snapshot;
    if (!snapshot || typeof snapshot !== 'object') {
      return failure('Invalid snapshot payload', 400);
    }

    return success({
      success: true,
      importedAt: new Date().toISOString(),
      snapshot,
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to import telemetry snapshot', 500);
  }
}

