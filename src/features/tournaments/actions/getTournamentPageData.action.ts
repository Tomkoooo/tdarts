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
  view?: 'overview' | 'players' | 'boards' | 'groups' | 'bracket' | 'full';
  bypassCache?: boolean;
  freshness?: 'default' | 'volatile' | 'force-fresh';
};

export type GetTournamentPageLiteInput = {
  code: string;
  bypassCache?: boolean;
  freshness?: 'default' | 'volatile' | 'force-fresh';
};

const legacyTournamentTag = (code: string) => `tournament:${code}`;
const stableTournamentTag = (code: string) => `tournament:stable:${code}`;
const volatileTournamentTag = (code: string) => `tournament:volatile:${code}`;
const fullTournamentTag = (code: string) => `tournament:full:${code}`;

const getCachedTournamentSummary = (code: string) =>
  unstable_cache(
    () => TournamentService.getTournamentSummaryForPublicPage(code),
    [`tournament-summary`, code],
    { tags: [legacyTournamentTag(code), fullTournamentTag(code)], revalidate: 15 },
  )();

const getCachedTournamentLite = (code: string) =>
  unstable_cache(
    () => TournamentService.getTournamentLite(code),
    [`tournament-lite`, code],
    { tags: [legacyTournamentTag(code), volatileTournamentTag(code)], revalidate: 2 },
  )();

function shouldBypassCache(params: { bypassCache: boolean; freshness: NonNullable<GetTournamentPageDataInput['freshness']> }) {
  return params.bypassCache || params.freshness === 'force-fresh';
}

function resolveSection(view: NonNullable<GetTournamentPageDataInput['view']>) {
  if (view === 'players' || view === 'boards' || view === 'groups' || view === 'bracket') {
    return view;
  }
  return 'overview';
}

export async function getTournamentPageDataAction(input: GetTournamentPageDataInput) {
  const run = withTelemetry(
    'tournaments.getTournamentPageData',
    async (params: GetTournamentPageDataInput) => {
      const {
        code,
        includeViewer = false,
        view = 'overview',
        bypassCache = false,
        freshness = 'default',
      } = params;
      if (!code) {
        throw new BadRequestError('code is required');
      }

      const section = resolveSection(view);
      const noCache = shouldBypassCache({ bypassCache, freshness });
      const sectionRevalidate = freshness === 'volatile' ? 3 : 10;
      const tournament = noCache
        ? view === 'full'
          ? await TournamentService.getTournamentSummaryForPublicPage(code)
          : await TournamentService.getTournamentReadModelForSection(code, section)
        : view === 'full'
          ? await getCachedTournamentSummary(code)
          : await unstable_cache(
              () => TournamentService.getTournamentReadModelForSection(code, section),
              [`tournament-section`, code, section, freshness],
              {
                tags: [
                  legacyTournamentTag(code),
                  freshness === 'volatile' ? volatileTournamentTag(code) : stableTournamentTag(code),
                  `tournament:${code}:${section}`,
                ],
                revalidate: sectionRevalidate,
              },
            )();

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
      const userPlayerStatusPromise = TournamentService.getPlayerStatusInTournament(
        code,
        authResult.data.userId,
      );

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
      const { code, bypassCache = false } = params;
      const freshness = params.freshness ?? 'volatile';
      if (!code) {
        throw new BadRequestError('code is required');
      }

      const lite = shouldBypassCache({ bypassCache, freshness })
        ? await TournamentService.getTournamentLite(code)
        : await getCachedTournamentLite(code);
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
