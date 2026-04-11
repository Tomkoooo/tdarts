import jwt from 'jsonwebtoken';
import { AuthService } from '@tdarts/services';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';

type SocketAuthResult =
  | { ok: true; token: string; expiresAt: number; issuedAt: number; ttlSeconds: number }
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
    const accessResult = await evaluateFeatureAccess({
      featureName: 'SOCKET',
      clubId: input.clubId,
      requiresSubscription: true,
    });
    if (!accessResult.ok) {
      return {
        ok: false,
        status: accessResult.status,
        error: accessResult.message,
      };
    }
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const ttlSeconds = 60 * 60 * 4; // 4 hours (reduced from 24 hours for security)
  const expiresAt = issuedAt + ttlSeconds;
  const socketToken = jwt.sign(
    {
      userId: userId || 'guest',
      userRole,
      iat: issuedAt,
      exp: expiresAt,
    },
    jwtSecret
  );

  return { ok: true, token: socketToken, expiresAt, issuedAt, ttlSeconds };
}
