'use server';

import { z } from 'zod';
import { TournamentService } from '@/database/services/tournament.service';
import { MatchService } from '@/database/services/match.service';
import { ClubService } from '@/database/services/club.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { revalidateTag } from 'next/cache';

const tournamentIdSchema = z.object({
  tournamentId: z.string().min(1),
});

const boardAccessSchema = z.object({
  tournamentId: z.string().min(1),
  password: z.string().optional(),
});

const validateBoardPasswordSchema = z.object({
  tournamentId: z.string().min(1),
  password: z.string().min(1),
});

const boardMatchesSchema = z.object({
  tournamentId: z.string().min(1),
  boardNumber: z.number(),
  password: z.string().optional(),
});

const startBoardMatchSchema = z.object({
  tournamentId: z.string().min(1),
  boardNumber: z.number(),
  matchId: z.string().min(1),
  legsToWin: z.number(),
  startingPlayer: z.union([z.literal(1), z.literal(2)]),
  password: z.string().optional(),
});

const finishBoardMatchSchema = z.object({
  tournamentId: z.string().min(1).optional(),
  matchId: z.string().min(1),
  player1LegsWon: z.number(),
  player2LegsWon: z.number(),
  password: z.string().optional(),
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

async function assertBoardAccess(params: { tournamentId: string; password?: string }) {
  const authResult = await authorizeUserResult();
  if (authResult.ok) {
    const status = await TournamentService.getPlayerStatusInTournament(
      params.tournamentId,
      authResult.data.userId
    );
    if (status === 'checked-in') {
      return;
    }

    try {
      const { clubId } = await TournamentService.getTournamentRoleContext(params.tournamentId);
      const [isPrivileged, isGlobalAdmin] = await Promise.all([
        AuthorizationService.checkAdminOrModerator(authResult.data.userId, clubId),
        AuthorizationService.isGlobalAdmin(authResult.data.userId),
      ]);
      if (isPrivileged || isGlobalAdmin) {
        return;
      }
    } catch {
      // Ignore role check failures and continue to password fallback.
    }
  }

  if (params.password) {
    const ok = await TournamentService.validateTournamentByPassword(
      params.tournamentId,
      params.password
    );
    if (ok) {
      return;
    }
  }

  throw new Error('Unauthorized board access');
}

export async function getBoardPasswordBypassStatusAction(input: { tournamentId: string }) {
  const run = withTelemetry(
    'board.getPasswordBypassStatus',
    async (payload: { tournamentId: string }) => {
      const { tournamentId } = tournamentIdSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return serializeForClient({ canBypass: false });
      }
      const status = await TournamentService.getPlayerStatusInTournament(
        tournamentId,
        authResult.data.userId
      );
      if (status === 'checked-in') {
        return serializeForClient({ canBypass: true });
      }

      try {
        const { clubId } = await TournamentService.getTournamentRoleContext(tournamentId);
        const [isPrivileged, isGlobalAdmin] = await Promise.all([
          AuthorizationService.checkAdminOrModerator(authResult.data.userId, clubId),
          AuthorizationService.isGlobalAdmin(authResult.data.userId),
        ]);
        return serializeForClient({ canBypass: isPrivileged || isGlobalAdmin });
      } catch {
        return serializeForClient({ canBypass: false });
      }
    },
    {
      method: 'ACTION',
      metadata: { feature: 'board', actionName: 'getBoardPasswordBypassStatus' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

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

export async function getBoardTournamentAction(input: { tournamentId: string; password?: string }) {
  const run = withTelemetry(
    'board.getTournament',
    async (payload: { tournamentId: string; password?: string }) => {
      const parsed = boardAccessSchema.parse(payload);
      await assertBoardAccess({ tournamentId: parsed.tournamentId, password: parsed.password });
      const tournament = await TournamentService.getTournamentLite(parsed.tournamentId);
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

export async function getBoardListAction(input: { tournamentId: string; password?: string }) {
  const run = withTelemetry(
    'board.getBoards',
    async (payload: { tournamentId: string; password?: string }) => {
      const parsed = boardAccessSchema.parse(payload);
      await assertBoardAccess({ tournamentId: parsed.tournamentId, password: parsed.password });
      const boards = await TournamentService.getBoards(parsed.tournamentId);
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
  password?: string;
}) {
  const run = withTelemetry(
    'board.getMatches',
    async (payload: { tournamentId: string; boardNumber: number; password?: string }) => {
      const parsed = boardMatchesSchema.parse(payload);
      await assertBoardAccess({ tournamentId: parsed.tournamentId, password: parsed.password });
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

export async function getBoardUserRoleAction(input: { tournamentId: string; password?: string }) {
  const run = withTelemetry(
    'board.getUserRole',
    async (payload: { tournamentId: string; password?: string }) => {
      const parsed = boardAccessSchema.parse(payload);
      await assertBoardAccess({ tournamentId: parsed.tournamentId, password: parsed.password });
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return { clubRole: 'member' as const };
      const { clubId } = await TournamentService.getTournamentRoleContext(parsed.tournamentId);
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
  password?: string;
}) {
  const run = withTelemetry(
    'board.startMatch',
    async (payload: {
      tournamentId: string;
      boardNumber: number;
      matchId: string;
      legsToWin: number;
      startingPlayer: 1 | 2;
      password?: string;
    }) => {
      const parsed = startBoardMatchSchema.parse(payload);
      await assertBoardAccess({ tournamentId: parsed.tournamentId, password: parsed.password });
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
  tournamentId?: string;
  matchId: string;
  player1LegsWon: number;
  player2LegsWon: number;
  player1Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
  player2Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
  password?: string;
}) {
  const run = withTelemetry(
    'board.finishMatch',
    async (payload: {
      tournamentId?: string;
      matchId: string;
      player1LegsWon: number;
      player2LegsWon: number;
      player1Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
      player2Stats?: { highestCheckout?: number; oneEightiesCount?: number; average?: number };
      password?: string;
    }) => {
      const parsed = finishBoardMatchSchema.parse(payload);
      const tournamentIdForAccess =
        (parsed.tournamentId && parsed.tournamentId.trim()) ||
        (await MatchService.getTournamentIdStringForMatch(parsed.matchId));
      await assertBoardAccess({ tournamentId: tournamentIdForAccess, password: parsed.password });
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
      const canonicalTournamentId = String((match as any)?.tournamentCode || (match as any)?.tournamentId || '');
      if (canonicalTournamentId) {
        revalidateTag(`tournament:${canonicalTournamentId}`, 'max');
        revalidateTag(`tournament:stable:${canonicalTournamentId}`, 'max');
        revalidateTag(`tournament:volatile:${canonicalTournamentId}`, 'max');
      }
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
