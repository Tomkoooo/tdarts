import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const STRESS_RUN_ADMIN_SECRET_HEADER = 'x-stress-run-admin-secret';

function timingSafeStringEqual(expected: string, provided: string): boolean {
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * When STRESS_RUN_ADMIN_SECRET is set, mutating stress-run admin routes require the matching header.
 * When unset, no extra check (local dev convenience).
 */
export function assertStressRunAdminSecret(request: NextRequest): NextResponse | null {
  const configured = process.env.STRESS_RUN_ADMIN_SECRET?.trim();
  if (!configured) {
    return null;
  }

  const provided = request.headers.get(STRESS_RUN_ADMIN_SECRET_HEADER) ?? '';
  if (!timingSafeStringEqual(configured, provided)) {
    return NextResponse.json({ error: 'Invalid or missing stress run admin secret' }, { status: 403 });
  }

  return null;
}
