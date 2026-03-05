import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';
import { formatBucketLabel, toDateTruncId } from '@/lib/admin-telemetry';
import { ensureAdmin, parseTelemetryFilters } from '../shared';

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
const MAX_BODY_LENGTH = 20000;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
}

function redactScalar(value: unknown): unknown {
  if (typeof value === 'string') return value ? '[REDACTED]' : '';
  if (typeof value === 'number') return -1;
  if (typeof value === 'boolean') return false;
  return '[REDACTED]';
}

function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactDeep(entry));
  if (!value || typeof value !== 'object') return value;
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

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const { startDate, endDate, granularity, timeZone } = parseTelemetryFilters(searchParams);
    const routeKey = searchParams.get('routeKey') || '';
    const method = (searchParams.get('method') || '').toUpperCase();
    const errorId = (searchParams.get('errorId') || '').trim();
    if (!routeKey) {
      return NextResponse.json({ error: 'routeKey is required' }, { status: 400 });
    }
    const windowMs = endDate.getTime() - startDate.getTime();
    const baselineStart = new Date(startDate.getTime() - windowMs);
    const baselineEnd = startDate;

    const metricMatch: Record<string, unknown> = {
      bucket: { $gte: startDate, $lte: endDate },
      routeKey,
    };
    if (method && method !== 'ALL') metricMatch.method = method;
    const baselineMatch: Record<string, unknown> = {
      bucket: { $gte: baselineStart, $lt: baselineEnd },
      routeKey,
    };
    if (method && method !== 'ALL') baselineMatch.method = method;

    const errorMatch: Record<string, unknown> = {
      occurredAt: { $gte: startDate, $lte: endDate },
      routeKey,
      ...(method && method !== 'ALL' ? { method } : {}),
    };

    const [summaryRows, baselineSummaryRows, trendRows, recentErrors] = await Promise.all([
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
      ApiRequestMetricModel.aggregate([
        { $match: metricMatch },
        {
          $group: {
            _id: toDateTruncId(granularity, timeZone),
            calls: { $sum: '$count' },
            errors: { $sum: '$errorCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 120 },
      ]),
      ApiRequestErrorEventModel.find(errorMatch)
        .sort({ occurredAt: -1 })
        .limit(10)
        .select('_id occurredAt routeKey method status durationMs requestBytes responseBytes source errorMessage')
        .lean(),
    ]);
    const selectedError = errorId
      ? await ApiRequestErrorEventModel.findOne({
          _id: errorId,
          ...errorMatch,
        })
          .select(
            '_id occurredAt routeKey method status durationMs requestBytes responseBytes source errorMessage requestHeaders responseHeaders requestQuery requestBody responseBody contentType requestBodyTruncated responseBodyTruncated'
          )
          .lean()
      : null;

    const summary = summaryRows[0] || {};
    const baselineSummary = baselineSummaryRows[0] || {};
    const totalCalls = Number(summary.totalCalls || 0);
    const totalErrors = Number(summary.totalErrors || 0);
    const totalRequestBytes = Number(summary.totalRequestBytes || 0);
    const totalResponseBytes = Number(summary.totalResponseBytes || 0);
    const totalTrafficBytes = totalRequestBytes + totalResponseBytes;
    const baselineCalls = Number(baselineSummary.totalCalls || 0);
    const baselineErrors = Number(baselineSummary.totalErrors || 0);
    const baselineTrafficBytes = Number(baselineSummary.totalRequestBytes || 0) + Number(baselineSummary.totalResponseBytes || 0);

    const selectedErrorDoc = Array.isArray(selectedError) ? selectedError[0] : selectedError;
    const sanitizedSelectedError = selectedErrorDoc
      ? (() => {
          const reqBody = sanitizeBody(selectedErrorDoc.requestBody);
          const resBody = sanitizeBody(selectedErrorDoc.responseBody);
          return {
            id: String(selectedErrorDoc._id),
            occurredAt: selectedErrorDoc.occurredAt,
            routeKey: selectedErrorDoc.routeKey,
            method: selectedErrorDoc.method,
            status: selectedErrorDoc.status,
            source: selectedErrorDoc.source,
            durationMs: Math.round(selectedErrorDoc.durationMs || 0),
            requestBytes: selectedErrorDoc.requestBytes || 0,
            responseBytes: selectedErrorDoc.responseBytes || 0,
            request: {
              headers: (redactDeep(selectedErrorDoc.requestHeaders || {}) || {}) as Record<string, unknown>,
              query: (redactDeep(selectedErrorDoc.requestQuery || {}) || {}) as Record<string, unknown>,
              body: reqBody.value,
              bodyTruncated: Boolean(selectedErrorDoc.requestBodyTruncated || reqBody.truncated),
              bodyParseError: Boolean(reqBody.parseError),
              contentType: selectedErrorDoc.contentType || null,
            },
            response: {
              headers: (redactDeep(selectedErrorDoc.responseHeaders || {}) || {}) as Record<string, unknown>,
              body: resBody.value,
              bodyTruncated: Boolean(selectedErrorDoc.responseBodyTruncated || resBody.truncated),
              bodyParseError: Boolean(resBody.parseError),
              errorMessage: selectedErrorDoc.errorMessage || null,
            },
          };
        })()
      : null;

    return NextResponse.json({
      success: true,
      data: {
        routeKey,
        method: method || 'ALL',
        summary: {
          totalCalls,
          baselineCalls,
          totalErrors,
          errorRate: Number(((totalCalls > 0 ? totalErrors / totalCalls : 0) * 100).toFixed(2)),
          baselineErrorRate: Number(((baselineCalls > 0 ? baselineErrors / baselineCalls : 0) * 100).toFixed(2)),
          avgLatencyMs: Number((totalCalls > 0 ? Number(summary.totalDurationMs || 0) / totalCalls : 0).toFixed(2)),
          baselineAvgLatencyMs: Number(
            (baselineCalls > 0 ? Number(baselineSummary.totalDurationMs || 0) / baselineCalls : 0).toFixed(2)
          ),
          maxLatencyMs: Number(summary.maxDurationMs || 0),
          totalTrafficBytes,
          avgPacketBytes: totalCalls > 0 ? Math.round(totalTrafficBytes / totalCalls) : 0,
          baselineAvgPacketBytes: baselineCalls > 0 ? Math.round(baselineTrafficBytes / baselineCalls) : 0,
        },
        trend: trendRows.map((row) => ({
          label: formatBucketLabel(row._id, timeZone, granularity),
          calls: Number(row.calls || 0),
          errors: Number(row.errors || 0),
          avgLatencyMs: Number(
            ((row.calls || 0) > 0 ? Number(row.totalDurationMs || 0) / Number(row.calls || 1) : 0).toFixed(2)
          ),
        })),
        recentErrors: recentErrors.map((row) => ({
          id: String(row._id),
          occurredAt: row.occurredAt,
          routeKey: row.routeKey,
          method: row.method,
          status: row.status,
          durationMs: Math.round(row.durationMs || 0),
          requestBytes: row.requestBytes || 0,
          responseBytes: row.responseBytes || 0,
          source: row.source,
          errorMessage: row.errorMessage || '',
        })),
        selectedError: sanitizedSelectedError,
      },
    });
  } catch (error) {
    console.error('Error fetching telemetry v2 route details:', error);
    return NextResponse.json({ error: 'Failed to fetch telemetry route details' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/v2/route-details', __GET as any);
