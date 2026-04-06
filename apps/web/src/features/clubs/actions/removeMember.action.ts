'use server';

import { ClubService } from '@/database/services/club.service';
import { PlayerModel } from '@/database/models/player.model';
import { connectMongo } from '@/lib/mongoose';
import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
  userId: z.string(), // Player ID or User ID (for self-removal)
});

export async function removeMemberAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.removeMember',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, userId } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      // Resolve User ID to Player ID when it's self-removal (club.members stores Player IDs)
      let memberIdToRemove = userId;
      const player = await (async () => {
        await connectMongo();
        return PlayerModel.findOne({ userRef: userId });
      })();
      if (player && userId === authResult.data.userId) {
        memberIdToRemove = player._id.toString();
      }
      await ClubService.removeMember(clubId, memberIdToRemove, authResult.data.userId);
      return { ok: true as const };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'removeMember', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
