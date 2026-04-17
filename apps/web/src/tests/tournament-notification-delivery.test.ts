/**
 * Tests for tournament bulk player notification delivery accounting and persistence.
 */

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/mailer', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  TournamentService: {
    ...jest.requireActual('@tdarts/services').TournamentService,
    getTournament: jest.fn(),
  },
  AuthorizationService: {
    checkAdminOrModerator: jest.fn(),
    isGlobalAdmin: jest.fn(),
  },
}));

jest.mock('@tdarts/core', () => ({
  ...jest.requireActual('@tdarts/core'),
  PlayerModel: { find: jest.fn() },
  UserModel: { find: jest.fn() },
  TournamentNotificationDeliveryModel: {
    insertMany: jest.fn().mockResolvedValue(true),
    aggregate: jest.fn(),
  },
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import { Types } from 'mongoose';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { sendEmail } from '@/lib/mailer';
import { TournamentService, AuthorizationService } from '@tdarts/services';
import {
  PlayerModel,
  UserModel,
  TournamentNotificationDeliveryModel,
} from '@tdarts/core';
import {
  sendTournamentPlayerNotificationAction,
  getTournamentNotificationDeliveriesLatestAction,
} from '@/features/tournaments/actions/manageTournament.action';

const USER_ID = new Types.ObjectId().toString();
const P1 = new Types.ObjectId().toString();
const P2 = new Types.ObjectId().toString();
const U1 = new Types.ObjectId().toString();

const mockAuthOk = () => {
  (authorizeUserResult as jest.Mock).mockResolvedValue({
    ok: true,
    data: { userId: USER_ID },
  });
};

const mockTournament = () => {
  (TournamentService.getTournament as jest.Mock).mockResolvedValue({
    tournamentId: 'T1',
    clubId: { _id: 'club1' },
  });
};

const mockOrganizer = () => {
  (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(true);
  (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(false);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthOk();
  mockTournament();
  mockOrganizer();
});

describe('sendTournamentPlayerNotificationAction', () => {
  it('denies when user is neither club moderator nor global admin', async () => {
    (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(false);
    (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(false);

    await expect(
      sendTournamentPlayerNotificationAction({
        code: 'T1',
        mode: 'selected',
        playerIds: [P1],
        subject: 'Hi',
        message: 'Body',
        language: 'en',
      })
    ).rejects.toThrow('Forbidden');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('counts duplicate e-mail (same user on two players) as one attempt and skips the second player', async () => {
    (PlayerModel.find as jest.Mock).mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { _id: P1, userRef: U1, name: 'A' },
            { _id: P2, userRef: U1, name: 'B' },
          ]),
      }),
    });
    (UserModel.find as jest.Mock).mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: U1, email: 'same@example.com', name: 'U' }]),
      }),
    });
    (sendEmail as jest.Mock).mockResolvedValue(true);

    const result = (await sendTournamentPlayerNotificationAction({
      code: 'T1',
      mode: 'selected',
      playerIds: [P1, P2],
      subject: 'S',
      message: 'M',
      language: 'en',
    })) as Record<string, unknown>;

    expect(result.success).toBe(true);
    expect(result.uniqueEmailCount).toBe(1);
    expect(result.sendAttemptCount).toBe(1);
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.skippedDuplicateEmailCount).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const rows = result.results as Array<{ playerId: string; status: string; reason?: string }>;
    expect(rows).toHaveLength(2);
    const dup = rows.find((r) => r.playerId === P2);
    expect(dup?.status).toBe('skipped');
    expect(dup?.reason).toBe('duplicate_email');

    expect(TournamentNotificationDeliveryModel.insertMany).toHaveBeenCalledTimes(1);
  });

  it('treats sendEmail resolving false as failure, not success', async () => {
    (PlayerModel.find as jest.Mock).mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: P1, userRef: U1, name: 'A' }]),
      }),
    });
    (UserModel.find as jest.Mock).mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: U1, email: 'a@example.com', name: 'U' }]),
      }),
    });
    (sendEmail as jest.Mock).mockResolvedValue(false);

    const result = (await sendTournamentPlayerNotificationAction({
      code: 'T1',
      mode: 'selected',
      playerIds: [P1],
      subject: 'S',
      message: 'M',
      language: 'en',
    })) as Record<string, unknown>;

    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
    const rows = result.results as Array<{ status: string; reason?: string }>;
    expect(rows[0].status).toBe('failed');
    expect(rows[0].reason).toBe('send_mail_returned_false');
  });

  it('increments skippedPlayerNotFoundCount when id is not in DB', async () => {
    const missing = new Types.ObjectId().toString();
    (PlayerModel.find as jest.Mock).mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: P1, userRef: U1, name: 'A' }]),
      }),
    });
    (UserModel.find as jest.Mock).mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: U1, email: 'a@example.com', name: 'U' }]),
      }),
    });
    (sendEmail as jest.Mock).mockResolvedValue(true);

    const result = (await sendTournamentPlayerNotificationAction({
      code: 'T1',
      mode: 'selected',
      playerIds: [P1, missing],
      subject: 'S',
      message: 'M',
      language: 'en',
    })) as Record<string, unknown>;

    expect(result.skippedPlayerNotFoundCount).toBe(1);
    expect(result.playersFoundCount).toBe(1);
    const rows = result.results as Array<{ playerId: string; status: string }>;
    expect(rows.find((r) => r.playerId === missing)?.status).toBe('skipped');
  });
});

describe('getTournamentNotificationDeliveriesLatestAction', () => {
  it('denies when user is neither club moderator nor global admin', async () => {
    (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(false);
    (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(false);

    await expect(getTournamentNotificationDeliveriesLatestAction({ code: 'T1' })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('returns latest delivery per player', async () => {
    const pid = new Types.ObjectId();
    const batch = 'batch-1';
    (TournamentNotificationDeliveryModel.aggregate as jest.Mock).mockResolvedValue([
      {
        _id: pid,
        doc: {
          status: 'sent',
          reason: undefined,
          sentAt: new Date('2024-01-02T00:00:00.000Z'),
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          batchId: batch,
        },
      },
    ]);

    const result = (await getTournamentNotificationDeliveriesLatestAction({
      code: 'T1',
    })) as { success?: boolean; latestByPlayerId?: Record<string, { status: string }> };

    expect(result.success).toBe(true);
    expect(result.latestByPlayerId?.[pid.toString()]?.status).toBe('sent');
  });
});
