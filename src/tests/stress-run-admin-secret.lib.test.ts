import { NextRequest } from 'next/server';
import { assertStressRunAdminSecret } from '@/lib/stress-run-admin-secret';

describe('assertStressRunAdminSecret', () => {
  const prev = process.env.STRESS_RUN_ADMIN_SECRET;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.STRESS_RUN_ADMIN_SECRET;
    } else {
      process.env.STRESS_RUN_ADMIN_SECRET = prev;
    }
  });

  it('returns null when STRESS_RUN_ADMIN_SECRET is unset', () => {
    delete process.env.STRESS_RUN_ADMIN_SECRET;
    const req = new NextRequest('http://localhost:3000/api/admin/stress-runs/start', { method: 'POST' });
    expect(assertStressRunAdminSecret(req)).toBeNull();
  });

  it('returns 403 when secret is configured but header is wrong', () => {
    process.env.STRESS_RUN_ADMIN_SECRET = 'expected';
    const req = new NextRequest('http://localhost:3000/api/admin/stress-runs/start', {
      method: 'POST',
      headers: { 'x-stress-run-admin-secret': 'wrong' },
    });
    const res = assertStressRunAdminSecret(req);
    expect(res?.status).toBe(403);
  });

  it('returns null when secret matches', () => {
    process.env.STRESS_RUN_ADMIN_SECRET = 'expected';
    const req = new NextRequest('http://localhost:3000/api/admin/stress-runs/start', {
      method: 'POST',
      headers: { 'x-stress-run-admin-secret': 'expected' },
    });
    expect(assertStressRunAdminSecret(req)).toBeNull();
  });
});
