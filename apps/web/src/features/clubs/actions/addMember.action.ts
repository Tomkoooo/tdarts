'use server';

import { ClubService } from '@/database/services/club.service';
import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
  userId: z.string(), // Player ID or User ID
});

export async function addMemberAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.addMember',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, userId } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await ClubService.addMember(clubId, userId, authResult.data.userId);
      return { ok: true as const };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'addMember', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
