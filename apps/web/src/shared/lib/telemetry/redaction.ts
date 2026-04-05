const REDACTED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);
const MAX_CAPTURE_BODY_CHARS = 50_000;

export function sanitizeHeaders(headers: Headers | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const out: [string, string][] = [];
  headers.forEach((value, key) => {
    if (REDACTED_HEADERS.has(key.toLowerCase())) return;
    out.push([key, value]);
  });
  return out.length > 0 ? Object.fromEntries(out) : undefined;
}

export function sanitizeQuery(url: string): Record<string, string | string[]> | undefined {
  const { searchParams } = new URL(url);
  if (!searchParams.size) return undefined;
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    out[key] = values.length > 1 ? values : values[0] || '';
  }
  return out;
}

export function trimBody(body: string): { value: string; truncated: boolean } {
  if (body.length <= MAX_CAPTURE_BODY_CHARS) return { value: body, truncated: false };
  return { value: body.slice(0, MAX_CAPTURE_BODY_CHARS), truncated: true };
}
