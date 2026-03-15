'use server';

import { GalleryService } from '@/database/services/gallery.service';
import { z } from 'zod';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const schema = z.object({
  clubId: z.string(),
});

export async function getClubGalleriesAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.getClubGalleries',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId } = parsed.data;
      const galleries = await GalleryService.getClubGalleries(clubId);
      return { galleries };
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getClubGalleries', clubId: input.clubId } }
  );
  return run(input);
}
