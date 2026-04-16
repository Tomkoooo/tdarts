import { AuthService } from '@tdarts/services';
import { json, unauthorizedCaller, unauthorizedUser, type NativeRouteMode } from './restCommon';
import { requireMobileTier1, resolveAuthedUserId } from './authUser';

/**
 * POST /api/socket/auth — exchange session / Bearer JWT for a short-lived socket token.
 */
export async function handleSocketAuthPost(
  req: Request,
  opts: { mode: NativeRouteMode },
): Promise<Response> {
  if (!requireMobileTier1(opts.mode, req.headers)) return unauthorizedCaller();
  const userId = await resolveAuthedUserId(req, opts.mode);
  if (!userId) return unauthorizedUser();
  const { token, expiresInSec } = AuthService.issueSocketToken(userId);
  // `token` — legacy web client; `socketToken` — native clients (see nativeRestHandlers tests).
  return json({ token, socketToken: token, expiresInSec });
}
