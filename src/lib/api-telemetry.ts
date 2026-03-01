import { NextRequest } from 'next/server';
import { ApiTelemetryService } from '@/database/services/api-telemetry.service';

type ApiHandler<TArgs extends any[]> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<Response>;

const textEncoder = new TextEncoder();
const MAX_ESTIMATED_BODY_BYTES = 1_000_000;
const MAX_CAPTURE_BODY_CHARS = 50_000;
const REDACTED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);

function parseContentLength(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTextLikeContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return (
    normalized.includes('application/json') ||
    normalized.includes('application/graphql') ||
    normalized.includes('application/x-www-form-urlencoded') ||
    normalized.includes('text/')
  );
}

function estimateTextBytes(value: string): number {
  return Math.min(textEncoder.encode(value).length, MAX_ESTIMATED_BODY_BYTES);
}

function toHeaderRecord(headers: Headers | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const entries: [string, string][] = [];
  headers.forEach((value, key) => {
    if (REDACTED_HEADERS.has(key.toLowerCase())) return;
    entries.push([key, value]);
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function toQueryRecord(url: string): Record<string, string | string[]> | undefined {
  const { searchParams } = new URL(url);
  if (!searchParams.size) return undefined;
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    out[key] = values.length > 1 ? values : values[0] || '';
  }
  return out;
}

function trimBody(body: string): { value: string; truncated: boolean } {
  if (body.length <= MAX_CAPTURE_BODY_CHARS) return { value: body, truncated: false };
  return { value: body.slice(0, MAX_CAPTURE_BODY_CHARS), truncated: true };
}

async function estimateRequestBytes(request: NextRequest): Promise<number> {
  const value = request.headers.get('content-length');
  const parsed = parseContentLength(value);
  if (parsed > 0) return parsed;

  if (request.method === 'GET' || request.method === 'HEAD') return 0;
  if (!isTextLikeContentType(request.headers.get('content-type'))) return 0;

  try {
    const clone = request.clone();
    const body = await clone.text();
    return estimateTextBytes(body);
  } catch {
    return 0;
  }
}

async function estimateResponseBytes(response?: Response): Promise<number> {
  if (!response) return 0;

  if (response.status === 204 || response.status === 304) return 0;
  const value = response.headers.get('content-length');
  const parsed = parseContentLength(value);
  if (parsed > 0) return parsed;

  if (!isTextLikeContentType(response.headers.get('content-type'))) return 0;

  try {
    const clone = response.clone();
    const body = await clone.text();
    return estimateTextBytes(body);
  } catch {
    return 0;
  }
}

async function captureRequestPayload(request: NextRequest): Promise<{
  requestHeaders?: Record<string, string>;
  requestQuery?: Record<string, string | string[]>;
  requestBody?: string;
  requestBodyTruncated?: boolean;
  contentType?: string;
}> {
  const contentType = request.headers.get('content-type') || undefined;
  const requestHeaders = toHeaderRecord(request.headers);
  const requestQuery = toQueryRecord(request.url);

  if (request.method === 'GET' || request.method === 'HEAD') {
    return { requestHeaders, requestQuery, contentType };
  }

  if (!isTextLikeContentType(contentType || null)) {
    return { requestHeaders, requestQuery, contentType };
  }

  try {
    const body = await request.clone().text();
    const { value, truncated } = trimBody(body);
    return {
      requestHeaders,
      requestQuery,
      requestBody: value,
      requestBodyTruncated: truncated,
      contentType,
    };
  } catch {
    return { requestHeaders, requestQuery, contentType };
  }
}

async function captureResponsePayload(response?: Response): Promise<{
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}> {
  if (!response) return {};
  const responseHeaders = toHeaderRecord(response.headers);
  const contentType = response.headers.get('content-type');
  if (!isTextLikeContentType(contentType)) return { responseHeaders };
  try {
    const body = await response.clone().text();
    const { value, truncated } = trimBody(body);
    return {
      responseHeaders,
      responseBody: value,
      responseBodyTruncated: truncated,
    };
  } catch {
    return { responseHeaders };
  }
}

export function withApiTelemetry<TArgs extends any[]>(
  routeKey: string,
  handler: ApiHandler<TArgs>
): ApiHandler<TArgs> {
  const normalizedRoute = ApiTelemetryService.normalizeRouteKey(routeKey);

  return async (request: NextRequest, ...args: TArgs): Promise<Response> => {
    const startedAt = performance.now();
    const requestBytesPromise = estimateRequestBytes(request);
    const requestPayloadPromise = captureRequestPayload(request);
    let status = 500;
    let response: Response | undefined;
    let capturedError: unknown;

    try {
      response = await handler(request, ...args);
      status = response.status;
      return response;
    } catch (error) {
      // Preserve existing error behavior. We only record telemetry here.
      capturedError = error;
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);

      // Avoid blocking response delivery on telemetry estimation.
      void Promise.all([
        requestBytesPromise,
        estimateResponseBytes(response),
        requestPayloadPromise,
        captureResponsePayload(response),
      ])
        .then(([requestBytes, responseBytes, requestPayload, responsePayload]) => {
          ApiTelemetryService.record({
            routeKey: normalizedRoute,
            method: request.method,
            durationMs,
            requestBytes,
            responseBytes,
            status,
          });

          if (status >= 400 || capturedError) {
            ApiTelemetryService.recordErrorEvent({
              occurredAt: new Date(),
              routeKey: normalizedRoute,
              method: request.method,
              status,
              requestId: request.headers.get('x-request-id') || undefined,
              durationMs,
              requestBytes,
              responseBytes,
              requestHeaders: requestPayload.requestHeaders,
              responseHeaders: responsePayload.responseHeaders,
              requestQuery: requestPayload.requestQuery,
              requestBody: requestPayload.requestBody,
              responseBody: responsePayload.responseBody,
              contentType: requestPayload.contentType,
              errorMessage: capturedError instanceof Error ? capturedError.message : undefined,
              source: capturedError ? 'exception' : 'http_status',
              requestBodyTruncated: requestPayload.requestBodyTruncated,
              responseBodyTruncated: responsePayload.responseBodyTruncated,
            });
          }

          ApiTelemetryService.scheduleFlushIfNeeded();
        })
        .catch(() => {
          // Telemetry failures must never affect API responses.
        });
    }
  };
}
