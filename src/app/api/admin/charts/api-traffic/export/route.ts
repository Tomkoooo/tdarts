import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { ApiRouteAnomalyModel } from '@/database/models/api-route-anomaly.model';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

const ANOMALY_RATIO_THRESHOLD = 2;
const MAX_ERROR_EVENTS = 300;
const MAX_BODY_LENGTH = 20000;

type HintTag =
  | 'likely_user_input'
  | 'likely_auth'
  | 'likely_rate_limit'
  | 'likely_server_bug'
  | 'unknown';

const SENSITIVE_KEY_PARTS = [
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'password',
  'secret',
  'api-key',
  'apikey',
  'key',
  'session',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
}

function redactScalar(value: unknown): unknown {
  if (typeof value === 'string') {
    if (!value) return value;
    return '[REDACTED]';
  }
  if (typeof value === 'number') return -1;
  if (typeof value === 'boolean') return false;
  return '[REDACTED]';
}

function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactDeep(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = redactScalar(nested);
      continue;
    }
    out[key] = redactDeep(nested);
  }
  return out;
}

function tryParseJson(value?: string): { parsed?: unknown; parseError?: boolean } {
  if (!value) return {};
  try {
    return { parsed: JSON.parse(value) };
  } catch {
    return { parseError: true };
  }
}

function sanitizeBody(rawBody?: string): { value?: unknown; truncated: boolean; parseError?: boolean } {
  if (!rawBody) return { truncated: false };
  const truncated = rawBody.length > MAX_BODY_LENGTH;
  const body = truncated ? rawBody.slice(0, MAX_BODY_LENGTH) : rawBody;
  const parsed = tryParseJson(body);
  if (parsed.parsed !== undefined) {
    return { value: redactDeep(parsed.parsed), truncated, parseError: false };
  }
  return {
    value: body.length > 0 ? '[REDACTED_TEXT_BODY]' : '',
    truncated,
    parseError: parsed.parseError,
  };
}

function classifyErrorHint(status: number, source: string, errorMessage?: string, responseBody?: string): HintTag {
  const lowerMessage = (errorMessage || '').toLowerCase();
  const lowerBody = (responseBody || '').toLowerCase();
  const text = `${lowerMessage} ${lowerBody}`;

  if (status === 401 || status === 403 || text.includes('unauthorized') || text.includes('forbidden')) {
    return 'likely_auth';
  }
  if (status === 429 || text.includes('rate limit') || text.includes('too many requests')) {
    return 'likely_rate_limit';
  }
  if (status >= 500 || source === 'exception') {
    return 'likely_server_bug';
  }
  if (status >= 400 && status < 500) {
    return 'likely_user_input';
  }
  return 'unknown';
}

