'use server';

import { LeagueModel } from '@/database/models/league.model';
import { connectMongo } from '@/lib/mongoose';
import { withTelemetry } from '@/shared/lib/withTelemetry';

export type CheckOacLeagueActionInput = {
  clubId: string;
};

export type CheckOacLeagueActionResult = {
  oacLeague: { _id: string; name: string } | null;
};

export async function checkOacLeagueAction(input: CheckOacLeagueActionInput): Promise<CheckOacLeagueActionResult> {
  const run = withTelemetry(
    'clubs.checkOacLeague',
    async (params: CheckOacLeagueActionInput) => {
      await connectMongo();
      const league = await LeagueModel.findOne({
        club: params.clubId,
        verified: true,
        pointSystemType: 'remiz_christmas',
        isActive: true,
      }).select('_id name');

      return {
        oacLeague: league ? { _id: String(league._id), name: league.name } : null,
      };
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'checkOacLeague' } }
  );

  return run(input);
}
