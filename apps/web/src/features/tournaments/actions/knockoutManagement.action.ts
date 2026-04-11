'use server';

import { z } from 'zod';
import { TournamentService, MatchService } from '@tdarts/services';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

const tournamentCodeSchema = z.object({
  tournamentCode: z.string().min(1),
});

export async function getKnockoutViewDataAction(input: { tournamentCode: string }) {
  const run = withTelemetry(
    'tournaments.knockout.viewData',
    async (payload: { tournamentCode: string }) => {
      const { tournamentCode } = tournamentCodeSchema.parse(payload);
      const data = await TournamentService.getKnockoutViewDataLite(tournamentCode);

      return serializeForClient({
        success: true,
        ...data,
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getKnockoutViewData' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function generateNextKnockoutRoundAction(input: {
  tournamentCode: string;
  currentRound: number;
}) {
  const run = withTelemetry(
    'tournaments.knockout.generateNextRound',
    async (payload: { tournamentCode: string; currentRound: number }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({ tournamentCode: z.string().min(1), currentRound: z.number() })
        .parse(payload);
      const success = await TournamentService.generateNextKnockoutRound(
        parsed.tournamentCode,
        auth.data.userId,
        parsed.currentRound
      );
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'generateNextKnockoutRound' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function finishKnockoutMatchAction(input: {
  matchId: string;
  player1LegsWon: number;
  player2LegsWon: number;
  player1Stats?: { average?: number; highestCheckout?: number; oneEightiesCount?: number };
  player2Stats?: { average?: number; highestCheckout?: number; oneEightiesCount?: number };
}) {
  const run = withTelemetry(
    'tournaments.knockout.finishMatch',
    async (payload: {
      matchId: string;
      player1LegsWon: number;
      player2LegsWon: number;
      player1Stats?: { average?: number; highestCheckout?: number; oneEightiesCount?: number };
      player2Stats?: { average?: number; highestCheckout?: number; oneEightiesCount?: number };
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          matchId: z.string().min(1),
          player1LegsWon: z.number(),
          player2LegsWon: z.number(),
          player1Stats: z
            .object({
              average: z.number().optional(),
              highestCheckout: z.number().optional(),
              oneEightiesCount: z.number().optional(),
            })
            .optional(),
          player2Stats: z
            .object({
              average: z.number().optional(),
              highestCheckout: z.number().optional(),
              oneEightiesCount: z.number().optional(),
            })
            .optional(),
        })
        .parse(payload);
      const match = await MatchService.finishMatch(parsed.matchId, {
        player1LegsWon: parsed.player1LegsWon,
        player2LegsWon: parsed.player2LegsWon,
        player1Stats: parsed.player1Stats,
        player2Stats: parsed.player2Stats,
        allowManualFinish: true,
        isManual: true,
        adminId: auth.data.userId,
      });
      return serializeForClient({ success: true, match });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'finishKnockoutMatch' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function addManualKnockoutMatchAction(input: {
  tournamentCode: string;
  round: number;
  player1Id: string;
  player2Id: string;
  scorerId?: string;
  boardNumber?: number;
}) {
  const run = withTelemetry(
    'tournaments.knockout.addManualMatch',
    async (payload: {
      tournamentCode: string;
      round: number;
      player1Id: string;
      player2Id: string;
      scorerId?: string;
      boardNumber?: number;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          tournamentCode: z.string().min(1),
          round: z.number(),
          player1Id: z.string().min(1),
          player2Id: z.string().min(1),
          scorerId: z.string().optional(),
          boardNumber: z.number().optional(),
        })
        .parse(payload);
      await TournamentService.addManualMatch(parsed.tournamentCode, auth.data.userId, {
        round: parsed.round,
        player1Id: parsed.player1Id,
        player2Id: parsed.player2Id,
        scorerId: parsed.scorerId,
        boardNumber: parsed.boardNumber,
      });
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'addManualKnockoutMatch' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function generateEmptyKnockoutRoundsAction(input: {
  tournamentCode: string;
  roundsCount: number;
}) {
  const run = withTelemetry(
    'tournaments.knockout.generateEmptyRounds',
    async (payload: { tournamentCode: string; roundsCount: number }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({ tournamentCode: z.string().min(1), roundsCount: z.number().min(1) })
        .parse(payload);
      const success = await TournamentService.generateEmptyKnockoutRounds(
        parsed.tournamentCode,
        auth.data.userId,
        parsed.roundsCount
      );
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'generateEmptyKnockoutRounds' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function generateRandomPairingsAction(input: {
  tournamentCode: string;
  round: number;
  selectedPlayerIds: string[];
}) {
  const run = withTelemetry(
    'tournaments.knockout.generateRandomPairings',
    async (payload: { tournamentCode: string; round: number; selectedPlayerIds: string[] }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          tournamentCode: z.string().min(1),
          round: z.number(),
          selectedPlayerIds: z.array(z.string()),
        })
        .parse(payload);
      const result = await TournamentService.generateRandomPairings(
        parsed.tournamentCode,
        auth.data.userId,
        parsed.round,
        parsed.selectedPlayerIds
      );
      return serializeForClient({ success: true, result });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'generateRandomPairings' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function updateKnockoutMatchSettingsAction(input: {
  matchId: string;
  player1Id?: string | null;
  player2Id?: string | null;
  scorerId?: string;
  boardNumber?: number;
}) {
  const run = withTelemetry(
    'tournaments.knockout.updateMatchSettings',
    async (payload: {
      matchId: string;
      player1Id?: string | null;
      player2Id?: string | null;
      scorerId?: string;
      boardNumber?: number;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          matchId: z.string().min(1),
          player1Id: z.string().nullable().optional(),
          player2Id: z.string().nullable().optional(),
          scorerId: z.string().optional(),
          boardNumber: z.number().optional(),
        })
        .parse(payload);
      const result = await MatchService.updateMatchSettings(parsed.matchId, auth.data.userId, {
        player1Id: parsed.player1Id || undefined,
        player2Id: parsed.player2Id || undefined,
        scorerId: parsed.scorerId,
        boardNumber: parsed.boardNumber,
      });
      return serializeForClient({ success: true, result });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'updateKnockoutMatchSettings' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function updateEmptyKnockoutPairAction(input: {
  tournamentCode: string;
  round: number;
  pairIndex: number;
  player1Id?: string;
  player2Id?: string;
  scorerId?: string;
  boardNumber?: number;
}) {
  const run = withTelemetry(
    'tournaments.knockout.updateEmptyPair',
    async (payload: {
      tournamentCode: string;
      round: number;
      pairIndex: number;
      player1Id?: string;
      player2Id?: string;
      scorerId?: string;
      boardNumber?: number;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          tournamentCode: z.string().min(1),
          round: z.number(),
          pairIndex: z.number(),
          player1Id: z.string().optional(),
          player2Id: z.string().optional(),
          scorerId: z.string().optional(),
          boardNumber: z.number().optional(),
        })
        .parse(payload);
      const success = await TournamentService.updateEmptyPairToMatch(
        parsed.tournamentCode,
        auth.data.userId,
        {
          round: parsed.round,
          pairIndex: parsed.pairIndex,
          player1Id: parsed.player1Id,
          player2Id: parsed.player2Id,
          scorerId: parsed.scorerId,
          boardNumber: parsed.boardNumber,
        }
      );
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'updateEmptyKnockoutPair' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function deleteKnockoutMatchAction(input: {
  tournamentCode: string;
  round: number;
  pairIndex: number;
}) {
  const run = withTelemetry(
    'tournaments.knockout.deleteMatch',
    async (payload: { tournamentCode: string; round: number; pairIndex: number }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          tournamentCode: z.string().min(1),
          round: z.number(),
          pairIndex: z.number(),
        })
        .parse(payload);
      const success = await TournamentService.deleteKnockoutMatch(
        parsed.tournamentCode,
        auth.data.userId,
        { round: parsed.round, pairIndex: parsed.pairIndex }
      );
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'deleteKnockoutMatch' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function deleteLastKnockoutRoundAction(input: { tournamentCode: string }) {
  const run = withTelemetry(
    'tournaments.knockout.deleteLastRound',
    async (payload: { tournamentCode: string }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = tournamentCodeSchema.parse(payload);
      const success = await TournamentService.deleteLastKnockoutRound(
        parsed.tournamentCode,
        auth.data.userId
      );
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'deleteLastKnockoutRound' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
