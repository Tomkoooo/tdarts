'use server';

import { z } from 'zod';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { ClubModel } from '@/database/models/club.model';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const inputSchema = z.object({ clubId: z.string().min(1) });

export type PublicClubLeagueManagementMeta = {
  subscriptionModel: string;
  /** Whether this club may use league management (create/edit) per product rules — not used to gate public reading */
  managementEnabled: boolean;
};

/**
 * Public read: subscription tier + league management entitlement for UI (create buttons, upgrade CTAs).
 * Does not require login — league standings/listing must work for visitors and in-app browsers.
 */
export async function getPublicClubLeagueManagementMetaAction(
  input: z.infer<typeof inputSchema>
): Promise<PublicClubLeagueManagementMeta> {
  const run = withTelemetry(
    'clubs.getPublicLeagueManagementMeta',
    async (params: { clubId: string }) => {
      const { clubId } = inputSchema.parse(params);
      await connectMongo();
      const club = await ClubModel.findById(clubId).select('subscriptionModel').lean();
      if (!club) {
        throw new BadRequestError('Club not found');
      }
      const managementEnabled = await FeatureFlagService.isFeatureEnabled('LEAGUES', clubId);
      return {
        subscriptionModel: String((club as { subscriptionModel?: string }).subscriptionModel || 'free'),
        managementEnabled,
      };
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getPublicLeagueManagementMeta' } }
  );

  return run(input);
}
