'use server';

import { z } from 'zod';
import { TournamentService } from '@/database/services/tournament.service';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { AuthorizationService } from '@/database/services/authorization.service';
import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';
import { sendEmail } from '@/lib/mailer';
import { connectMongo } from '@/lib/mongoose';
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

function getTournamentClubId(tournament: any): string {
  const club = tournament?.clubId;
  if (!club) return '';
  if (typeof club === 'object' && club !== null && '_id' in club) {
    return String((club as { _id: unknown })._id);
  }
  return String(club);
}

async function assertTournamentModerator(code: string, userId: string) {
  const tournament = await TournamentService.getTournament(code);
  if (!tournament) {
    throw new Error('Tournament not found');
  }
  const clubId = getTournamentClubId(tournament);
  if (!clubId) {
    throw new Error('Tournament is missing club reference');
  }
  const canModerate = await AuthorizationService.checkAdminOrModerator(userId, clubId);
  if (!canModerate) {
    throw new Error('Forbidden');
  }
  return tournament;
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

const updateTournamentSchema = z.object({
  code: z.string().min(1),
  settings: z.record(z.any()),
  boards: z.array(z.record(z.any())).optional(),
});

export async function updateTournamentSettingsAction(input: {
  code: string;
  settings: Record<string, unknown>;
  boards?: Array<Record<string, unknown>>;
}) {
  const run = withTelemetry(
    'tournaments.settings.update',
    async (payload: {
      code: string;
      settings: Record<string, unknown>;
      boards?: Array<Record<string, unknown>>;
    }) => {
      const parsed = updateTournamentSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const updated = await TournamentService.updateTournamentSettings(
        parsed.code,
        authResult.data.userId,
        {
          ...(parsed.settings || {}),
          boards: parsed.boards,
        } as any
      );

      return serializeForClient({ success: true, tournament: updated });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'updateTournamentSettings' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

const movePlayerSchema = z.object({
  code: z.string().min(1),
  groupId: z.string().min(1),
  playerId: z.string().min(1),
  direction: z.enum(['up', 'down']),
});

export async function moveTournamentPlayerInGroupAction(input: {
  code: string;
  groupId: string;
  playerId: string;
  direction: 'up' | 'down';
}) {
  const run = withTelemetry(
    'tournaments.groups.movePlayer',
    async (payload: {
      code: string;
      groupId: string;
      playerId: string;
      direction: 'up' | 'down';
    }) => {
      const parsed = movePlayerSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await assertTournamentModerator(parsed.code, authResult.data.userId);
      const success = await TournamentService.movePlayerInGroup(
        parsed.code,
        parsed.groupId,
        parsed.playerId,
        parsed.direction
      );
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'moveTournamentPlayerInGroup' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

const updateBoardSchema = z.object({
  code: z.string().min(1),
  boardNumber: z.number().int().positive(),
  name: z.string().optional(),
  scoliaSerialNumber: z.string().optional(),
  scoliaAccessToken: z.string().optional(),
});

export async function updateTournamentBoardAction(input: {
  code: string;
  boardNumber: number;
  name?: string;
  scoliaSerialNumber?: string;
  scoliaAccessToken?: string;
}) {
  const run = withTelemetry(
    'tournaments.boards.update',
    async (payload: {
      code: string;
      boardNumber: number;
      name?: string;
      scoliaSerialNumber?: string;
      scoliaAccessToken?: string;
    }) => {
      const parsed = updateBoardSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await assertTournamentModerator(parsed.code, authResult.data.userId);
      const tournament = await TournamentService.updateBoard(parsed.code, parsed.boardNumber, {
        name: parsed.name,
        scoliaSerialNumber: parsed.scoliaSerialNumber,
        scoliaAccessToken: parsed.scoliaAccessToken,
      });
      return serializeForClient({ success: true, tournament });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'updateTournamentBoard' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getTournamentDeletionInfoAction(input: { code: string }) {
  const run = withTelemetry(
    'tournaments.deletionInfo.get',
    async (payload: { code: string }) => {
      const { code } = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await assertTournamentModerator(code, authResult.data.userId);
      const data = await TournamentService.getTournamentDeletionInfo(code);
      return serializeForClient({ success: true, ...data });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentDeletionInfo' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function deleteTournamentAction(input: {
  code: string;
  emailData?: { subject: string; message: string };
}) {
  const run = withTelemetry(
    'tournaments.delete',
    async (payload: { code: string; emailData?: { subject: string; message: string } }) => {
      const { code } = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const success = await TournamentService.deleteTournament(
        code,
        authResult.data.userId,
        payload.emailData
      );
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'deleteTournament' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

const notifyPlayerSchema = z.object({
  playerId: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
  language: z.enum(['hu', 'en']).default('hu'),
  tournamentName: z.string().optional(),
});

export async function sendTournamentPlayerNotificationAction(input: {
  playerId: string;
  subject: string;
  message: string;
  language: 'hu' | 'en';
  tournamentName?: string;
}) {
  const run = withTelemetry(
    'tournaments.notifications.player',
    async (payload: {
      playerId: string;
      subject: string;
      message: string;
      language: 'hu' | 'en';
      tournamentName?: string;
    }) => {
      const parsed = notifyPlayerSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await connectMongo();
      const player = await PlayerModel.findById(parsed.playerId).select('userRef name');
      if (!player?.userRef) {
        throw new Error('Selected player has no linked user account');
      }
      const user = await UserModel.findById(player.userRef).select('email name');
      if (!user?.email) {
        throw new Error('Selected player has no email address');
      }

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#111827;">
          <h2 style="margin:0 0 12px;">${parsed.subject}</h2>
          <p style="white-space:pre-wrap;margin:0 0 12px;">${parsed.message}</p>
          ${
            parsed.tournamentName
              ? `<p style="margin:0;color:#6b7280;">tDarts - ${parsed.tournamentName}</p>`
              : ''
          }
        </div>
      `;

      await sendEmail({
        to: [user.email],
        subject: parsed.subject,
        text: parsed.message,
        html,
      });

      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'sendTournamentPlayerNotification' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
