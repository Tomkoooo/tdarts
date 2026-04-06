import { sanitizeHeaders, sanitizeQuery, trimBody } from '@/shared/lib/telemetry/redaction';

describe('telemetry redaction utilities', () => {
  it('redacts sensitive headers', () => {
    const headers = new Headers({
      authorization: 'Bearer secret',
      cookie: 'token=abc',
      'x-api-key': 'secret',
      'content-type': 'application/json',
    });

    const sanitized = sanitizeHeaders(headers);
    expect(sanitized).toEqual({ 'content-type': 'application/json' });
  });

  it('normalizes query params with repeated keys', () => {
    const query = sanitizeQuery('https://example.com/path?a=1&a=2&b=3');
    expect(query).toEqual({ a: ['1', '2'], b: '3' });
  });

  it('trims oversized bodies', () => {
    const huge = 'x'.repeat(50_100);
    const trimmed = trimBody(huge);
    expect(trimmed.truncated).toBe(true);
    expect(trimmed.value.length).toBe(50_000);
  });
});
