'use server';

import { z } from 'zod';
import { TournamentService } from '@/database/services/tournament.service';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import type {
  CreateManualGroupsRequest,
  ManualGroupsContextResponse,
} from '@/interface/tournament.interface';

const codeSchema = z.object({
  code: z.string().min(1),
});

function toPlayerId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export async function getManualGroupsContextAction(input: { code: string }) {
  const run = withTelemetry(
    'tournaments.manualGroups.context',
    async (payload: { code: string }) => {
      const { code } = codeSchema.parse(payload);
      const tournament = await TournamentService.getTournament(code);

      const boardCount = Number(tournament?.tournamentSettings?.boardCount || 0);
      const usedBoardNumbers = new Set<number>(
        Array.isArray(tournament?.groups)
          ? tournament.groups
              .map((g: any) => Number(g?.boardNumber))
              .filter((n: number) => Number.isFinite(n) && n > 0)
          : []
      );

      const boards = Array.from({ length: boardCount }, (_, index) => {
        const boardNumber = index + 1;
        return { boardNumber, isUsed: usedBoardNumbers.has(boardNumber) };
      });

      const availablePlayers =
        Array.isArray(tournament?.tournamentPlayers) &&
        tournament.tournamentPlayers.length > 0
          ? tournament.tournamentPlayers
              .filter((tp: any) => tp?.status === 'checked-in')
              .map((tp: any) => ({
                _id: toPlayerId(tp?.playerReference),
                name: String(tp?.playerReference?.name || tp?.name || 'Player'),
              }))
              .filter((player: { _id: string }) => Boolean(player._id))
          : [];

      const data: ManualGroupsContextResponse = { boards, availablePlayers };
      return serializeForClient({ success: true, ...data });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getManualGroupsContext' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

export async function createManualGroupsAction(input: {
  code: string;
  groups: CreateManualGroupsRequest['groups'];
}) {
  const run = withTelemetry(
    'tournaments.manualGroups.create',
    async (payload: { code: string; groups: CreateManualGroupsRequest['groups'] }) => {
      const { code } = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await TournamentService.createManualGroups(code, authResult.data.userId, payload.groups);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'createManualGroups' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

export async function generateGroupsAction(input: { code: string }) {
  const run = withTelemetry(
    'tournaments.groups.generate',
    async (payload: { code: string }) => {
      const { code } = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await TournamentService.generateGroups(code, authResult.data.userId);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'generateGroups' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

const knockoutSchema = z.object({
  code: z.string().min(1),
  tournamentFormat: z.string().optional(),
  selectedPlayers: z.number().optional(),
  mode: z.enum(['automatic', 'manual']).default('automatic'),
});

export async function generateKnockoutAction(input: z.infer<typeof knockoutSchema>) {
  const run = withTelemetry(
    'tournaments.knockout.generate',
    async (payload: z.infer<typeof knockoutSchema>) => {
      const parsed = knockoutSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      if (parsed.mode === 'manual') {
        await TournamentService.generateManualKnockout(
          parsed.code,
          authResult.data.userId
        );
        return { success: true };
      }

      const isKnockoutOnly = parsed.tournamentFormat === 'knockout';
      await TournamentService.generateKnockout(parsed.code, authResult.data.userId, {
        playersCount: isKnockoutOnly ? undefined : parsed.selectedPlayers,
        qualifiersPerGroup: isKnockoutOnly ? undefined : parsed.selectedPlayers,
      });
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'generateKnockout' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function finishTournamentAction(input: {
  code: string;
  thirdPlacePlayerId?: string | null;
}) {
  const run = withTelemetry(
    'tournaments.finish',
    async (payload: { code: string; thirdPlacePlayerId?: string | null }) => {
      const { code } = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await TournamentService.finishTournament(
        code,
        authResult.data.userId,
        payload.thirdPlacePlayerId || undefined
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'finishTournament' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function cancelKnockoutAction(input: { code: string }) {
  const run = withTelemetry(
    'tournaments.knockout.cancel',
    async (payload: { code: string }) => {
      const { code } = codeSchema.parse(payload);
      await TournamentService.cancelKnockout(code);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'cancelKnockout' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
