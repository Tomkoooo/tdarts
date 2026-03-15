import jwt from 'jsonwebtoken';
import { AuthService } from '@/database/services/auth.service';
import { assertEligibilityResult } from '@/shared/lib/guards';

type SocketAuthResult =
  | { ok: true; token: string }
  | { ok: false; status: number; error: string };

export async function issueSocketAuthToken(input: { token?: string; clubId?: string }): Promise<SocketAuthResult> {
  const jwtSecret = process.env.SOCKET_JWT_SECRET;
  if (!jwtSecret) {
    return {
      ok: false,
      status: 503,
      error: 'Socket authentication not configured. Please set SOCKET_JWT_SECRET environment variable.',
    };
  }

  let userId: string | null = null;
  let userRole: 'guest' | 'user' | 'admin' = 'guest';
  if (input.token) {
    try {
      const user = await AuthService.verifyToken(input.token);
      userId = user._id.toString();
      userRole = user.isAdmin ? 'admin' : 'user';
    } catch {
      userId = null;
      userRole = 'guest';
    }
  }

  if (input.clubId) {
    const eligibility = await assertEligibilityResult({
      featureName: 'socket',
      clubId: input.clubId,
      allowPaidOverride: true,
    });
    if (!eligibility.ok) {
      return {
        ok: false,
        status: eligibility.status,
        error: eligibility.message,
      };
    }
  }

  const socketToken = jwt.sign(
    {
      userId: userId || 'guest',
      userRole,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),
    },
    jwtSecret
  );

  return { ok: true, token: socketToken };
}
