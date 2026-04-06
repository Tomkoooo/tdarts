'use server';

import { z } from 'zod';
import { PlayerService } from '@/database/services/player.service';
import { UserService } from '@/database/services/user.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { BadRequestError } from '@/middleware/errorHandle';

const searchPlayersInputSchema = z.object({
  query: z.string(),
  clubId: z.string().optional(),
});

const findPlayerByUserInputSchema = z.object({
  userId: z.string().min(1),
});

export type SearchPlayersActionInput = {
  query: string;
  clubId?: string;
};

export type SearchPlayersActionResult = {
  users: any[];
  players: any[];
};

export async function searchPlayersAction(input: SearchPlayersActionInput): Promise<SearchPlayersActionResult> {
  const run = withTelemetry(
    'players.searchPlayers',
    async (rawInput: SearchPlayersActionInput) => {
      const parsed = searchPlayersInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid payload');
      }

      const { query, clubId } = parsed.data;
      if (!query || query.trim().length < 2) {
        return { users: [], players: [] };
      }

      const [users, players] = await Promise.all([
        UserService.searchUsers(query, clubId),
        PlayerService.searchPlayers(query, clubId),
      ]);

      return serializeForClient({ users, players }) as SearchPlayersActionResult;
    },
    {
      method: 'ACTION',
      metadata: { feature: 'players', actionName: 'searchPlayers' },
    }
  );

  return run(input);
}

export type FindPlayerByUserActionInput = {
  userId: string;
};

export type FindPlayerByUserActionResult = {
  success: boolean;
  player: any | null;
};

export async function findPlayerByUserAction(
  input: FindPlayerByUserActionInput
): Promise<FindPlayerByUserActionResult> {
  const run = withTelemetry(
    'players.findPlayerByUser',
    async (rawInput: FindPlayerByUserActionInput) => {
      const parsed = findPlayerByUserInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid payload');
      }

      const player = await PlayerService.findPlayerByUserId(parsed.data.userId);
      return serializeForClient({ success: !!player, player }) as FindPlayerByUserActionResult;
    },
    {
      method: 'ACTION',
      metadata: { feature: 'players', actionName: 'findPlayerByUser' },
    }
  );

  return run(input);
}
