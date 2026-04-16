import bcrypt from 'bcryptjs';
import { UserModel, ClubModel, PlayerModel, TournamentModel, EVENTS } from '@tdarts/core';
import { TournamentService, MatchService } from '@tdarts/services';
import * as core from '@tdarts/core';

describe('MatchService SSE publish contract', () => {
  let tournamentCode: string;
  let firstGroupMatchId: string;
  let testUserId: string;

  beforeAll(async () => {
    jest.setTimeout(120_000);

    const hashedPassword = await bcrypt.hash('rtp-test-user-123', 10);
    const testUser = await UserModel.create({
      email: `rtp-${Date.now()}@test.local`,
      password: hashedPassword,
      username: `rtp_user_${Date.now()}`,
      name: 'RTP Test User',
      isVerified: true,
      isAdmin: true,
    });
    testUserId = testUser._id.toString();

    const testClub = await ClubModel.create({
      name: 'RTP Test Club',
      description: 'realtime publish contract',
      location: 'Test',
      admin: [testUser._id],
      moderators: [],
      members: [],
      tournamentPlayers: [],
      isActive: true,
    });

    await PlayerModel.create({
      name: testUser.name,
      userRef: testUser._id,
      isRegistered: true,
    });

    const tournament = await TournamentService.createTournament({
      clubId: testClub._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [{ boardNumber: 1, name: 'B1', isActive: true, status: 'idle' as const }],
      tournamentSettings: {
        status: 'pending',
        name: `RTP Contract ${Date.now()}`,
        description: 'publish path',
        startDate: new Date(),
        maxPlayers: 4,
        format: 'group_knockout',
        startingScore: 501,
        boardCount: 1,
        entryFee: 0,
        tournamentPassword: 'test',
        location: 'Test',
        type: 'amateur',
        registrationDeadline: new Date(Date.now() + 3_600_000),
      },
      isSandbox: true,
      verified: false,
      isActive: true,
    });

    tournamentCode = tournament.tournamentId;

    const players = await Promise.all(
      [0, 1, 2, 3].map((i) =>
        PlayerModel.create({ name: `RTP Player ${i}`, isRegistered: false }),
      ),
    );

    for (const p of players) {
      await TournamentService.addTournamentPlayer(tournamentCode, p._id.toString());
      await TournamentService.updateTournamentPlayerStatus(tournamentCode, p._id.toString(), 'checked-in');
    }

    await TournamentService.generateGroups(tournamentCode, testUserId);

    const doc = await TournamentModel.findById(tournament._id);
    const groupMatchIds = (doc?.groups ?? []).flatMap((g: { matches?: unknown[] }) =>
      (g.matches ?? []).map((id) => String(id)),
    );
    firstGroupMatchId = groupMatchIds[0];
    if (!firstGroupMatchId) {
      throw new Error('expected at least one group match');
    }
  }, 120_000);

  it('startMatch publishes one MATCH_UPDATE delta with action started', async () => {
    const publishSpy = jest.spyOn(core.eventsBus, 'publish');
    publishSpy.mockClear();

    await MatchService.startMatch(tournamentCode, firstGroupMatchId, 2, 1);

    const matchCalls = publishSpy.mock.calls.filter((c) => c[0] === EVENTS.MATCH_UPDATE);
    expect(matchCalls.length).toBeGreaterThanOrEqual(1);
    const payload = matchCalls[0]![1] as {
      kind?: string;
      action?: string;
      tournamentId?: string;
    };
    expect(payload.kind).toBe('delta');
    expect(payload.action).toBe('started');
    expect(payload.tournamentId).toBe(tournamentCode);

    publishSpy.mockRestore();
  });
});
