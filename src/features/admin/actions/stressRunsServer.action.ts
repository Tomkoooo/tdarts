'use server';

import { cookies, headers } from 'next/headers';
import { STRESS_RUN_ADMIN_SECRET_HEADER } from '@/lib/stress-run-admin-secret';

async function resolveBaseUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '127.0.0.1:3000';
  const proto = h.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

async function stressRunMutatingFetch(
  path: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const baseUrl = await resolveBaseUrl();
  const url = new URL(path, baseUrl);
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  const hdrs = new Headers(init.headers);
  if (init.body !== undefined) {
    hdrs.set('Content-Type', 'application/json');
  }
  if (cookieHeader) {
    hdrs.set('Cookie', cookieHeader);
  }
  const secret = process.env.STRESS_RUN_ADMIN_SECRET?.trim();
  if (secret) {
    hdrs.set(STRESS_RUN_ADMIN_SECRET_HEADER, secret);
  }

  const res = await fetch(url.toString(), { ...init, headers: hdrs, cache: 'no-store' });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

export type StressRunStartPayload = Record<string, unknown>;

export async function startStressRunAction(body: StressRunStartPayload) {
  const { ok, status, data } = await stressRunMutatingFetch('/api/admin/stress-runs/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!ok) {
    const err = (data as { error?: string })?.error || `Request failed (${status})`;
    return { ok: false as const, status, error: err, data };
  }
  return { ok: true as const, status, data };
}

export async function stopStressRunAction(runId: string) {
  const { ok, status, data } = await stressRunMutatingFetch(
    `/api/admin/stress-runs/${encodeURIComponent(runId)}/stop`,
    { method: 'POST' }
  );
  if (!ok) {
    const err = (data as { error?: string })?.error || `Request failed (${status})`;
    return { ok: false as const, status, error: err, data };
  }
  return { ok: true as const, status, data };
}
