'use server';

import { z } from 'zod';
import { LeagueService, PlayerService, ClubService } from '@tdarts/services';
import type { PointSystemType } from '@/interface/league.interface';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

const leagueInputSchema = z.object({
  clubId: z.string().min(1),
  leagueId: z.string().min(1),
});

export async function getLeagueDetailsAction(input: { clubId: string; leagueId: string }) {
  const run = withTelemetry(
    'leagues.getDetails',
    async (payload: { clubId: string; leagueId: string }) => {
      const { leagueId } = leagueInputSchema.parse(payload);
      const data = await LeagueService.getLeagueStats(leagueId);
      return serializeForClient(data);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'getLeagueDetails' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function adjustLeaguePointsAction(input: {
  clubId: string;
  leagueId: string;
  playerId: string;
  pointsAdjustment: number;
  reason: string;
}) {
  const run = withTelemetry(
    'leagues.adjustPoints',
    async (payload: {
      clubId: string;
      leagueId: string;
      playerId: string;
      pointsAdjustment: number;
      reason: string;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          playerId: z.string().min(1),
          pointsAdjustment: z.number(),
          reason: z.string().min(1),
        })
        .parse(payload);
      await LeagueService.adjustPlayerPoints(
        parsed.leagueId,
        auth.data.userId,
        {
          playerId: parsed.playerId,
          pointsAdjustment: parsed.pointsAdjustment,
          reason: parsed.reason,
        }
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'adjustLeaguePoints' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function addLeaguePlayerAction(input: {
  clubId: string;
  leagueId: string;
  playerId?: string;
  playerName?: string;
}) {
  const run = withTelemetry(
    'leagues.addPlayer',
    async (payload: {
      clubId: string;
      leagueId: string;
      playerId?: string;
      playerName?: string;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          playerId: z.string().optional(),
          playerName: z.string().optional(),
        })
        .parse(payload);

      let playerId = parsed.playerId;
      if (!playerId) {
        if (!parsed.playerName) throw new Error('Player name is required');
        const player = await PlayerService.createPlayer({ name: parsed.playerName });
        playerId = String(player._id);
      }
      await LeagueService.addPlayerToLeague(parsed.leagueId, auth.data.userId, {
        playerId,
      });
      return { success: true, playerId };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'addLeaguePlayer' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function removeLeaguePlayerAction(input: {
  clubId: string;
  leagueId: string;
  playerId: string;
  reason: string;
}) {
  const run = withTelemetry(
    'leagues.removePlayer',
    async (payload: { clubId: string; leagueId: string; playerId: string; reason: string }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          playerId: z.string().min(1),
          reason: z.string().min(1),
        })
        .parse(payload);
      await LeagueService.removePlayerFromLeague(
        parsed.leagueId,
        parsed.playerId,
        auth.data.userId,
        parsed.reason
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'removeLeaguePlayer' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getClubFinishedTournamentsAction(input: { clubId: string; leagueId: string }) {
  const run = withTelemetry(
    'leagues.clubFinishedTournaments',
    async (payload: { clubId: string; leagueId: string }) => {
      const parsed = leagueInputSchema.parse(payload);
      const club = await ClubService.getClub(parsed.clubId);
      const attachedIds = new Set<string>(
        ((club as any)?.leagues || [])
          .find((l: any) => String(l?._id) === parsed.leagueId)
          ?.attachedTournaments?.map((t: any) => String(t?._id || t)) || []
      );
      const tournaments = ((club as any)?.tournaments || []).filter(
        (t: any) =>
          !attachedIds.has(String(t?._id)) &&
          t?.tournamentSettings?.status === 'finished'
      );
      return serializeForClient({ tournaments });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'getClubFinishedTournaments' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function attachTournamentToLeagueAction(input: {
  clubId: string;
  leagueId: string;
  tournamentId: string;
  calculatePoints?: boolean;
}) {
  const run = withTelemetry(
    'leagues.attachTournament',
    async (payload: {
      clubId: string;
      leagueId: string;
      tournamentId: string;
      calculatePoints?: boolean;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          tournamentId: z.string().min(1),
          calculatePoints: z.boolean().optional(),
        })
        .parse(payload);
      const league = await LeagueService.attachTournamentToLeague(
        parsed.leagueId,
        parsed.tournamentId,
        auth.data.userId,
        parsed.calculatePoints !== false
      );
      return serializeForClient({ success: true, league });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'attachTournamentToLeague' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function detachTournamentFromLeagueAction(input: {
  clubId: string;
  leagueId: string;
  tournamentId: string;
}) {
  const run = withTelemetry(
    'leagues.detachTournament',
    async (payload: { clubId: string; leagueId: string; tournamentId: string }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          tournamentId: z.string().min(1),
        })
        .parse(payload);
      await LeagueService.detachTournamentFromLeague(
        parsed.leagueId,
        parsed.tournamentId,
        auth.data.userId
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'detachTournamentFromLeague' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function undoLeaguePointsAdjustmentAction(input: {
  clubId: string;
  leagueId: string;
  playerId: string;
  adjustmentIndex: number;
}) {
  const run = withTelemetry(
    'leagues.undoAdjustment',
    async (payload: {
      clubId: string;
      leagueId: string;
      playerId: string;
      adjustmentIndex: number;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          playerId: z.string().min(1),
          adjustmentIndex: z.number(),
        })
        .parse(payload);
      await LeagueService.undoPointsAdjustment(
        parsed.leagueId,
        auth.data.userId,
        parsed.playerId,
        parsed.adjustmentIndex
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'undoLeaguePointsAdjustment' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function undoLeaguePlayerRemovalAction(input: {
  clubId: string;
  leagueId: string;
  playerId: string;
  removalIndex: number;
}) {
  const run = withTelemetry(
    'leagues.undoRemoval',
    async (payload: {
      clubId: string;
      leagueId: string;
      playerId: string;
      removalIndex: number;
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          playerId: z.string().min(1),
          removalIndex: z.number(),
        })
        .parse(payload);
      await LeagueService.undoPlayerRemoval(
        parsed.leagueId,
        auth.data.userId,
        parsed.playerId,
        parsed.removalIndex
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'undoLeaguePlayerRemoval' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function updateLeagueSettingsAction(input: {
  clubId: string;
  leagueId: string;
  data: {
    name: string;
    description?: string;
    pointsConfig?: Record<string, number>;
    pointSystemType?: PointSystemType;
    isActive?: boolean;
  };
}) {
  const run = withTelemetry(
    'leagues.updateSettings',
    async (payload: {
      clubId: string;
      leagueId: string;
      data: {
        name: string;
        description?: string;
        pointsConfig?: Record<string, number>;
        pointSystemType?: PointSystemType;
        isActive?: boolean;
      };
    }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
          data: z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            pointsConfig: z.record(z.number()).optional(),
            pointSystemType: z
              .enum(['platform', 'remiz_christmas', 'ontour', 'goldfisch'])
              .optional(),
            isActive: z.boolean().optional(),
          }),
        })
        .parse(payload);
      const updatedLeague = await LeagueService.updateLeague(
        parsed.leagueId,
        auth.data.userId,
        parsed.data
      );
      return serializeForClient({ success: true, league: updatedLeague });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'updateLeagueSettings' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function deleteLeagueAction(input: { clubId: string; leagueId: string }) {
  const run = withTelemetry(
    'leagues.delete',
    async (payload: { clubId: string; leagueId: string }) => {
      const auth = await authorizeUserResult();
      if (!auth.ok) return auth;
      const parsed = z
        .object({
          clubId: z.string().min(1),
          leagueId: z.string().min(1),
        })
        .parse(payload);
      const success = await LeagueService.deleteLeague(parsed.leagueId, auth.data.userId);
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'leagues', actionName: 'deleteLeague' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
