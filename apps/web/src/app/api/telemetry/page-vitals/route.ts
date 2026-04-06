import { NextRequest, NextResponse } from 'next/server';
import { ApiTelemetryService } from '@/database/services/api-telemetry.service';

function normalizePath(pathname: string): string {
  return ApiTelemetryService.normalizeRouteKey(pathname || '/');
}

function toFinite(input: unknown): number | undefined {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const routeKey = normalizePath(String(body?.path || request.nextUrl.pathname || '/'));
    const ttfbMs = toFinite(body?.ttfbMs);
    const fcpMs = toFinite(body?.fcpMs);
    const lcpMs = toFinite(body?.lcpMs);
    const inpMs = toFinite(body?.inpMs);

    ApiTelemetryService.record({
      routeKey,
      method: 'PAGE_LOAD',
      sourceType: 'page',
      operationClass: 'read',
      durationMs: ttfbMs || 0,
      requestBytes: toFinite(body?.requestBytes) || 0,
      responseBytes: toFinite(body?.responseBytes) || 0,
      status: 200,
      pageVitals: { ttfbMs, fcpMs, lcpMs, inpMs },
    });
    ApiTelemetryService.scheduleFlushIfNeeded();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
