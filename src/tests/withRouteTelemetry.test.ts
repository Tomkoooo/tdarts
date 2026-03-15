const recordAggregateMock = jest.fn();
const recordErrorEventMock = jest.fn();
const scheduleFlushMock = jest.fn();

jest.mock('@/shared/lib/telemetry/sinks/apiTelemetrySink', () => ({
  normalizeRouteKey: (routeKey: string) => routeKey,
  recordAggregate: recordAggregateMock,
  recordErrorEvent: recordErrorEventMock,
  scheduleFlush: scheduleFlushMock,
}));

import { NextRequest } from 'next/server';
import { withRouteTelemetry } from '@/shared/lib/withTelemetry';

describe('withRouteTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records aggregate on successful route response', async () => {
    const handler = withRouteTelemetry('/api/test', async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: { 'x-request-id': 'req-1' },
    });

    const response = await handler(request);
    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(recordAggregateMock).toHaveBeenCalledWith(expect.objectContaining({ routeKey: '/api/test', status: 200 }));
    expect(recordErrorEventMock).not.toHaveBeenCalled();
  });
});
