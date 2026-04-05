import { BadRequestError, ValidationError } from '@tdarts/core';
import { googleIdTokenSchema } from '@tdarts/schemas';
import { AuthService, AuthorizationService, MediaService, ProfileService } from '@tdarts/services';
import { resolveCaller } from '../auth/resolveCaller';
import { extractBearer, json, unauthorizedCaller, unauthorizedUser } from './restCommon';

/**
 * POST /api/auth/google — Tier 1 + JSON { idToken }. Returns same shape as auth.login.
 */
export async function handleGoogleAuthPost(req: Request): Promise<Response> {
  if (!resolveCaller(req.headers)) return unauthorizedCaller();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = googleIdTokenSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }
  try {
    const result = await AuthService.loginWithGoogleIdToken(parsed.data.idToken);
    return json(result);
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return json({ error: err.message, errorCode: err.errorCode }, err.statusCode);
    }
    if (err instanceof BadRequestError) {
      return json({ error: err.message, errorCode: err.errorCode }, err.statusCode);
    }
    const msg = err instanceof Error ? err.message : 'Google sign-in failed';
    return json({ error: msg }, 500);
  }
}

/**
 * GET /api/media/:id — public binary response (same path convention as Next.js).
 */
export async function handleMediaGetRequest(_req: Request, mediaId: string): Promise<Response> {
  try {
    const media = await MediaService.getMedia(mediaId);
    return new Response(new Uint8Array(media.data), {
      status: 200,
      headers: {
        'Content-Type': media.mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Not found';
    return json({ error: msg }, 404);
  }
}

export type MediaUploadMode = 'mobile' | 'web';

/**
 * POST /api/media/upload — multipart field "file".
 * - mobile: Tier 1 + Bearer user JWT
 * - web: cookie or Bearer session (no Tier 1)
 */
export async function handleMediaUploadPost(
  req: Request,
  opts: { mode: MediaUploadMode },
): Promise<Response> {
  if (opts.mode === 'mobile' && !resolveCaller(req.headers)) {
    return unauthorizedCaller();
  }

  let userId: string | null = null;
  if (opts.mode === 'mobile') {
    const token = extractBearer(req.headers);
    if (!token) return unauthorizedUser();
    try {
      const user = await AuthService.verifyToken(token);
      userId = user._id.toString();
    } catch {
      return unauthorizedUser();
    }
  } else {
    userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) return unauthorizedUser();
  }

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
    const { url, mediaId } = await ProfileService.uploadProfileImageFromBuffer(
      userId,
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
