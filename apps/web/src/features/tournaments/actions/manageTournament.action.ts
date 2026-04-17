'use server';

import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { TournamentService } from '@tdarts/services';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { AuthorizationService } from '@tdarts/services';
import {
  UserModel,
  PlayerModel,
  TournamentNotificationDeliveryModel,
} from '@tdarts/core';
import { sendEmail } from '@/lib/mailer';
import { connectMongo } from '@/lib/mongoose';
import { buildTournamentNotificationEmailHtml } from '@/lib/tournament-notification-email';
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

function revalidateTournamentTags(code: string) {
  revalidateTag(`tournament:${code}`, 'max');
  revalidateTag(`tournament:stable:${code}`, 'max');
  revalidateTag(`tournament:volatile:${code}`, 'max');
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
      revalidateTournamentTags(code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
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
      revalidateTournamentTags(code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
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
        revalidateTournamentTags(parsed.code);
        revalidateTag('search', 'max');
        revalidateTag('home:tournaments', 'max');
        revalidateTag('home:leagues', 'max');
        return { success: true };
      }

      const isKnockoutOnly = parsed.tournamentFormat === 'knockout';
      await TournamentService.generateKnockout(parsed.code, authResult.data.userId, {
        playersCount: isKnockoutOnly ? undefined : parsed.selectedPlayers,
        qualifiersPerGroup: isKnockoutOnly ? undefined : parsed.selectedPlayers,
      });
      revalidateTournamentTags(parsed.code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
      revalidateTag('home:leagues', 'max');
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
      revalidateTournamentTags(code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
      revalidateTag('home:stats', 'max');
      revalidateTag('home:leagues', 'max');
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
      revalidateTournamentTags(code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
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

export async function cancelGroupsAction(input: { code: string }) {
  const run = withTelemetry(
    'tournaments.groups.cancel',
    async (payload: { code: string }) => {
      const { code } = codeSchema.parse(payload);
      await TournamentService.cancelGroups(code);
      revalidateTournamentTags(code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'cancelGroups' },
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

      revalidateTournamentTags(parsed.code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
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
      revalidateTournamentTags(parsed.code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
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
      revalidateTournamentTags(parsed.code);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
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
  code: z.string().min(1),
  mode: z.enum(['single', 'selected']).default('single'),
  playerId: z.string().min(1).optional(),
  playerIds: z.array(z.string().min(1)).optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
  language: z.enum(['hu', 'en']).default('hu'),
  tournamentName: z.string().optional(),
});

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function assertTournamentOrganizerOrGlobalAdmin(code: string, userId: string) {
  const tournament = await TournamentService.getTournament(code);
  if (!tournament) {
    throw new Error('Tournament not found');
  }
  const clubId = getTournamentClubId(tournament);
  if (!clubId) {
    throw new Error('Tournament is missing club reference');
  }
  const [canModerate, isGlobalAdmin] = await Promise.all([
    AuthorizationService.checkAdminOrModerator(userId, clubId),
    AuthorizationService.isGlobalAdmin(userId),
  ]);
  if (!canModerate && !isGlobalAdmin) {
    throw new Error('Forbidden');
  }
  return tournament;
}

export async function sendTournamentPlayerNotificationAction(input: {
  code: string;
  mode?: 'single' | 'selected';
  playerId?: string;
  playerIds?: string[];
  subject: string;
  message: string;
  language: 'hu' | 'en';
  tournamentName?: string;
}) {
  const run = withTelemetry(
    'tournaments.notifications.player',
    async (payload: {
      code: string;
      mode?: 'single' | 'selected';
      playerId?: string;
      playerIds?: string[];
      subject: string;
      message: string;
      language: 'hu' | 'en';
      tournamentName?: string;
    }) => {
      const parsed = notifyPlayerSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      if (parsed.mode === 'single' && !parsed.playerId) {
        throw new Error('Missing playerId for single notification');
      }
      if (parsed.mode === 'selected' && (!parsed.playerIds || parsed.playerIds.length === 0)) {
        throw new Error('No selected players provided');
      }

      await assertTournamentOrganizerOrGlobalAdmin(parsed.code, authResult.data.userId);

      await connectMongo();

      const rawPlayerIds: string[] =
        parsed.mode === 'single'
          ? parsed.playerId
            ? [parsed.playerId]
            : []
          : [...(parsed.playerIds || [])];

      const selectedPlayerCount = rawPlayerIds.length;
      const targetPlayerIds = [...new Set(rawPlayerIds)];
      const uniqueSelectedPlayerCount = targetPlayerIds.length;

      const playerIdObjectIds = targetPlayerIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      const playersFound =
        playerIdObjectIds.length > 0
          ? await PlayerModel.find({ _id: { $in: playerIdObjectIds } })
              .select('userRef name')
              .lean()
          : [];
      const playersFoundCount = playersFound.length;
      const playerById = new Map(
        (playersFound as any[]).map((p) => [p._id.toString(), p])
      );

      const userIds = [
        ...new Set(
          (playersFound as any[])
            .map((player) => player?.userRef?.toString?.())
            .filter((userId: string | undefined): userId is string => Boolean(userId))
        ),
      ];

      const users = userIds.length
        ? await UserModel.find({ _id: { $in: userIds } }).select('email name').lean()
        : [];
      const userById = new Map((users as any[]).map((user) => [user._id.toString(), user]));

      type Resolution = {
        playerId: string;
        playerName: string;
        userId?: string;
        emailNorm?: string;
        emailTo?: string;
        skipReason?: string;
      };

      const resolutions: Resolution[] = [];
      let skippedPlayerNotFoundCount = 0;
      let skippedNoUserCount = 0;
      let skippedNoEmailCount = 0;

      for (const pid of targetPlayerIds) {
        const player = playerById.get(pid);
        if (!player) {
          skippedPlayerNotFoundCount += 1;
          resolutions.push({
            playerId: pid,
            playerName: '',
            skipReason: 'player_not_found',
          });
          continue;
        }
        const playerName = String((player as any).name || '');
        const userId = (player as any).userRef?.toString?.();
        if (!userId) {
          skippedNoUserCount += 1;
          resolutions.push({
            playerId: pid,
            playerName,
            skipReason: 'no_user_ref',
          });
          continue;
        }
        const user = userById.get(userId);
        const emailTo = user?.email?.trim?.() || '';
        const emailNorm = emailTo.toLowerCase();
        if (!emailTo || !isValidEmailAddress(emailNorm)) {
          skippedNoEmailCount += 1;
          resolutions.push({
            playerId: pid,
            playerName,
            userId,
            skipReason: 'no_email',
          });
          continue;
        }
        resolutions.push({
          playerId: pid,
          playerName,
          userId,
          emailNorm,
          emailTo,
        });
      }

      const emailCanonicalPlayerId = new Map<string, string>();
      for (const r of resolutions) {
        if (!r.emailNorm || !r.emailTo || r.skipReason) continue;
        if (!emailCanonicalPlayerId.has(r.emailNorm)) {
          emailCanonicalPlayerId.set(r.emailNorm, r.playerId);
        }
      }

      let skippedDuplicateEmailCount = 0;
      for (const r of resolutions) {
        if (!r.emailNorm || !r.emailTo || r.skipReason) continue;
        const canonical = emailCanonicalPlayerId.get(r.emailNorm);
        if (canonical && canonical !== r.playerId) {
          r.skipReason = 'duplicate_email';
          skippedDuplicateEmailCount += 1;
        }
      }

      const html = buildTournamentNotificationEmailHtml({
        subject: parsed.subject,
        message: parsed.message,
        tournamentName: parsed.tournamentName,
        language: parsed.language,
      });

      const emailsToAttempt = [...emailCanonicalPlayerId.keys()];
      const uniqueEmailCount = emailsToAttempt.length;
      const sendAttemptCount = uniqueEmailCount;

      const sendOkByEmailNorm = new Map<string, boolean>();
      const sendErrorByEmailNorm = new Map<string, string>();

      for (const emailNorm of emailsToAttempt) {
        const canonicalPlayerId = emailCanonicalPlayerId.get(emailNorm);
        const canonical = resolutions.find(
          (x) => x.playerId === canonicalPlayerId && x.emailNorm === emailNorm && !x.skipReason
        );
        const to = canonical?.emailTo || emailNorm;
        try {
          const ok = await sendEmail({
            to: [to],
            subject: parsed.subject,
            text: parsed.message,
            html,
          });
          sendOkByEmailNorm.set(emailNorm, Boolean(ok));
          if (!ok) {
            sendErrorByEmailNorm.set(emailNorm, 'send_mail_returned_false');
          }
        } catch (err: any) {
          sendOkByEmailNorm.set(emailNorm, false);
          sendErrorByEmailNorm.set(emailNorm, err?.message || 'send_failed');
        }
      }

      let sentCount = 0;
      let failedCount = 0;
      for (const emailNorm of emailsToAttempt) {
        if (sendOkByEmailNorm.get(emailNorm)) sentCount += 1;
        else failedCount += 1;
      }

      const batchId = randomUUID();
      const senderUserId = authResult.data.userId;
      const now = new Date();

      const results: Array<{
        playerId: string;
        playerName: string;
        status: 'sent' | 'failed' | 'skipped';
        reason?: string;
        sentAt?: string | null;
      }> = [];

      const insertDocs: Array<Record<string, unknown>> = [];

      for (const r of resolutions) {
        let status: 'sent' | 'failed' | 'skipped' = 'skipped';
        let reason = r.skipReason;
        let sentAt: Date | undefined;

        if (r.skipReason) {
          status = 'skipped';
        } else if (r.emailNorm && emailCanonicalPlayerId.get(r.emailNorm) === r.playerId) {
          const ok = sendOkByEmailNorm.get(r.emailNorm);
          if (ok) {
            status = 'sent';
            sentAt = now;
          } else {
            status = 'failed';
            reason = sendErrorByEmailNorm.get(r.emailNorm) || 'send_failed';
          }
        }

        results.push({
          playerId: r.playerId,
          playerName: r.playerName,
          status,
          reason,
          sentAt: sentAt ? sentAt.toISOString() : null,
        });

        if (!Types.ObjectId.isValid(r.playerId)) {
          continue;
        }

        insertDocs.push({
          tournamentCode: parsed.code,
          batchId,
          playerId: new Types.ObjectId(r.playerId),
          playerName: r.playerName || undefined,
          userRef: r.userId && Types.ObjectId.isValid(r.userId) ? new Types.ObjectId(r.userId) : undefined,
          email: r.emailTo || r.emailNorm || undefined,
          subject: parsed.subject,
          language: parsed.language,
          senderUserId: new Types.ObjectId(senderUserId),
          status,
          reason,
          sentAt: sentAt ?? undefined,
        });
      }

      if (insertDocs.length > 0) {
        await TournamentNotificationDeliveryModel.insertMany(insertDocs);
      }

      return {
        success: true,
        batchId,
        selectedPlayerCount,
        uniqueSelectedPlayerCount,
        playersFoundCount,
        skippedPlayerNotFoundCount,
        skippedNoUserCount,
        skippedNoEmailCount,
        skippedDuplicateEmailCount,
        uniqueEmailCount,
        sendAttemptCount,
        sentCount,
        failedCount,
        targetCount: uniqueSelectedPlayerCount,
        results,
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'sendTournamentPlayerNotification' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

const deliveriesLatestSchema = z.object({
  code: z.string().min(1),
});

export async function getTournamentNotificationDeliveriesLatestAction(input: { code: string }) {
  const run = withTelemetry(
    'tournaments.notifications.deliveriesLatest',
    async (payload: { code: string }) => {
      const { code } = deliveriesLatestSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await assertTournamentOrganizerOrGlobalAdmin(code, authResult.data.userId);

      await connectMongo();

      const latest = await TournamentNotificationDeliveryModel.aggregate([
        { $match: { tournamentCode: code } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$playerId',
            doc: { $first: '$$ROOT' },
          },
        },
      ]);

      const latestByPlayerId: Record<
        string,
        {
          status: string;
          reason?: string;
          sentAt?: string | null;
          createdAt: string;
          batchId: string;
        }
      > = {};

      for (const row of latest as any[]) {
        const id = row._id?.toString?.();
        const d = row.doc;
        if (!id || !d) continue;
        latestByPlayerId[id] = {
          status: d.status,
          reason: d.reason,
          sentAt: d.sentAt ? new Date(d.sentAt).toISOString() : null,
          createdAt: new Date(d.createdAt).toISOString(),
          batchId: String(d.batchId),
        };
      }

      return serializeForClient({ success: true, latestByPlayerId });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentNotificationDeliveriesLatest' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

const updateLegsConfigSchema = z.object({
  code: z.string().min(1),
  legsConfig: z
    .object({
      groups: z.record(z.string(), z.number().int().min(1).max(9)).optional(),
      knockout: z.record(z.string(), z.number().int().min(1).max(9)).optional(),
    })
    .nullable(),
});

export async function updateLegsConfigAction(input: {
  code: string;
  legsConfig: { groups?: Record<string, number>; knockout?: Record<string, number> } | null;
}) {
  const run = withTelemetry(
    'tournaments.updateLegsConfig',
    async (payload: typeof input) => {
      const parsed = updateLegsConfigSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await TournamentService.updateLegsConfig(
        parsed.code,
        authResult.data.userId,
        parsed.legsConfig
      );

      revalidateTournamentTags(parsed.code);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'updateLegsConfig' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
