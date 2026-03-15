import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { AuthorizationError } from '@/middleware/errorHandle';
import { GuardResult } from '@/shared/lib/telemetry/types';

export type AuthorizedSession = {
  userId: string;
};

type AuthorizeUserOptions = {
  request?: NextRequest;
};

export async function authorizeUserResult(options?: AuthorizeUserOptions): Promise<GuardResult<AuthorizedSession>> {
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
}

export async function authorizeUser(options?: AuthorizeUserOptions): Promise<AuthorizedSession> {
  const result = await authorizeUserResult(options);
  if (!result.ok) {
    throw new AuthorizationError(result.message);
  }

  return result.data;
}
