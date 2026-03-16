'use server';

import { z } from 'zod';
import { TournamentService } from '@/database/services/tournament.service';
import { MatchModel } from '@/database/models/match.model';
import { PlayerService } from '@/database/services/player.service';
import { UserModel } from '@/database/models/user.model';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

const codeSchema = z.object({
  code: z.string().min(1),
});

const playerPayloadSchema = z.object({
  code: z.string().min(1),
  playerId: z.string().optional(),
  userRef: z.string().optional(),
  name: z.string().optional(),
});

export async function addTournamentPlayerClientAction(
  input: z.infer<typeof playerPayloadSchema>
) {
  const run = withTelemetry(
    'tournaments.roster.addPlayer',
    async (payload: z.infer<typeof playerPayloadSchema>) => {
      const parsed = playerPayloadSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const userId = authResult.data.userId;
      let targetPlayerId = parsed.playerId;

      if (!targetPlayerId) {
        if (parsed.userRef && parsed.name) {
          const p = await PlayerService.findOrCreatePlayerByUserRef(
            parsed.userRef,
            parsed.name
          );
          targetPlayerId = p._id.toString();
        } else if (parsed.name) {
          const p = await PlayerService.findOrCreatePlayerByName(parsed.name);
          targetPlayerId = p._id.toString();
        } else {
          const p = await PlayerService.findPlayerByUserId(userId);
          if (!p) throw new Error('Player not found');
          targetPlayerId = p._id.toString();
        }
      }

      if (!targetPlayerId) {
        throw new Error('Player resolution failed');
      }
      await TournamentService.addTournamentPlayer(parsed.code, targetPlayerId);
      return serializeForClient({ success: true, playerId: targetPlayerId });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'addTournamentPlayerClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function removeTournamentPlayerClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.roster.removePlayer',
    async (payload: { code: string; playerId: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);
      await TournamentService.removeTournamentPlayer(parsed.code, parsed.playerId);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'removeTournamentPlayerClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function updateTournamentPlayerStatusClientAction(input: {
  code: string;
  playerId: string;
  status: string;
}) {
  const run = withTelemetry(
    'tournaments.roster.updateStatus',
    async (payload: { code: string; playerId: string; status: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const parsed = z
        .object({
          code: z.string().min(1),
          playerId: z.string().min(1),
          status: z.string().min(1),
        })
        .parse(payload);
      await TournamentService.updateTournamentPlayerStatus(
        parsed.code,
        parsed.playerId,
        parsed.status
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'updateTournamentPlayerStatusClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function addToWaitingListClientAction(input: {
  code: string;
  playerId?: string;
  userRef?: string;
  name?: string;
}) {
  const run = withTelemetry(
    'tournaments.waitlist.add',
    async (payload: {
      code: string;
      playerId?: string;
      userRef?: string;
      name?: string;
    }) => {
      const parsed = playerPayloadSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const result = await TournamentService.addToWaitingList(
        parsed.code,
        authResult.data.userId,
        {
          playerId: parsed.playerId,
          userRef: parsed.userRef,
          name: parsed.name,
        }
      );
      return serializeForClient({ success: true, ...result });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'addToWaitingListClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function removeFromWaitingListClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.waitlist.remove',
    async (payload: { code: string; playerId: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);
      await TournamentService.removeFromWaitingList(
        parsed.code,
        authResult.data.userId,
        parsed.playerId
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'removeFromWaitingListClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function promoteFromWaitingListClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.waitlist.promote',
    async (payload: { code: string; playerId: string }) => {
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);
      await TournamentService.promoteFromWaitingList(parsed.code, parsed.playerId);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'promoteFromWaitingListClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function subscribeToTournamentNotificationsClientAction(input: {
  code: string;
}) {
  const run = withTelemetry(
    'tournaments.notifications.subscribe',
    async (payload: { code: string }) => {
      const parsed = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const user = await UserModel.findById(authResult.data.userId).select('email');
      const email = user?.email || '';
      if (!email) throw new Error('No email found for user');
      await TournamentService.subscribeToNotifications(
        parsed.code,
        authResult.data.userId,
        email
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'subscribeToTournamentNotificationsClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function unsubscribeFromTournamentNotificationsClientAction(input: {
  code: string;
}) {
  const run = withTelemetry(
    'tournaments.notifications.unsubscribe',
    async (payload: { code: string }) => {
      const parsed = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await TournamentService.unsubscribeFromNotifications(
        parsed.code,
        authResult.data.userId
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'unsubscribeFromTournamentNotificationsClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getMatchByIdClientAction(input: { matchId: string }) {
  const run = withTelemetry(
    'matches.getById',
    async (payload: { matchId: string }) => {
      const matchId = z.string().min(1).parse(payload.matchId);
      const match = await MatchModel.findById(matchId)
        .populate('player1.playerId', 'name')
        .populate('player2.playerId', 'name')
        .populate('legs.winnerId', 'name')
        .populate('tournamentRef', 'clubId tournamentId tournamentSettings');
      return serializeForClient({ success: true, match });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'matches', actionName: 'getMatchByIdClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getMatchLegsClientAction(input: { matchId: string }) {
  const run = withTelemetry(
    'matches.getLegs',
    async (payload: { matchId: string }) => {
      const matchId = z.string().min(1).parse(payload.matchId);
      const match = await MatchModel.findById(matchId)
        .populate('legs.winnerId', 'name')
        .populate('player1.playerId', 'name')
        .populate('player2.playerId', 'name')
        .populate('tournamentRef', 'clubId tournamentId tournamentSettings');
      return serializeForClient({
        success: true,
        match,
        legs: match?.legs || [],
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'matches', actionName: 'getMatchLegsClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getTournamentPlayerMatchesClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.playerMatches.get',
    async (payload: { code: string; playerId: string }) => {
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);

      const tournament = await TournamentService.getTournament(parsed.code);
      if (!tournament || !(tournament as any)._id) {
        return { success: true, matches: [] };
      }

      const matches = await MatchModel.find({
        tournamentRef: (tournament as any)._id,
        $or: [{ 'player1.playerId': parsed.playerId }, { 'player2.playerId': parsed.playerId }],
      })
        .populate('player1.playerId', 'name')
        .populate('player2.playerId', 'name')
        .sort({ createdAt: -1 });

      const mapped = matches.map((match: any) => {
        const p1Id = String(match?.player1?.playerId?._id || match?.player1?.playerId || '');
        const isPlayer1 = p1Id === parsed.playerId;
        const playerData = isPlayer1 ? match.player1 : match.player2;
        const matchObj = match.toObject ? match.toObject() : match;
        return {
          ...matchObj,
          average: playerData?.average || 0,
          firstNineAvg: playerData?.firstNineAvg || 0,
          checkout: playerData?.highestCheckout ? String(playerData.highestCheckout) : undefined,
          status: match.status || 'pending',
          winnerId: match.winnerId ? String(match.winnerId) : undefined,
        };
      });

      return serializeForClient({ success: true, matches: mapped });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentPlayerMatchesClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getTournamentHeadToHeadClientAction(input: {
  code: string;
  opponentId: string;
}) {
  const run = withTelemetry(
    'tournaments.headToHead.get',
    async (payload: { code: string; opponentId: string }) => {
      const parsed = z
        .object({ code: z.string().min(1), opponentId: z.string().min(1) })
        .parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const currentPlayer = await PlayerService.findPlayerByUserId(authResult.data.userId);
      if (!currentPlayer) throw new Error('Current player not found');
      const data = await TournamentService.getHeadToHead(
        currentPlayer._id.toString(),
        parsed.opponentId
      );
      return serializeForClient({ success: true, data });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentHeadToHeadClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