async function __GET(request: NextRequest) {
  try {
    await connectMongo();

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const baselineStart = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const baselineEnd = currentStart;

    const [routeRows, activeAnomalies, errorRows] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        { $match: { bucket: { $gte: baselineStart, $lte: now } } },
        {
          $group: {
            _id: { routeKey: '$routeKey', method: '$method' },
            calls24h: { $sum: { $cond: [{ $gte: ['$bucket', currentStart] }, '$count', 0] } },
            callsPrev7d: {
              $sum: {
                $cond: [{ $and: [{ $lt: ['$bucket', currentStart] }, { $gte: ['$bucket', baselineStart] }] }, '$count', 0],
              },
            },
            errors24h: { $sum: { $cond: [{ $gte: ['$bucket', currentStart] }, '$errorCount', 0] } },
            errorsPrev7d: {
              $sum: {
                $cond: [{ $and: [{ $lt: ['$bucket', currentStart] }, { $gte: ['$bucket', baselineStart] }] }, '$errorCount', 0],
              },
            },
            bytes24h: {
              $sum: {
                $cond: [
                  { $gte: ['$bucket', currentStart] },
                  { $add: ['$totalRequestBytes', '$totalResponseBytes'] },
                  0,
                ],
              },
            },
            bytesPrev7d: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ['$bucket', currentStart] }, { $gte: ['$bucket', baselineStart] }] },
                  { $add: ['$totalRequestBytes', '$totalResponseBytes'] },
                  0,
                ],
              },
            },
            duration24h: {
              $sum: {
                $cond: [{ $gte: ['$bucket', currentStart] }, '$totalDurationMs', 0],
              },
            },
            durationPrev7d: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ['$bucket', currentStart] }, { $gte: ['$bucket', baselineStart] }] },
                  '$totalDurationMs',
                  0,
                ],
              },
            },
            count24h: { $sum: { $cond: [{ $gte: ['$bucket', currentStart] }, '$count', 0] } },
            countPrev7d: {
              $sum: {
                $cond: [{ $and: [{ $lt: ['$bucket', currentStart] }, { $gte: ['$bucket', baselineStart] }] }, '$count', 0],
              },
            },
          },
        },
      ]),
      ApiRouteAnomalyModel.find({ isActive: true }).sort({ ratio: -1, lastDetectedAt: -1 }).limit(200).lean(),
      ApiRequestErrorEventModel.find({
        occurredAt: { $gte: currentStart, $lte: now },
        status: { $gte: 400 },
      })
        .sort({ occurredAt: -1 })
        .limit(MAX_ERROR_EVENTS)
        .lean(),
    ]);

    const safeDivide = (a: number, b: number) => (b > 0 ? a / b : 0);

    const routes = routeRows
      .map((row) => {
        const baselineCalls = (row.callsPrev7d || 0) / 7;
        const baselineTraffic = (row.bytesPrev7d || 0) / 7;
        const currentLatency = safeDivide(row.duration24h || 0, row.count24h || 0);
        const baselineLatency = safeDivide(row.durationPrev7d || 0, row.countPrev7d || 0);
        const callsRatio = safeDivide(row.calls24h || 0, baselineCalls);
        const trafficRatio = safeDivide(row.bytes24h || 0, baselineTraffic);
        const latencyRatio = safeDivide(currentLatency, baselineLatency);
        const currentErrors = row.errors24h || 0;
        const currentCalls = row.calls24h || 0;

        return {
          routeKey: row._id.routeKey,
          method: row._id.method,
          current24h: {
            calls: currentCalls,
            errors: currentErrors,
            errorRate: Number((safeDivide(currentErrors, currentCalls) * 100).toFixed(2)),
            totalTrafficBytes: row.bytes24h || 0,
            avgLatencyMs: Number(currentLatency.toFixed(2)),
          },
          baselineDailyAvgFromPrev7d: {
            calls: Number(baselineCalls.toFixed(2)),
            errors: Number(((row.errorsPrev7d || 0) / 7).toFixed(2)),
            trafficBytes: Number(baselineTraffic.toFixed(2)),
            avgLatencyMs: Number(baselineLatency.toFixed(2)),
          },
          ratios: {
            callsRatio: Number(callsRatio.toFixed(2)),
            trafficRatio: Number(trafficRatio.toFixed(2)),
            latencyRatio: Number(latencyRatio.toFixed(2)),
          },
          anomalyFlags: {
            calls: baselineCalls > 0 && callsRatio > ANOMALY_RATIO_THRESHOLD,
            traffic: baselineTraffic > 0 && trafficRatio > ANOMALY_RATIO_THRESHOLD,
            latency: baselineLatency > 0 && latencyRatio > ANOMALY_RATIO_THRESHOLD,
          },
        };
      })
      .sort((a, b) => b.current24h.calls - a.current24h.calls);

    const summary = routes.reduce(
      (acc, route) => {
        acc.totalCalls += route.current24h.calls;
        acc.totalErrors += route.current24h.errors;
        acc.totalTrafficBytes += route.current24h.totalTrafficBytes;
        acc.totalLatencyWeighted += route.current24h.avgLatencyMs * route.current24h.calls;
        return acc;
      },
      {
        totalCalls: 0,
        totalErrors: 0,
        totalTrafficBytes: 0,
        totalLatencyWeighted: 0,
      }
    );

    const normalizedErrorEvents = errorRows.map((event) => {
      const requestBody = sanitizeBody(event.requestBody);
      const responseBody = sanitizeBody(event.responseBody);
      const hint = classifyErrorHint(event.status, event.source, event.errorMessage, event.responseBody);

      return {
        occurredAt: event.occurredAt,
        routeKey: event.routeKey,
        method: event.method,
        status: event.status,
        requestId: event.requestId,
        durationMs: Math.round(event.durationMs || 0),
        requestBytes: event.requestBytes || 0,
        responseBytes: event.responseBytes || 0,
        source: event.source,
        errorMessage: event.errorMessage || null,
        hint,
        request: {
          headers: redactDeep(event.requestHeaders || {}),
          query: redactDeep(event.requestQuery || {}),
          body: requestBody.value,
          bodyTruncated: Boolean(event.requestBodyTruncated || requestBody.truncated),
          bodyParseError: Boolean(requestBody.parseError),
          contentType: event.contentType || null,
        },
        response: {
          headers: redactDeep(event.responseHeaders || {}),
          body: responseBody.value,
          bodyTruncated: Boolean(event.responseBodyTruncated || responseBody.truncated),
          bodyParseError: Boolean(responseBody.parseError),
        },
        redactionApplied: true,
        redactionNotes: ['Sensitive keys in headers/query/body are masked for safe sharing.'],
      };
    });

    const diagnosticsHints = normalizedErrorEvents.reduce(
      (acc, item) => {
        acc.counts[item.hint] += 1;
        return acc;
      },
      {
        counts: {
          likely_user_input: 0,
          likely_auth: 0,
          likely_rate_limit: 0,
          likely_server_bug: 0,
          unknown: 0,
        } as Record<HintTag, number>,
      }
    );

    const responsePayload = {
      meta: {
        generatedAt: now.toISOString(),
        timezone: 'UTC',
        thresholdRatio: ANOMALY_RATIO_THRESHOLD,
        windows: {
          current24h: { start: currentStart.toISOString(), end: now.toISOString() },
          previous7d: { start: baselineStart.toISOString(), end: baselineEnd.toISOString() },
        },
        redactionApplied: true,
      },
      summary: {
        totalRoutes: routes.length,
        totalCalls: summary.totalCalls,
        totalErrors: summary.totalErrors,
        errorRate: Number((safeDivide(summary.totalErrors, summary.totalCalls) * 100).toFixed(2)),
        totalTrafficBytes: summary.totalTrafficBytes,
        avgLatencyMs: Number(safeDivide(summary.totalLatencyWeighted, summary.totalCalls).toFixed(2)),
        topSpikes: routes
          .filter((route) => route.anomalyFlags.calls || route.anomalyFlags.traffic || route.anomalyFlags.latency)
          .sort((a, b) => {
            const aScore = Math.max(a.ratios.callsRatio, a.ratios.trafficRatio, a.ratios.latencyRatio);
            const bScore = Math.max(b.ratios.callsRatio, b.ratios.trafficRatio, b.ratios.latencyRatio);
            return bScore - aScore;
          })
          .slice(0, 20),
      },
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
      errorEvents: normalizedErrorEvents,
      diagnosticsHints: {
        ...diagnosticsHints,
        notes: {
          likely_user_input: 'Usually malformed payload, invalid query/path values, or validation issues (4xx).',
          likely_auth: 'Authentication or authorization failure (401/403).',
          likely_rate_limit: 'Rate-limit or quota style responses (429).',
          likely_server_bug: 'Unhandled exception or backend failure (5xx / exception source).',
          unknown: 'No strong signal; needs deeper review.',
        },
      },
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
