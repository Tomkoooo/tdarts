'use server';

import { z } from 'zod';
import { MatchService } from '@/database/services/match.service';
import { MatchModel } from '@/database/models/match.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { connectMongo } from '@/lib/mongoose';
import { eventEmitter, EVENTS, createSseDeltaPayload } from '@/lib/events';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { authorizeUserResult } from '@/shared/lib/guards';
import { serializeForClient } from '@/shared/lib/serializeForClient';

const finishLegSchema = z.object({
  matchId: z.string().min(1),
  winner: z.union([z.literal(1), z.literal(2)]),
  player1Throws: z.array(z.number()),
  player2Throws: z.array(z.number()),
  winnerArrowCount: z.number().optional(),
  legNumber: z.number().optional(),
});

export async function finishMatchLegAction(input: z.infer<typeof finishLegSchema>) {
  const run = withTelemetry(
    'matches.finishLeg',
    async (payload: z.infer<typeof finishLegSchema>) => {
      const parsed = finishLegSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const data = parsed.data;
      await MatchService.finishLeg(data.matchId, {
        winner: data.winner,
        player1Throws: data.player1Throws,
        player2Throws: data.player2Throws,
        winnerArrowCount: data.winnerArrowCount,
        legNumber: data.legNumber,
      });

      return serializeForClient({
        success: true,
        message: 'Leg finished successfully',
        matchId: data.matchId,
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'matches', actionName: 'finishMatchLeg' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

const undoLegSchema = z.object({
  matchId: z.string().min(1),
});

export async function undoMatchLegAction(input: z.infer<typeof undoLegSchema>) {
  const run = withTelemetry(
    'matches.undoLeg',
    async (payload: z.infer<typeof undoLegSchema>) => {
      const parsed = undoLegSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await MatchService.undoLastLeg(parsed.data.matchId);
      return serializeForClient({
        success: true,
        message: 'Last leg undone successfully',
        matchId: parsed.data.matchId,
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'matches', actionName: 'undoMatchLeg' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

const updateSettingsSchema = z
  .object({
    matchId: z.string().min(1),
    legsToWin: z.number().int().min(1).max(20).optional(),
    startingPlayer: z.union([z.literal(1), z.literal(2)]).optional(),
  })
  .refine(
    (v) => v.legsToWin !== undefined || v.startingPlayer !== undefined,
    'At least one setting must be provided'
  );

export async function updateMatchGameplaySettingsAction(input: z.infer<typeof updateSettingsSchema>) {
  const run = withTelemetry(
    'matches.updateGameplaySettings',
    async (payload: z.infer<typeof updateSettingsSchema>) => {
      const parsed = updateSettingsSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const data = parsed.data;

      await connectMongo();
      const match = await MatchModel.findById(data.matchId).select(
        '_id status tournamentRef legsToWin startingPlayer'
      );
      if (!match) {
        throw new BadRequestError('Match not found');
      }

      if (match.status !== 'ongoing') {
        throw new BadRequestError('Can only update ongoing matches');
      }

      if (data.legsToWin !== undefined) {
        match.legsToWin = data.legsToWin;
      }
      if (data.startingPlayer !== undefined) {
        match.startingPlayer = data.startingPlayer;
      }

      await match.save();

      const tournament = (await TournamentModel.findById(match.tournamentRef)
        .select('tournamentId')
        .lean()) as { tournamentId?: string } | null;
      if (tournament?.tournamentId) {
        eventEmitter.emit(
          EVENTS.MATCH_UPDATE,
          createSseDeltaPayload({
            tournamentId: tournament.tournamentId,
            scope: 'match',
            action: 'updated',
            data: {
              legacyType: 'updated',
              matchId: data.matchId,
              match: {
                _id: String(match._id),
                legsToWin: match.legsToWin,
                startingPlayer: match.startingPlayer,
                status: match.status,
              },
            },
          })
        );
      }

      return serializeForClient({
        success: true,
        matchId: data.matchId,
        legsToWin: match.legsToWin,
        startingPlayer: match.startingPlayer,
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'matches', actionName: 'updateMatchGameplaySettings' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
