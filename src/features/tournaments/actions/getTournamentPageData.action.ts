'use server';

import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { authorizeUserResult } from '@/shared/lib/guards';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export type GetTournamentPageDataInput = {
  code: string;
  includeViewer?: boolean;
};

export async function getTournamentPageDataAction(input: GetTournamentPageDataInput) {
  const run = withTelemetry(
    'tournaments.getTournamentPageData',
    async (params: GetTournamentPageDataInput) => {
      const { code, includeViewer = false } = params;
      if (!code) {
        throw new BadRequestError('code is required');
      }

      const tournament = await TournamentService.getTournamentSummaryForPublicPage(code);

      if (!includeViewer) {
        return serializeForClient({ tournament });
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return serializeForClient({
          tournament,
          viewer: { userClubRole: 'none', userPlayerStatus: 'none' },
        });
      }

      const clubId = typeof tournament.clubId === 'object' && tournament.clubId?._id
        ? String(tournament.clubId._id)
        : String(tournament.clubId);

      const [userClubRole, userPlayerStatus] = await Promise.all([
        ClubService.getUserRoleInClub(authResult.data.userId, clubId),
        TournamentService.getPlayerStatusInTournament(code, authResult.data.userId),
      ]);

      return serializeForClient({
        tournament,
        viewer: {
          userClubRole,
          userPlayerStatus: userPlayerStatus || 'none',
        },
      });
    },
    { method: 'ACTION', metadata: { feature: 'tournaments', actionName: 'getTournamentPageData' } }
  );

  return run(input);
}
