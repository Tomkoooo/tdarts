'use server';

import { PlayerService } from '@tdarts/services';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { BadRequestError } from '@/middleware/errorHandle';

const createPlayerInputSchema = z.object({
  data: z.object({
    userRef: z.string().optional(),
    name: z.string().min(1),
  }),
});

export type CreatePlayerActionInput = {
  request?: import('next/server').NextRequest;
  data: { userRef?: string; name: string };
};

export async function createPlayerAction(input: CreatePlayerActionInput) {
  const run = withTelemetry(
    'players.createPlayer',
    async (rawPayload: CreatePlayerActionInput) => {
      const parsedPayload = createPlayerInputSchema.safeParse({
        data: rawPayload.data,
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

      return PlayerService.createPlayer(payload.data);
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'players',
        actionName: 'createPlayer',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
