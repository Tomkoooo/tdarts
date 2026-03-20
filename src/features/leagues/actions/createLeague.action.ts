'use server';

import { LeagueService } from '@/database/services/league.service';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const createLeagueInputSchema = z.object({
  clubId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateLeagueActionInput = {
  request?: import('next/server').NextRequest;
  clubId: string;
  name: string;
  description?: string;
};

export async function createLeagueAction(input: CreateLeagueActionInput) {
  const run = withTelemetry(
    'leagues.createLeague',
    async (rawPayload: CreateLeagueActionInput) => {
      const parsedPayload = createLeagueInputSchema.safeParse({
        clubId: rawPayload.clubId,
        name: rawPayload.name,
        description: rawPayload.description,
      });
      if (!parsedPayload.success) throw new BadRequestError(parsedPayload.error.issues[0]?.message || 'Invalid payload');
      const payload = parsedPayload.data;

      const authResult = await authorizeUserResult(rawPayload.request ? { request: rawPayload.request } : undefined);
      if (!authResult.ok) {
        return authResult;
      }

      const eligibilityResult = await assertEligibilityResult({
        featureName: 'leagues',
        clubId: payload.clubId,
        allowPaidOverride: true,
      });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      return LeagueService.createLeague(payload.clubId, authResult.data.userId, {
        name: payload.name,
        description: payload.description,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        pointSystemType: 'platform',
      });
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'leagues',
        actionName: 'createLeague',
        clubId: input.clubId,
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
