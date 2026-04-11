'use server';

import { GalleryService } from '@tdarts/services';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
  galleryId: z.string(),
  name: z.string().min(1).optional(),
  images: z.array(z.string()).optional(),
});

export async function updateGalleryAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.updateGallery',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, galleryId, name, images } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const eligibilityResult = await assertEligibilityResult({ clubId, allowPaidOverride: true });
      if (!eligibilityResult.ok) return eligibilityResult;
      const data: { name?: string; images?: string[] } = {};
      if (name !== undefined) data.name = name;
      if (images !== undefined) data.images = images;
      return GalleryService.updateGallery(galleryId, clubId, data);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'updateGallery', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
