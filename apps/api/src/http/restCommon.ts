export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function unauthorizedCaller(): Response {
  return json({ error: 'Missing or invalid caller credentials' }, 401);
}

export function unauthorizedUser(): Response {
  return json({ error: 'Unauthorized' }, 401);
}

export function extractBearer(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

export type NativeRouteMode = 'mobile' | 'web';
