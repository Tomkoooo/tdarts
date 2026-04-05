'use server';

import { z } from 'zod';
import { PlayerService } from '@/database/services/player.service';
import { MatchModel } from '@/database/models/match.model';
import { BadRequestError } from '@/middleware/errorHandle';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const schema = z.object({
  playerId: z.string().min(1),
});

export async function getPlayerModalDataAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'players.getPlayerModalData',
    async (payload: z.infer<typeof schema>) => {
      const { playerId } = schema.parse(payload);

      const player = await PlayerService.findPlayerById(playerId);
      if (!player) {
        throw new BadRequestError('Player not found', 'player');
      }

      const teams = await PlayerService.findTeamsForPlayer(String(player._id));
      const recentMatches = await MatchModel.find({
        status: 'finished',
        $or: [{ 'player1.playerId': playerId }, { 'player2.playerId': playerId }],
      })
        .populate('player1.playerId', 'name')
        .populate('player2.playerId', 'name')
        .sort({ createdAt: -1 })
        .limit(12);

      const matchHistory = recentMatches.map((match: any) => {
        const p1Id =
          match?.player1?.playerId && typeof match.player1.playerId === 'object'
            ? String(match.player1.playerId?._id || '')
            : String(match?.player1?.playerId || '');
        const isPlayer1 = p1Id === playerId;
        const opponent = isPlayer1 ? match?.player2?.playerId?.name : match?.player1?.playerId?.name;
        const player1Score = isPlayer1 ? match?.player1?.legsWon || 0 : match?.player2?.legsWon || 0;
        const player2Score = isPlayer1 ? match?.player2?.legsWon || 0 : match?.player1?.legsWon || 0;
        const winnerId = match?.winnerId ? String(match.winnerId) : '';
        const won = Boolean(winnerId && winnerId === playerId);
        return {
          _id: String(match._id),
          opponent: opponent || 'Unknown',
          player1Score,
          player2Score,
          won,
          date: match?.createdAt || new Date().toISOString(),
        };
      });

      return serializeForClient({
        success: true,
        data: {
          player,
          teams,
          matchHistory,
        },
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'players', actionName: 'getPlayerModalData' },
    }
  );

  return run(input);
}
