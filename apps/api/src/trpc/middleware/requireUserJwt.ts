import { TRPCError } from '@trpc/server';
import { middleware } from '../init';
import { AuthService } from '@tdarts/services';

/**
 * Tier 2 — Platform user JWT.
 *
 * Validates `Authorization: Bearer <user_jwt>` using the shared AuthService.
 * Must run AFTER requireKnownCaller (caller must already be admitted).
 * On success, sets ctx.userId for downstream procedures.
 */
export const requireUserJwt = middleware(async ({ ctx, next }) => {
  const authorization = ctx.req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing Authorization header (Bearer <user_jwt> required)',
    });
  }

  const token = authorization.slice(7);

  let userId: string;
  try {
    const user = await AuthService.verifyToken(token);
    if (!user || !user._id) {
      throw new Error('Invalid token payload');
    }
    userId = String(user._id);
  } catch {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired user token',
    });
  }

  return next({ ctx: { ...ctx, userId } });
});
