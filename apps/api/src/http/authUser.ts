import { AuthService, AuthorizationService } from '@tdarts/services';
import { resolveCaller } from '../auth/resolveCaller';
import type { NativeRouteMode } from './restCommon';

export function requireMobileTier1(mode: NativeRouteMode, headers: Headers): boolean {
  if (mode === 'mobile') return !!resolveCaller(headers);
  return true;
}

export async function resolveAuthedUserId(req: Request, mode: NativeRouteMode): Promise<string | null> {
  if (mode === 'mobile') {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token) return null;
    try {
      const user = await AuthService.verifyToken(token);
      return user._id.toString();
    } catch {
      return null;
    }
  }
  return AuthorizationService.getUserIdFromRequest(req);
}
