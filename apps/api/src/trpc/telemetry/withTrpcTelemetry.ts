import { middleware } from '../init';

/**
 * tRPC telemetry middleware.
 *
 * Records procedure timing and outcome to the same sink used by the web app's
 * withTelemetry() wrapper (ApiTelemetryService).
 *
 * The sourceType='trpc' tag distinguishes API calls from Server Action calls
 * on shared dashboards.
 */
export const withTrpcTelemetry = middleware(async ({ ctx, path, type, next }) => {
  const startedAt = Date.now();
  const result = await next();

  const durationMs = Date.now() - startedAt;
  const ok = result.ok;

  // Fire-and-forget telemetry — do not await to avoid latency impact
  recordTelemetry({
    routeKey: path,
    operationType: type,
    durationMs,
    ok,
    requestId: ctx.requestId,
    callerId: ctx.caller?.clientId ?? 'unknown',
    userId: ctx.userId ?? undefined,
  }).catch((err) => console.error('[trpcTelemetry] record error:', err));

  return result;
});

interface TelemetryPayload {
  routeKey: string;
  operationType: string;
  durationMs: number;
  ok: boolean;
  requestId: string;
  callerId: string;
  userId?: string;
}

async function recordTelemetry(payload: TelemetryPayload): Promise<void> {
  if (process.env.DISABLE_API_TELEMETRY === 'true') return;

  try {
    const { ApiTelemetryService } = await import('@tdarts/services');
    await ApiTelemetryService.record({
      routeKey: payload.routeKey,
      sourceType: 'trpc',
      durationMs: payload.durationMs,
      statusCode: payload.ok ? 200 : 500,
      requestId: payload.requestId,
      extra: {
        callerId: payload.callerId,
        userId: payload.userId,
        operationType: payload.operationType,
      },
    } as any);
  } catch {
    // Telemetry errors are non-fatal
  }
}
