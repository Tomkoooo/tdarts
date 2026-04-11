'use server';

import { LeagueService } from '@tdarts/services';
import { z } from 'zod';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';
import { AuthorizationService } from '@tdarts/services';
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

      const accessResult = await evaluateFeatureAccess({
        request: rawPayload.request,
        featureName: 'LEAGUES',
        clubId: payload.clubId,
        requiresSubscription: true,
        permissionCheck: async ({ userId }) => AuthorizationService.checkAdminOrModerator(userId, payload.clubId),
      });
      if (!accessResult.ok) {
        return accessResult;
      }

      return LeagueService.createLeague(payload.clubId, accessResult.data.userId, {
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
