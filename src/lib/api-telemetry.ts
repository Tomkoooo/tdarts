import { NextRequest, NextResponse } from 'next/server';
import { ApiTelemetryService } from '@/database/services/api-telemetry.service';

type ApiHandler<TArgs extends any[]> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<NextResponse>;

function estimateRequestBytes(request: NextRequest): number {
  const value = request.headers.get('content-length');
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimateResponseBytes(response?: NextResponse): number {
  if (!response) return 0;
  const value = response.headers.get('content-length');
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function withApiTelemetry<TArgs extends any[]>(
  routeKey: string,
  handler: ApiHandler<TArgs>
): ApiHandler<TArgs> {
  const normalizedRoute = ApiTelemetryService.normalizeRouteKey(routeKey);

  return async (request: NextRequest, ...args: TArgs): Promise<NextResponse> => {
    const startedAt = performance.now();
    const requestBytes = estimateRequestBytes(request);
    let status = 500;
    let response: NextResponse | undefined;

    try {
      response = await handler(request, ...args);
      status = response.status;
      return response;
    } catch (error) {
      // Preserve existing error behavior. We only record telemetry here.
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);
      const responseBytes = estimateResponseBytes(response);

      ApiTelemetryService.record({
        routeKey: normalizedRoute,
        method: request.method,
        durationMs,
        requestBytes,
        responseBytes,
        status,
      });
      ApiTelemetryService.scheduleFlushIfNeeded();
    }
  };
}
