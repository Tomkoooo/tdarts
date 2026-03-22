'use server';

import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { BadRequestError } from '@/middleware/errorHandle';
import { connectMongo } from '@/lib/mongoose';
import { PlayerService } from '@/database/services/player.service';
import { TournamentModel } from '@/database/models/tournament.model';
import { PlayerModel } from '@/database/models/player.model';
import { MatchModel } from '@/database/models/match.model';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import mongoose from 'mongoose';
import { unstable_cache } from 'next/cache';

const schema = z.object({
  limit: z.number().int().positive().max(20).optional(),
});

export async function getUserTournamentsAction(input: z.infer<typeof schema> = {}) {
  const run = withTelemetry(
    'tournaments.getUserTournaments',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const userId = authResult.data.userId;
      const limit = parsed.data.limit ?? 5;
      const fetchHomeTournaments = async () => {
        await connectMongo();
        const player = await PlayerService.findPlayerByUserId(userId);
        if (!player) {
          return [];
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const playerObjectId = new mongoose.Types.ObjectId(player._id.toString());
        const pairShellPlayers = await PlayerModel.find({ members: playerObjectId })
          .select('_id')
          .lean();
        const participationPlayerIds: mongoose.Types.ObjectId[] = [
          playerObjectId,
          ...pairShellPlayers.map((p) => p._id as mongoose.Types.ObjectId),
        ];
        const tournaments = await TournamentModel.aggregate([
          {
            $match: {
              isDeleted: { $ne: true },
              isArchived: { $ne: true },
              'tournamentPlayers.playerReference': { $in: participationPlayerIds },
              $or: [
                { 'tournamentSettings.startDate': { $gte: todayStart } },
                {
                  'tournamentSettings.status': {
                    $in: [
                      'active',
                      'live',
                      'ongoing',
                      'in_progress',
                      'in-progress',
                      'started',
                      'group-stage',
                      'knockout',
                      'finished',
                    ],
                  },
                },
              ],
            },
          },
          {
            $project: {
              createdAt: 1,
              tournamentId: 1,
              tournamentSettings: {
                name: '$tournamentSettings.name',
                startDate: '$tournamentSettings.startDate',
                status: '$tournamentSettings.status',
                maxPlayers: '$tournamentSettings.maxPlayers',
                entryFee: '$tournamentSettings.entryFee',
                type: '$tournamentSettings.type',
                participationMode: '$tournamentSettings.participationMode',
              },
              currentPlayers: { $size: '$tournamentPlayers' },
              playerEntry: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$tournamentPlayers',
                      as: 'entry',
                      cond: {
                        $in: ['$$entry.playerReference', participationPlayerIds],
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
          { $sort: { 'tournamentSettings.startDate': 1, createdAt: -1 } },
          { $limit: limit },
        ]);

        const tournamentIds = tournaments.map((item) => item._id);
        const relevantMatches = tournamentIds.length
          ? await MatchModel.find({
              tournamentRef: { $in: tournamentIds },
              status: { $in: ['pending', 'ongoing'] },
              $or: [
                { 'player1.playerId': { $in: participationPlayerIds } },
                { 'player2.playerId': { $in: participationPlayerIds } },
                { scorer: { $in: participationPlayerIds } },
              ],
            })
              .select('tournamentRef status boardReference player1.playerId player2.playerId scorer createdAt')
              .populate('player1.playerId', 'name')
              .populate('player2.playerId', 'name')
              .sort({ createdAt: 1 })
              .lean()
          : [];

        const pidSet = new Set(participationPlayerIds.map((id) => String(id)));

        const slotPlayerId = (slot: any): string => {
          const ref = slot?.playerId;
          if (ref && typeof ref === 'object' && '_id' in ref) return String((ref as { _id: unknown })._id);
          return ref ? String(ref) : '';
        };

        return tournaments.map((item) => {
          const playerEntry = item.playerEntry || null;
          const ongoingMatch = relevantMatches.find(
            (match: any) => String(match.tournamentRef) === String(item._id) && match.status === 'ongoing'
          );
          const pendingMatch = relevantMatches.find(
            (match: any) => String(match.tournamentRef) === String(item._id) && match.status === 'pending'
          );
          const nextRelevantMatch = ongoingMatch || pendingMatch || null;
          const scorerId = nextRelevantMatch?.scorer ? String(nextRelevantMatch.scorer) : '';
          const isScorer = Boolean(scorerId && pidSet.has(scorerId));
          const p1Id = slotPlayerId(nextRelevantMatch?.player1);
          const p2Id = slotPlayerId(nextRelevantMatch?.player2);
          const isP1 = Boolean(p1Id && pidSet.has(p1Id));
          const isP2 = Boolean(p2Id && pidSet.has(p2Id));

          let nextMatchType:
            | 'playing'
            | 'scoring'
            | 'pendingPlaying'
            | 'pendingScoring'
            | 'pendingUnknown'
            | 'unknown' = 'unknown';
          if (nextRelevantMatch) {
            if (ongoingMatch) {
              nextMatchType = isScorer ? 'scoring' : 'playing';
            } else if (pendingMatch) {
              if (isP1 || isP2) nextMatchType = 'pendingPlaying';
              else if (isScorer) nextMatchType = 'pendingScoring';
              else nextMatchType = 'pendingUnknown';
            }
          }

          let nextMatchOpponentName: string | null = null;
          if (nextRelevantMatch && (isP1 || isP2)) {
            const oppSlot = isP1 ? nextRelevantMatch.player2 : nextRelevantMatch.player1;
            const ref = oppSlot?.playerId as { name?: string } | string | undefined;
            if (ref && typeof ref === 'object' && 'name' in ref && ref.name) {
              nextMatchOpponentName = String(ref.name);
            }
          }

          const ts = item.tournamentSettings || {};
          return {
            _id: String(item._id),
            name: ts.name || 'Tournament',
            code: item.tournamentId || '',
            date: ts.startDate || null,
            status: ts.status || 'pending',
            currentPlayers: Number(item.currentPlayers || 0),
            maxPlayers: Number(ts.maxPlayers || 0),
            entryFee: Number(ts.entryFee || 0),
            tournamentType: ts.type === 'open' ? 'open' : 'amateur',
            participationMode:
              ts.participationMode === 'pair' || ts.participationMode === 'team'
                ? ts.participationMode
                : 'individual',
            wins: Number(playerEntry?.stats?.matchesWon ?? 0),
            losses: Number(playerEntry?.stats?.matchesLost ?? 0),
            legsWon: Number(playerEntry?.stats?.legsWon ?? 0),
            legsLost: Number(playerEntry?.stats?.legsLost ?? 0),
            nextMatchType,
            nextMatchBoard: Number(nextRelevantMatch?.boardReference ?? 0) || null,
            nextMatchOpponentName,
          };
        });
      };

      const cacheEnabled = process.env.HOME_CACHE_ENABLED !== 'false';
      const data = cacheEnabled
        ? await unstable_cache(fetchHomeTournaments, [`home-user-tournaments:${userId}:${limit}`], {
            revalidate: 15,
            tags: ['home:tournaments', `home:tournaments:${userId}`],
          })()
        : await fetchHomeTournaments();

      return serializeForClient({ success: true, data });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getUserTournaments' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
