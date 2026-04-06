import { AppUpdatesService } from '@tdarts/services';
import { json } from './restCommon';

/**
 * GET /api/updates — public version / client-hint manifest (no Tier 1).
 */
export async function handleUpdatesGet(): Promise<Response> {
  const manifest = AppUpdatesService.getPublicManifest();
  return json(manifest, 200, {
    'Cache-Control': 'public, max-age=60',
  });
}
