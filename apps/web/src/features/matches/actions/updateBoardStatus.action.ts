'use server';

import { TournamentService } from '@/database/services/tournament.service';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const updateBoardStatusInputSchema = z.object({
  matchId: z.string().min(1),
});

export type UpdateBoardStatusInput = {
  request?: import('next/server').NextRequest;
  matchId: string;
};

export async function updateBoardStatusAction(input: UpdateBoardStatusInput) {
  const run = withTelemetry(
    'matches.updateBoardStatus',
    async (rawPayload: UpdateBoardStatusInput) => {
      const parsedPayload = updateBoardStatusInputSchema.safeParse({
        matchId: rawPayload.matchId,
      });
      if (!parsedPayload.success) throw new BadRequestError(parsedPayload.error.issues[0]?.message || 'Invalid payload');
      const payload = parsedPayload.data;

      const authResult = await authorizeUserResult(rawPayload.request ? { request: rawPayload.request } : undefined);
      if (!authResult.ok) {
        return authResult;
      }

      const eligibilityResult = await assertEligibilityResult({ allowPaidOverride: true });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      const result = await TournamentService.updateBoardStatusAfterMatch(payload.matchId);
      if (!result) {
        throw new BadRequestError('Failed to update board status');
      }

      return {
        success: true,
        message: 'Board status updated successfully',
      };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'matches',
        actionName: 'updateBoardStatus',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
