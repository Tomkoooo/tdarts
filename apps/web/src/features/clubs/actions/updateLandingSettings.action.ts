'use server';

import { ClubService } from '@/database/services/club.service';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const landingSettingsSchema = z.record(z.unknown());

const schema = z.object({
  clubId: z.string(),
  landingPage: landingSettingsSchema,
});

export async function updateLandingSettingsAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.updateLandingSettings',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, landingPage } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const eligibilityResult = await assertEligibilityResult({ clubId, allowPaidOverride: true });
      if (!eligibilityResult.ok) return eligibilityResult;
      return ClubService.updateLandingSettings(clubId, authResult.data.userId, landingPage);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'updateLandingSettings', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
