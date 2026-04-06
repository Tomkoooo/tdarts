'use server';

import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const requestSchema = z.object({
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).default('GET'),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  body: z.any().optional(),
});

function ensureAllowedPath(path: string) {
  if (
    path.startsWith('/api/admin') ||
    path.startsWith('/api/leagues') ||
    path.startsWith('/api/feedback')
  ) {
    return;
  }
  throw new Error(`Unsupported admin api proxy path: ${path}`);
}

async function resolveBaseUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '127.0.0.1:3000';
  const proto = h.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function adminApiRequestAction(input: z.infer<typeof requestSchema>) {
  const run = withTelemetry(
    'admin.proxy.request',
    async (payload: z.infer<typeof requestSchema>) => {
      const parsed = requestSchema.parse(payload);
      ensureAllowedPath(parsed.path);

      const baseUrl = await resolveBaseUrl();
      const url = new URL(parsed.path, baseUrl);
      Object.entries(parsed.params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        url.searchParams.set(key, String(value));
      });

      const cookieStore = await cookies();
      const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

      const response = await fetch(url.toString(), {
        method: parsed.method,
        headers: {
          ...(parsed.body ? { 'Content-Type': 'application/json' } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: parsed.body ? JSON.stringify(parsed.body) : undefined,
        cache: 'no-store',
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'admin', actionName: 'adminApiRequest' },
    }
  );
  return run(input);
}
