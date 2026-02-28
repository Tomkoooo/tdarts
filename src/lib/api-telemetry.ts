import { NextRequest, NextResponse } from 'next/server';
import { ApiTelemetryService } from '@/database/services/api-telemetry.service';

type ApiHandler<TArgs extends any[]> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<Response>;

const textEncoder = new TextEncoder();
const MAX_ESTIMATED_BODY_BYTES = 1_000_000;

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

async function estimateResponseBytes(response?: NextResponse): Promise<number> {
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

export function withApiTelemetry<TArgs extends any[]>(
  routeKey: string,
  handler: ApiHandler<TArgs>
): ApiHandler<TArgs> {
  const normalizedRoute = ApiTelemetryService.normalizeRouteKey(routeKey);

  return async (request: NextRequest, ...args: TArgs): Promise<Response> => {
    const startedAt = performance.now();
    const requestBytesPromise = estimateRequestBytes(request);
    let status = 500;
    let response: Response | undefined;

    try {
      response = await handler(request, ...args);
      status = response.status;
      return response;
    } catch (error) {
      // Preserve existing error behavior. We only record telemetry here.
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);

      // Avoid blocking response delivery on telemetry estimation.
      void Promise.all([requestBytesPromise, estimateResponseBytes(response)])
        .then(([requestBytes, responseBytes]) => {
          ApiTelemetryService.record({
            routeKey: normalizedRoute,
            method: request.method,
            durationMs,
            requestBytes,
            responseBytes,
            status,
          });
          ApiTelemetryService.scheduleFlushIfNeeded();
        })
        .catch(() => {
          // Telemetry failures must never affect API responses.
        });
    }
  };
}
