'use server';

import { ClubService } from '@/database/services/club.service';
import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
});

export async function geocodeClubAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.geocodeClub',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const club = await ClubService.requestClubGeocode(clubId, authResult.data.userId);
      return { club };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'geocodeClub', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
