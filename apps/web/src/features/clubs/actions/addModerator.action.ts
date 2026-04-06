'use server';

import { ClubService } from '@/database/services/club.service';
import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
  userId: z.string(), // Player ID
});

export async function addModeratorAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.addModerator',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, userId } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await ClubService.addModerator(clubId, userId, authResult.data.userId);
      return { ok: true as const };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'addModerator', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
