import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { ApiRouteAnomalyModel } from '@/database/models/api-route-anomaly.model';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin, parseTelemetryFilters } from '../v2/shared';

const MAX_ERROR_EVENTS = 200;
const MAX_BODY_LENGTH = 20000;

const SIGNAL_THRESHOLD = {
  calls: 4,
  traffic: 4,
  latency: 2.2,
  error_rate: 1.8,
  packet_size: 2,
} as const;

const MIN_VOLUME_GATES = {
  minCurrentCalls: 50,
  minBaselineCallsPerDay: 20,
  minCallsDelta: 100,
  minCurrentTrafficBytes: 5 * 1024 * 1024,
  minBaselineTrafficBytesPerDay: 2 * 1024 * 1024,
  minTrafficDeltaBytes: 20 * 1024 * 1024,
  minCurrentLatencyMs: 300,
  minLatencyDeltaMs: 200,
  minCurrentErrors: 10,
  minCurrentErrorRate: 0.05,
  minCurrentAvgPacketBytes: 100 * 1024,
  minPacketDeltaBytes: 64 * 1024,
} as const;

type HintTag = 'likely_user_input' | 'likely_auth' | 'likely_rate_limit' | 'likely_server_bug' | 'unknown';

const SENSITIVE_KEY_PARTS = [
  'authorization', 'cookie', 'set-cookie', 'token', 'password', 'secret', 'api-key', 'apikey', 'key', 'session',
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PARTS.some((part) => key.toLowerCase().includes(part));
}

function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactDeep(entry));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = typeof nested === 'string' ? (nested ? '[REDACTED]' : '') : '[REDACTED]';
      continue;
    }
    out[key] = redactDeep(nested);
  }
  return out;
}

function sanitizeBody(rawBody?: string): { value?: unknown; truncated: boolean; parseError?: boolean } {
  if (!rawBody) return { truncated: false };
  const truncated = rawBody.length > MAX_BODY_LENGTH;
  const body = truncated ? rawBody.slice(0, MAX_BODY_LENGTH) : rawBody;
  try {
    const parsed = JSON.parse(body);
    return { value: redactDeep(parsed), truncated, parseError: false };
  } catch {
    return { value: body.length > 0 ? '[REDACTED_TEXT_BODY]' : '', truncated, parseError: true };
  }
}

function classifyErrorHint(status: number, source: string, errorMessage?: string, responseBody?: string): HintTag {
  const text = `${(errorMessage || '').toLowerCase()} ${(responseBody || '').toLowerCase()}`;
  if (status === 401 || status === 403 || text.includes('unauthorized') || text.includes('forbidden')) return 'likely_auth';
  if (status === 429 || text.includes('rate limit') || text.includes('too many requests')) return 'likely_rate_limit';
  if (status >= 500 || source === 'exception') return 'likely_server_bug';
  if (status >= 400 && status < 500) return 'likely_user_input';
  return 'unknown';
}

