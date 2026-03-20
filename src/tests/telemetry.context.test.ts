import { NextRequest } from 'next/server';
import {
  captureRouteRequestPayload,
  captureRouteResponsePayload,
  estimateActionBytes,
  estimateRequestBytes,
  estimateResponseBytes,
} from '@/shared/lib/telemetry/context';

describe('telemetry context', () => {
  it('estimates request bytes for json body', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });

    const bytes = await estimateRequestBytes(request);
    expect(bytes).toBeGreaterThan(0);
  });

  it('captures request and response payload with truncation metadata', async () => {
    const request = new NextRequest('http://localhost:3000/api/test?a=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'secret' },
      body: JSON.stringify({ hello: 'world' }),
    });
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const reqPayload = await captureRouteRequestPayload(request);
    const resPayload = await captureRouteResponsePayload(response);

    expect(reqPayload.requestHeaders?.authorization).toBeUndefined();
    expect(reqPayload.requestQuery).toEqual({ a: '1' });
    expect(reqPayload.requestBody).toContain('hello');
    expect(resPayload.responseBody).toContain('ok');
  });

  it('estimates response and action bytes', async () => {
    const responseBytes = await estimateResponseBytes(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      })
    );
    expect(responseBytes).toBeGreaterThan(0);
    expect(estimateActionBytes({ x: 'y' })).toBeGreaterThan(0);
    expect(estimateActionBytes(undefined)).toBe(0);
  });
});
