'use server';

import { ClubService } from '@/database/services/club.service';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import type { BillingInfo } from '@/interface/club.interface';

const updateClubUpdatesSchema = z.object({
  _id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  contact: z
    .object({
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  billingInfo: z.custom<BillingInfo>().optional(),
});

const updateClubInputSchema = z.object({
  clubId: z.string().optional(),
  updates: updateClubUpdatesSchema,
});

export type UpdateClubUpdatesInput = z.infer<typeof updateClubUpdatesSchema>;
export type UpdateClubActionInput = {
  request?: import('next/server').NextRequest;
  clubId?: string;
  updates: UpdateClubUpdatesInput;
};

export async function updateClubAction(input: UpdateClubActionInput) {
  const run = withTelemetry(
    'clubs.updateClub',
    async (rawPayload: UpdateClubActionInput) => {
      const parsedPayload = updateClubInputSchema.safeParse({
        clubId: rawPayload.clubId,
        updates: rawPayload.updates,
      });
      if (!parsedPayload.success) {
        throw new BadRequestError(parsedPayload.error.issues[0]?.message || 'Invalid update club payload');
      }
      const payload = parsedPayload.data;

      const authResult = await authorizeUserResult(rawPayload.request ? { request: rawPayload.request } : undefined);
      if (!authResult.ok) {
        return authResult;
      }

      const clubId = payload.clubId || payload.updates?._id;
      if (!clubId) {
        throw new BadRequestError('clubId is required');
      }

      const eligibilityResult = await assertEligibilityResult({
        clubId,
        allowPaidOverride: true,
      });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      return ClubService.updateClub(clubId, authResult.data.userId, payload.updates);
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'clubs',
        actionName: 'updateClub',
        clubId: input.clubId || input.updates?._id,
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
