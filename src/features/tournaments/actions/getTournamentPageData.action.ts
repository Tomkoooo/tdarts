'use server';

import { unstable_cache } from 'next/cache';
import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { authorizeUserResult } from '@/shared/lib/guards';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export type GetTournamentPageDataInput = {
  code: string;
  includeViewer?: boolean;
  detailLevel?: 'overview' | 'full';
};

export type GetTournamentPageLiteInput = {
  code: string;
};

const getCachedTournamentSummary = (code: string) =>
  unstable_cache(
    () => TournamentService.getTournamentSummaryForPublicPage(code),
    [`tournament-summary`, code],
    { tags: [`tournament:${code}`], revalidate: 30 },
  )();

const getCachedTournamentOverview = (code: string) =>
  unstable_cache(
    () => TournamentService.getTournamentSummaryOverviewForPublicPage(code),
    [`tournament-overview`, code],
    { tags: [`tournament:${code}`], revalidate: 10 },
  )();

const getCachedTournamentLite = (code: string) =>
  unstable_cache(
    () => TournamentService.getTournamentLite(code),
    [`tournament-lite`, code],
    { tags: [`tournament:${code}`], revalidate: 10 },
  )();

function resolveViewerStatusFromFullTournament(tournament: any, userId: string): string {
  const matchesUser = (playerRef: any) => {
    if (!playerRef) return false;
    if (playerRef?.userRef === userId) return true;
    if (playerRef?.userRef?._id?.toString?.() === userId) return true;
    if (Array.isArray(playerRef?.members)) {
      return playerRef.members.some((member: any) => {
        if (!member) return false;
        if (member?.userRef === userId) return true;
        if (member?.userRef?._id?.toString?.() === userId) return true;
        if (member?._id?.toString?.() === userId) return true;
        return false;
      });
    }
    return false;
  };

  const tournamentPlayer = (tournament?.tournamentPlayers || []).find((entry: any) =>
    matchesUser(entry?.playerReference),
  );
  if (tournamentPlayer?.status) {
    return String(tournamentPlayer.status);
  }

  const waitingPlayer = (tournament?.waitingList || []).find((entry: any) =>
    matchesUser(entry?.playerReference),
  );
  if (waitingPlayer) {
    return 'applied';
  }

  return 'none';
}

export async function getTournamentPageDataAction(input: GetTournamentPageDataInput) {
  const run = withTelemetry(
    'tournaments.getTournamentPageData',
    async (params: GetTournamentPageDataInput) => {
      const { code, includeViewer = false, detailLevel = 'overview' } = params;
      if (!code) {
        throw new BadRequestError('code is required');
      }

      const tournament =
        detailLevel === 'full'
          ? await getCachedTournamentSummary(code)
          : await getCachedTournamentOverview(code);

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

      // Security boundary: viewer identity must come from the server session only.
      const userClubRolePromise = ClubService.getUserRoleInClub(authResult.data.userId, clubId);
      const userPlayerStatusPromise =
        detailLevel === 'full'
          ? Promise.resolve(resolveViewerStatusFromFullTournament(tournament, authResult.data.userId))
          : TournamentService.getPlayerStatusInTournament(code, authResult.data.userId);

      const [userClubRole, userPlayerStatus] = await Promise.all([
        userClubRolePromise,
        userPlayerStatusPromise,
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

export async function getTournamentPageLiteAction(input: GetTournamentPageLiteInput) {
  const run = withTelemetry(
    'tournaments.getTournamentPageLite',
    async (params: GetTournamentPageLiteInput) => {
      const { code } = params;
      if (!code) {
        throw new BadRequestError('code is required');
      }

      const lite = await getCachedTournamentLite(code);
      return serializeForClient({
        tournament: {
          _id: lite._id,
          tournamentId: lite.tournamentId,
          clubId: lite.clubId,
          tournamentSettings: {
            status: lite.status,
            format: lite.format,
            startingScore: lite.startingScore,
          },
          isSandbox: lite.isSandbox,
          boards: lite.boards,
        },
      });
    },
    { method: 'ACTION', metadata: { feature: 'tournaments', actionName: 'getTournamentPageLite' } }
  );

  return run(input);
}
