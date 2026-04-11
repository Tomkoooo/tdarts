import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { cache } from 'react';
import { AuthService, AuthorizationService } from '@tdarts/services';
import { AuthorizationError } from '@/middleware/errorHandle';
import { GuardResult } from '@/shared/lib/telemetry/types';
import { isLoadTestEndpointsAllowedInCurrentEnvironment } from '@/lib/load-test-environment';

export type AuthorizedSession = {
  userId: string;
};

type AuthorizeUserOptions = {
  request?: NextRequest;
};

const authorizeFromCookiesCached = cache(async (): Promise<GuardResult<AuthorizedSession>> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    };
  }

  try {
    const user = await AuthService.verifyToken(token);
    return {
      ok: true,
      data: { userId: user._id.toString() },
    };
  } catch {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    };
  }
});

export async function authorizeUserResult(options?: AuthorizeUserOptions): Promise<GuardResult<AuthorizedSession>> {
  if (
    isLoadTestEndpointsAllowedInCurrentEnvironment() &&
    process.env.LOAD_TEST_MODE === 'true' &&
    process.env.LOAD_TEST_USER_ID
  ) {
    if (!options?.request) {
      return { ok: true, data: { userId: process.env.LOAD_TEST_USER_ID } };
    }

    const loadTestSecret = options.request.headers.get('x-load-test-secret');
    const configured = process.env.LOAD_TEST_SECRET;
    if (
      loadTestSecret &&
      configured &&
      loadTestSecret.length === configured.length &&
      loadTestSecret === configured
    ) {
      return { ok: true, data: { userId: process.env.LOAD_TEST_USER_ID } };
    }
  }

  if (options?.request) {
    const userId = await AuthorizationService.getUserIdFromRequest(options.request);
    if (!userId) {
      return {
        ok: false,
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Unauthorized',
      };
    }
    return { ok: true, data: { userId } };
  }

  return authorizeFromCookiesCached();
}

export async function authorizeUser(options?: AuthorizeUserOptions): Promise<AuthorizedSession> {
  const result = await authorizeUserResult(options);
  if (!result.ok) {
    throw new AuthorizationError(result.message);
  }

  return result.data;
}
