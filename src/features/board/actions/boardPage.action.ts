'use server';

import { z } from 'zod';
import { TournamentService } from '@/database/services/tournament.service';
import { MatchService } from '@/database/services/match.service';
import { ClubService } from '@/database/services/club.service';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { revalidateTag } from 'next/cache';

const tournamentIdSchema = z.object({
  tournamentId: z.string().min(1),
});

const validateBoardPasswordSchema = z.object({
  tournamentId: z.string().min(1),
  password: z.string().min(1),
});

const boardMatchesSchema = z.object({
  tournamentId: z.string().min(1),
  boardNumber: z.number(),
});

const startBoardMatchSchema = z.object({
  tournamentId: z.string().min(1),
  boardNumber: z.number(),
  matchId: z.string().min(1),
  legsToWin: z.number(),
  startingPlayer: z.union([z.literal(1), z.literal(2)]),
});

const finishBoardMatchSchema = z.object({
  matchId: z.string().min(1),
  player1LegsWon: z.number(),
  player2LegsWon: z.number(),
  player1Stats: z
    .object({
      highestCheckout: z.number().optional(),
      oneEightiesCount: z.number().optional(),
      average: z.number().optional(),
    })
    .optional(),
  player2Stats: z
    .object({
      highestCheckout: z.number().optional(),
      oneEightiesCount: z.number().optional(),
      average: z.number().optional(),
    })
    .optional(),
});

export async function validateBoardPasswordAction(input: {
  tournamentId: string;
  password: string;
}) {
  const run = withTelemetry(
    'board.validatePassword',
    async (payload: { tournamentId: string; password: string }) => {
      const parsed = validateBoardPasswordSchema.parse(payload);
      const isValid = await TournamentService.validateTournamentByPassword(
        parsed.tournamentId,
        parsed.password
      );
      if (!isValid) {
        return { isValid: false };
      }
      const [tournament, boards] = await Promise.all([
        TournamentService.getTournamentLite(parsed.tournamentId),
        TournamentService.getBoards(parsed.tournamentId),
      ]);
      return serializeForClient({
        isValid: true,
        tournament: {
          _id: tournament._id,
          clubId: tournament.clubId,
          tournamentId: tournament.tournamentId,
          tournamentSettings: {
            status: tournament.status,
            format: tournament.format,
            startingScore: tournament.startingScore,
          },
        },
        boards,
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'validateBoardPassword' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

export async function getBoardTournamentAction(input: { tournamentId: string }) {
  const run = withTelemetry(
    'board.getTournament',
    async (payload: { tournamentId: string }) => {
      const { tournamentId } = tournamentIdSchema.parse(payload);
      const tournament = await TournamentService.getTournamentLite(tournamentId);
      return serializeForClient({
        _id: tournament._id,
        clubId: tournament.clubId,
        tournamentId: tournament.tournamentId,
        tournamentSettings: {
          status: tournament.status,
          format: tournament.format,
          startingScore: tournament.startingScore,
        },
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'getBoardTournament' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getBoardListAction(input: { tournamentId: string }) {
  const run = withTelemetry(
    'board.getBoards',
    async (payload: { tournamentId: string }) => {
      const { tournamentId } = tournamentIdSchema.parse(payload);
      const boards = await TournamentService.getBoards(tournamentId);
      return serializeForClient({ boards });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'getBoardList' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getBoardMatchesAction(input: {
  tournamentId: string;
  boardNumber: number;
}) {
  const run = withTelemetry(
    'board.getMatches',
    async (payload: { tournamentId: string; boardNumber: number }) => {
      const parsed = boardMatchesSchema.parse(payload);
      const ctx = await TournamentService.getTournamentMatchContext(parsed.tournamentId);
      const matches = await MatchService.getBoardMatches(
        parsed.tournamentId,
        ctx.clubId,
        parsed.boardNumber,
        {
          tournamentObjectId: ctx.tournamentObjectId,
          startingScore: ctx.startingScore,
        }
      );
      return serializeForClient({ matches });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'getBoardMatches' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getBoardUserRoleAction(input: { tournamentId: string }) {
  const run = withTelemetry(
    'board.getUserRole',
    async (payload: { tournamentId: string }) => {
      const { tournamentId } = tournamentIdSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return { clubRole: 'member' as const };
      const { clubId } = await TournamentService.getTournamentRoleContext(tournamentId);
      const role = await ClubService.getUserRoleInClub(authResult.data.userId, clubId);
      return serializeForClient({ clubRole: role || 'member' });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'getBoardUserRole' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function startBoardMatchAction(input: {
  tournamentId: string;
  boardNumber: number;
  matchId: string;
  legsToWin: number;
  startingPlayer: 1 | 2;
}) {
  const run = withTelemetry(
    'board.startMatch',
    async (payload: {
      tournamentId: string;
      boardNumber: number;
      matchId: string;
      legsToWin: number;
      startingPlayer: 1 | 2;
    }) => {
      const parsed = startBoardMatchSchema.parse(payload);
      const match = await MatchService.startMatch(
        parsed.tournamentId,
        parsed.matchId,
        parsed.legsToWin,
        parsed.startingPlayer
      );
      const canonicalTournamentId = String((match as any)?.tournamentCode || parsed.tournamentId);
      revalidateTag(`tournament:${parsed.tournamentId}`, 'max');
      revalidateTag(`tournament:${canonicalTournamentId}`, 'max');
      revalidateTag(`tournament:volatile:${parsed.tournamentId}`, 'max');
      revalidateTag(`tournament:volatile:${canonicalTournamentId}`, 'max');
      revalidateTag('home:tournaments', 'max');
      return serializeForClient({ success: true, match });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'startBoardMatch' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function finishBoardMatchAction(input: {
  matchId: string;
  player1LegsWon: number;
  player2LegsWon: number;
  player1Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
  player2Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
}) {
  const run = withTelemetry(
    'board.finishMatch',
    async (payload: {
      matchId: string;
      player1LegsWon: number;
      player2LegsWon: number;
      player1Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
      player2Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
    }) => {
      const parsed = finishBoardMatchSchema.parse(payload);
      const authResult = await authorizeUserResult();
      const adminId = authResult.ok ? authResult.data.userId : null;
      const match = await MatchService.finishMatch(parsed.matchId, {
        player1LegsWon: parsed.player1LegsWon,
        player2LegsWon: parsed.player2LegsWon,
        player1Stats: parsed.player1Stats,
        player2Stats: parsed.player2Stats,
        allowManualFinish: true,
        isManual: true,
        adminId,
      });
      revalidateTag('home:stats', 'max');
      revalidateTag('home:tournaments', 'max');
      revalidateTag('home:leagues', 'max');
      return serializeForClient({ success: true, match });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'finishBoardMatch' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
