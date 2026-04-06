import { BadRequestError, UserModel, ValidationError } from '@tdarts/core';
import { PlayerService } from '@tdarts/services';
import { json, unauthorizedCaller, unauthorizedUser, type NativeRouteMode } from './restCommon';
import { requireMobileTier1, resolveAuthedUserId } from './authUser';

/**
 * GET /api/players/:id/avatar — public avatar URL resolver.
 */
export async function handlePlayerAvatarGet(playerId: string): Promise<Response> {
  try {
    const player = await PlayerService.findPlayerById(playerId);
    if (!player) {
      return json({ imageUrl: null }, 200);
    }

    const playerImage =
      (typeof player.profilePicture === 'string' && player.profilePicture.trim() !== ''
        ? player.profilePicture
        : null) || null;
    const userImage =
      playerImage || !player.userRef
        ? null
        : (await UserModel.findById(player.userRef).select('profilePicture').lean())?.profilePicture || null;
    const imageUrl = playerImage || userImage;

    return json({ imageUrl }, 200);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Avatar fetch failed';
    return json({ error: msg }, 400);
  }
}

/**
 * POST /api/players/:id/avatar — multipart field "file". Owner or global admin.
 */
export async function handlePlayerAvatarPost(
  req: Request,
  playerId: string,
  opts: { mode: NativeRouteMode },
): Promise<Response> {
  if (!requireMobileTier1(opts.mode, req.headers)) return unauthorizedCaller();
  const userId = await resolveAuthedUserId(req, opts.mode);
  if (!userId) return unauthorizedUser();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ error: 'Expected multipart form data' }, 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return json({ error: 'Missing file field' }, 400);
  }

  const blob = file as File;
  const mimeType = blob.type || 'application/octet-stream';
  const buf = Buffer.from(await blob.arrayBuffer());
  const filename = blob.name || 'upload';

  try {
    const { url, mediaId } = await PlayerService.uploadPlayerAvatarFromBuffer(
      userId,
      playerId,
      buf,
      mimeType,
      filename,
      buf.length,
    );
    return json({ ok: true, url, mediaId });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return json({ error: err.message, errorCode: err.errorCode }, err.statusCode);
    }
    if (err instanceof BadRequestError) {
      return json({ error: err.message, errorCode: err.errorCode }, err.statusCode);
    }
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return json({ error: msg }, 400);
  }
}