const safeDivide = (a: number, b: number) => (b > 0 ? a / b : 0);

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const { startDate, endDate, routeKey, method } = parseTelemetryFilters(searchParams);

    const windowMs = endDate.getTime() - startDate.getTime();
    const baselineStart = new Date(startDate.getTime() - windowMs);

    const match: Record<string, unknown> = { bucket: { $gte: baselineStart, $lte: endDate } };
    if (method) match.method = method;
    if (routeKey) match.routeKey = { $regex: routeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const errorMatch: Record<string, unknown> = { occurredAt: { $gte: startDate, $lte: endDate }, status: { $gte: 400 } };
    if (method) errorMatch.method = method;
    if (routeKey) errorMatch.routeKey = { $regex: routeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const [routeRows, activeAnomalies, errorRows] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { routeKey: '$routeKey', method: '$method' },
            currentCalls: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$count', 0] } },
            currentErrors: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$errorCount', 0] } },
            currentBytes: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, { $add: ['$totalRequestBytes', '$totalResponseBytes'] }, 0] } },
            currentDurationMs: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$totalDurationMs', 0] } },
            currentRequestBytes: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$totalRequestBytes', 0] } },
            currentResponseBytes: { $sum: { $cond: [{ $gte: ['$bucket', startDate] }, '$totalResponseBytes', 0] } },
            baselineCalls: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$count', 0] } },
            baselineErrors: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$errorCount', 0] } },
            baselineBytes: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, { $add: ['$totalRequestBytes', '$totalResponseBytes'] }, 0] } },
            baselineDurationMs: { $sum: { $cond: [{ $lt: ['$bucket', startDate] }, '$totalDurationMs', 0] } },
          },
        },
      ]),
      ApiRouteAnomalyModel.find({ isActive: true }).sort({ ratio: -1 }).limit(200).lean(),
      ApiRequestErrorEventModel.find(errorMatch).sort({ occurredAt: -1 }).limit(MAX_ERROR_EVENTS).lean(),
    ]);

    const routes = routeRows.map((row) => {
      const currentLatency = safeDivide(row.currentDurationMs || 0, row.currentCalls || 0);
      const baselineLatency = safeDivide(row.baselineDurationMs || 0, row.baselineCalls || 0);
      const currentErrorRate = safeDivide(row.currentErrors || 0, row.currentCalls || 0);
      const baselineErrorRate = safeDivide(row.baselineErrors || 0, row.baselineCalls || 0);
      const currentAvgPacket = safeDivide(row.currentBytes || 0, row.currentCalls || 0);
      const baselineAvgPacket = safeDivide(row.baselineBytes || 0, row.baselineCalls || 0);

      const latencyRatio = safeDivide(currentLatency, baselineLatency);
      const errorRateRatio = safeDivide(currentErrorRate, baselineErrorRate);
      const packetRatio = safeDivide(currentAvgPacket, baselineAvgPacket);

      return {
        routeKey: row._id.routeKey,
        method: row._id.method,
        current: {
          calls: row.currentCalls || 0,
          errors: row.currentErrors || 0,
          errorRate: Number((currentErrorRate * 100).toFixed(2)),
          avgLatencyMs: Number(currentLatency.toFixed(2)),
          totalTrafficBytes: row.currentBytes || 0,
          avgPacketBytes: Math.round(currentAvgPacket),
          avgIncomingPacketBytes: Math.round(safeDivide(row.currentRequestBytes || 0, row.currentCalls || 0)),
          avgOutgoingPacketBytes: Math.round(safeDivide(row.currentResponseBytes || 0, row.currentCalls || 0)),
        },
        baseline: {
          calls: row.baselineCalls || 0,
          errors: row.baselineErrors || 0,
          errorRate: Number((baselineErrorRate * 100).toFixed(2)),
          avgLatencyMs: Number(baselineLatency.toFixed(2)),
          avgPacketBytes: Math.round(baselineAvgPacket),
        },
        ratios: {
          latencyRatio: Number(latencyRatio.toFixed(2)),
          errorRateRatio: Number(errorRateRatio.toFixed(2)),
          packetRatio: Number(packetRatio.toFixed(2)),
        },
        anomalyFlags: {
          latency:
            baselineLatency > 0 &&
            (row.currentCalls || 0) >= MIN_VOLUME_GATES.minCurrentCalls &&
            currentLatency >= MIN_VOLUME_GATES.minCurrentLatencyMs &&
            currentLatency - baselineLatency >= MIN_VOLUME_GATES.minLatencyDeltaMs &&
            latencyRatio >= SIGNAL_THRESHOLD.latency,
          error_rate:
            baselineErrorRate > 0 &&
            (row.currentCalls || 0) >= MIN_VOLUME_GATES.minCurrentCalls &&
            (row.currentErrors || 0) >= MIN_VOLUME_GATES.minCurrentErrors &&
            currentErrorRate >= MIN_VOLUME_GATES.minCurrentErrorRate &&
            errorRateRatio >= SIGNAL_THRESHOLD.error_rate,
          packet_size:
            baselineAvgPacket > 0 &&
            currentAvgPacket >= MIN_VOLUME_GATES.minCurrentAvgPacketBytes &&
            currentAvgPacket - baselineAvgPacket >= MIN_VOLUME_GATES.minPacketDeltaBytes &&
            packetRatio >= SIGNAL_THRESHOLD.packet_size,
        },
      };
    }).sort((a, b) => b.current.calls - a.current.calls);

    const summary = routes.reduce(
      (acc, r) => {
        acc.totalCalls += r.current.calls;
        acc.totalErrors += r.current.errors;
        acc.totalTrafficBytes += r.current.totalTrafficBytes;
        acc.totalLatencyWeighted += r.current.avgLatencyMs * r.current.calls;
        return acc;
      },
      { totalCalls: 0, totalErrors: 0, totalTrafficBytes: 0, totalLatencyWeighted: 0 }
    );

    const normalizedErrors = errorRows.map((event) => {
      const hint = classifyErrorHint(event.status, event.source, event.errorMessage, event.responseBody);
      const reqBody = sanitizeBody(event.requestBody);
      const resBody = sanitizeBody(event.responseBody);
      return {
        id: String(event._id),
        occurredAt: event.occurredAt,
        routeKey: event.routeKey,
        method: event.method,
        status: event.status,
        durationMs: Math.round(event.durationMs || 0),
        requestBytes: event.requestBytes || 0,
        responseBytes: event.responseBytes || 0,
        source: event.source,
        errorMessage: event.errorMessage || null,
        hint,
        request: {
          headers: redactDeep(event.requestHeaders || {}),
          query: redactDeep(event.requestQuery || {}),
          body: reqBody.value,
          bodyTruncated: Boolean(event.requestBodyTruncated || reqBody.truncated),
          contentType: event.contentType || null,
        },
        response: {
          headers: redactDeep(event.responseHeaders || {}),
          body: resBody.value,
          bodyTruncated: Boolean(event.responseBodyTruncated || resBody.truncated),
          errorMessage: event.errorMessage || null,
        },
      };
    });

    const hintCounts = normalizedErrors.reduce(
      (acc, e) => { acc[e.hint] = (acc[e.hint] || 0) + 1; return acc; },
      {} as Record<HintTag, number>
    );

    const flaggedRoutes = routes.filter((r) => r.anomalyFlags.latency || r.anomalyFlags.error_rate || r.anomalyFlags.packet_size);
    const insights = {
      highBaselineLatency: [...routes].filter((r) => r.baseline.avgLatencyMs > 200).sort((a, b) => b.baseline.avgLatencyMs - a.baseline.avgLatencyMs).slice(0, 10),
      latencyRegressed: [...routes].filter((r) => r.ratios.latencyRatio >= 1.25 && r.current.avgLatencyMs >= 200).sort((a, b) => b.ratios.latencyRatio - a.ratios.latencyRatio).slice(0, 10),
      largestPackets: [...routes].sort((a, b) => b.current.avgPacketBytes - a.current.avgPacketBytes).slice(0, 10),
      risingErrorRate: [...routes].filter((r) => r.ratios.errorRateRatio >= 1.5 && r.current.errorRate >= 1).sort((a, b) => b.ratios.errorRateRatio - a.ratios.errorRateRatio).slice(0, 10),
    };

    const avgLatency = safeDivide(summary.totalLatencyWeighted, summary.totalCalls);
    const errorRate = safeDivide(summary.totalErrors, summary.totalCalls) * 100;
    const statusLabel = flaggedRoutes.length === 0 ? 'healthy' : flaggedRoutes.some((r) => r.anomalyFlags.error_rate) ? 'critical' : 'degraded';

    const aiSummary = {
      status: statusLabel,
      assessment: statusLabel === 'healthy'
        ? `All ${routes.length} routes operating normally. Avg latency ${avgLatency.toFixed(1)}ms, error rate ${errorRate.toFixed(2)}%.`
        : `${flaggedRoutes.length} route(s) flagged. ${insights.latencyRegressed.length} with latency regression, ${insights.risingErrorRate.length} with rising error rates.`,
      topIssues: flaggedRoutes.slice(0, 5).map((r) => ({
        route: `${r.method} ${r.routeKey}`,
        signals: Object.entries(r.anomalyFlags).filter(([, v]) => v).map(([k]) => k),
        currentLatencyMs: r.current.avgLatencyMs,
        baselineLatencyMs: r.baseline.avgLatencyMs,
        errorRate: r.current.errorRate,
        baselineErrorRate: r.baseline.errorRate,
      })),
      recommendedActions: [
        ...(insights.latencyRegressed.length > 0 ? [`Investigate latency regression on ${insights.latencyRegressed[0].method} ${insights.latencyRegressed[0].routeKey} (${insights.latencyRegressed[0].ratios.latencyRatio}x baseline)`] : []),
        ...(insights.risingErrorRate.length > 0 ? [`Check rising error rate on ${insights.risingErrorRate[0].method} ${insights.risingErrorRate[0].routeKey} (${insights.risingErrorRate[0].current.errorRate}% vs ${insights.risingErrorRate[0].baseline.errorRate}% baseline)`] : []),
        ...(insights.largestPackets.length > 0 && insights.largestPackets[0].current.avgPacketBytes > 512 * 1024 ? [`Review large packet sizes on ${insights.largestPackets[0].method} ${insights.largestPackets[0].routeKey} (avg ${Math.round(insights.largestPackets[0].current.avgPacketBytes / 1024)}KB)`] : []),
      ],
      errorBreakdown: {
        total: normalizedErrors.length,
        byHint: hintCounts,
        notes: {
          likely_user_input: 'Malformed payloads or validation failures (4xx).',
          likely_auth: 'Authentication/authorization failures (401/403).',
          likely_rate_limit: 'Rate-limit responses (429).',
          likely_server_bug: 'Unhandled exceptions or backend failures (5xx).',
          unknown: 'Needs deeper review.',
        },
      },
    };

    const now = new Date();
    const responsePayload = {
      meta: {
        generatedAt: now.toISOString(),
        window: { start: startDate.toISOString(), end: endDate.toISOString() },
        baselineWindow: { start: baselineStart.toISOString(), end: startDate.toISOString() },
        filters: { method: method || 'ALL', routeKey: routeKey || '*' },
        thresholds: SIGNAL_THRESHOLD,
        gates: MIN_VOLUME_GATES,
        redactionApplied: true,
      },
      aiSummary,
      summary: {
        totalRoutes: routes.length,
        totalCalls: summary.totalCalls,
        totalErrors: summary.totalErrors,
        errorRate: Number(errorRate.toFixed(2)),
        totalTrafficBytes: summary.totalTrafficBytes,
        avgLatencyMs: Number(avgLatency.toFixed(2)),
      },
      insights,
      routes,
      activeAnomalies: activeAnomalies.map((item) => ({
        routeKey: item.routeKey,
        method: item.method,
        signal: item.signal,
        currentValue: Number((item.currentValue || 0).toFixed(2)),
        baselineValue: Number((item.baselineValue || 0).toFixed(2)),
        ratio: Number((item.ratio || 0).toFixed(2)),
        firstDetectedAt: item.firstDetectedAt,
        lastDetectedAt: item.lastDetectedAt,
      })),
      errorEvents: normalizedErrors,
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'content-disposition': `attachment; filename="api-telemetry-export-${now.toISOString().replace(/[:.]/g, '-')}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting api telemetry bundle:', error);
    return NextResponse.json({ error: 'Failed to export telemetry bundle' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/export', __GET as any);
