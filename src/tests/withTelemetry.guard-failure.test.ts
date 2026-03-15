const recordAggregateMock = jest.fn();
const recordErrorEventMock = jest.fn();
const scheduleFlushMock = jest.fn();

jest.mock('@/shared/lib/telemetry/sinks/apiTelemetrySink', () => ({
  normalizeRouteKey: (routeKey: string) => routeKey,
  recordAggregate: recordAggregateMock,
  recordErrorEvent: recordErrorEventMock,
  scheduleFlush: scheduleFlushMock,
}));

import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

describe('withTelemetry non-throw guard failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records aggregate and error event for structured unauthorized result', async () => {
    const action = withTelemetry(
      'players.createPlayer',
      async () => ({
        ok: false as const,
        code: 'UNAUTHORIZED' as const,
        status: 401 as const,
        message: 'Unauthorized',
      }),
      {
        resolveStatus: resolveGuardAwareStatus,
        metadata: {
          feature: 'players',
          actionName: 'createPlayer',
          eligibilityOutcome: 'blocked',
        },
      }
    );

    const result = await action({ name: 'A Player' });

    expect(result).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    expect(recordAggregateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'players.createPlayer',
        status: 401,
      })
    );
    expect(recordErrorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'players.createPlayer',
        status: 401,
        source: 'http_status',
        requestQuery: expect.objectContaining({
          feature: 'players',
          actionName: 'createPlayer',
          eligibilityOutcome: 'blocked',
          denialCode: 'UNAUTHORIZED',
        }),
      })
    );
    expect(scheduleFlushMock).toHaveBeenCalled();
  });
});
