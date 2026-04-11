import { ApiTelemetryService } from '@tdarts/services';
import { normalizeRouteKey, recordAggregate, recordErrorEvent, scheduleFlush } from '@/shared/lib/telemetry/sinks/apiTelemetrySink';

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  ApiTelemetryService: {
    normalizeRouteKey: jest.fn((v: string) => v),
    record: jest.fn(),
    recordErrorEvent: jest.fn(),
    scheduleFlushIfNeeded: jest.fn(),
  },
}));

describe('apiTelemetrySink', () => {
  it('delegates sink calls to ApiTelemetryService', () => {
    normalizeRouteKey('/api/test');
    recordAggregate({
      routeKey: '/api/test',
      method: 'GET',
      durationMs: 10,
      requestBytes: 1,
      responseBytes: 2,
      status: 200,
    });
    recordErrorEvent({
      occurredAt: new Date(),
      routeKey: '/api/test',
      method: 'GET',
      status: 500,
      durationMs: 5,
      requestBytes: 0,
      responseBytes: 0,
      source: 'exception',
    });
    scheduleFlush();

    expect(ApiTelemetryService.normalizeRouteKey).toHaveBeenCalledWith('/api/test');
    expect(ApiTelemetryService.record).toHaveBeenCalledTimes(1);
    expect(ApiTelemetryService.recordErrorEvent).toHaveBeenCalledTimes(1);
    expect(ApiTelemetryService.scheduleFlushIfNeeded).toHaveBeenCalledTimes(1);
  });
});
