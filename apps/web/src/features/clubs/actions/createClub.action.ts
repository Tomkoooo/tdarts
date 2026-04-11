'use server';

import { ClubService } from '@tdarts/services';
import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

const schema = z.object({
  creatorId: z.string(),
  clubData: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    location: z.string().min(1),
    country: z.string().optional(),
    contact: z
      .object({
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
  }),
});

export async function createClubAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.createClub',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { creatorId, clubData } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      if (authResult.data.userId !== creatorId) {
        throw new BadRequestError('Creator must match authenticated user');
      }
      const { name, description, location, contact } = clubData;
      const club = await ClubService.createClub(creatorId, { name, description, location, contact });
      return serializeForClient(club);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'createClub' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
