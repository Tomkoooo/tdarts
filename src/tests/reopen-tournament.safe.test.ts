import bcrypt from 'bcryptjs';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { PlayerModel } from '@/database/models/player.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { MatchModel } from '@/database/models/match.model';
import { LeagueModel } from '@/database/models/league.model';
import { TournamentService } from '@/database/services/tournament.service';
import { LeagueService } from '@/database/services/league.service';
import { connectMongo } from '@/lib/mongoose';

beforeEach(async () => {
  await connectMongo();
  await UserModel.deleteMany({});
  await ClubModel.deleteMany({});
  await PlayerModel.deleteMany({});
  await MatchModel.deleteMany({});
  await TournamentModel.deleteMany({});
  await LeagueModel.deleteMany({});
});

describe('TournamentService.reopenTournament (safe reopen)', () => {
  test('detaches league, clears league points, reverts player history, clears embedded TP', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await UserModel.create({
      email: 'reopen-admin@test.com',
      password: hashedPassword,
      username: 'reopen_admin',
      name: 'Reopen Admin',
      isVerified: true,
      isAdmin: true,
    });

    const club = await ClubModel.create({
      name: 'Reopen Test Club',
      description: 'test',
      location: 'Test',
      admin: [admin._id],
      moderators: [],
      members: [],
      tournamentPlayers: [],
      isActive: true,
    });

    const p1 = await PlayerModel.create({ name: 'P1', isRegistered: false });
    const p2 = await PlayerModel.create({ name: 'P2', isRegistered: false });

    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [{ boardNumber: 1, name: 'B1', isActive: true, status: 'idle' }],
      tournamentSettings: {
        status: 'pending',
        name: `Reopen safe ${Date.now()}`,
        description: 'test',
        startDate: new Date(),
        maxPlayers: 8,
        format: 'group',
        startingScore: 501,
        boardCount: 1,
        entryFee: 0,
        tournamentPassword: 't',
        location: 'L',
        type: 'amateur',
        registrationDeadline: new Date(Date.now() + 86400000),
      },
      isSandbox: false,
      verified: false,
      isActive: true,
    });

    await TournamentService.addTournamentPlayer(tournament.tournamentId, p1._id.toString());
    await TournamentService.addTournamentPlayer(tournament.tournamentId, p2._id.toString());
    await TournamentService.updateTournamentPlayerStatus(tournament.tournamentId, p1._id.toString(), 'checked-in');
    await TournamentService.updateTournamentPlayerStatus(tournament.tournamentId, p2._id.toString(), 'checked-in');

    const manualMatch = await MatchModel.create({
      boardReference: 1,
      tournamentRef: tournament._id,
      type: 'group',
      round: 1,
      status: 'finished',
      winnerId: p1._id,
      player1: {
        playerId: p1._id,
        legsWon: 2,
        legsLost: 0,
        average: 50,
        firstNineAvg: 50,
        highestCheckout: 100,
        oneEightiesCount: 0,
      },
      player2: {
        playerId: p2._id,
        legsWon: 0,
        legsLost: 2,
        average: 45,
        firstNineAvg: 45,
        highestCheckout: 0,
        oneEightiesCount: 0,
      },
      legs: [],
      manualOverride: true,
      manualChangeType: 'admin_finish',
    });

    const doc = await TournamentModel.findById(tournament._id);
    if (!doc) throw new Error('missing tournament');
    doc.groups = [{ board: 1, matches: [manualMatch._id] }] as any;
    await doc.save();

    await TournamentService.finishTournament(tournament.tournamentId, admin._id.toString());

    const league = await LeagueService.createLeague(club._id.toString(), admin._id.toString(), {
      name: `Reopen League ${Date.now()}`,
      description: 'test',
    });

    await LeagueService.attachTournamentToLeague(
      league._id.toString(),
      tournament._id.toString(),
      admin._id.toString(),
      true,
    );

    const leagueAfterAttach = await LeagueModel.findById(league._id);
    expect(leagueAfterAttach?.attachedTournaments?.some((id: any) => id.toString() === tournament._id.toString())).toBe(
      true,
    );
    const p1LeagueBefore = leagueAfterAttach?.players.find((pl: any) => pl.player.toString() === p1._id.toString());
    expect((p1LeagueBefore?.tournamentPoints || []).some((tp: any) => tp.tournament.toString() === tournament._id.toString())).toBe(
      true,
    );

    const p1BeforeReopen = await PlayerModel.findById(p1._id);
    const historyLenBefore = p1BeforeReopen?.tournamentHistory?.length ?? 0;
    expect(historyLenBefore).toBeGreaterThan(0);

    await TournamentService.reopenTournament(tournament.tournamentId, admin._id.toString());

    const leagueAfter = await LeagueModel.findById(league._id);
    expect(leagueAfter?.attachedTournaments?.some((id: any) => id.toString() === tournament._id.toString())).toBe(false);
    for (const pl of leagueAfter?.players || []) {
      expect(
        (pl.tournamentPoints || []).every((tp: any) => tp.tournament.toString() !== tournament._id.toString()),
      ).toBe(true);
    }

    const p1After = await PlayerModel.findById(p1._id);
    expect(p1After?.tournamentHistory?.some((th: any) => th.tournamentId === tournament.tournamentId)).toBe(false);
    expect((p1After?.tournamentHistory?.length ?? 0)).toBe(Math.max(0, historyLenBefore - 1));

    const reopened = await TournamentModel.findById(tournament._id);
    expect(reopened?.tournamentSettings?.status).toBe('group-stage');
    const tp1 = reopened?.tournamentPlayers.find(
      (tp: any) => tp.playerReference.toString() === p1._id.toString(),
    );
    expect(tp1?.tournamentStanding).toBeNull();
    expect(tp1?.stats?.matchesWon).toBe(0);
    expect(tp1?.finalStats?.matchesWon).toBe(0);
  });

  test('sandbox reopen does not mutate Player documents', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await UserModel.create({
      email: 'sandbox-reopen@test.com',
      password: hashedPassword,
      username: 'sandbox_reopen',
      name: 'Sandbox Reopen',
      isVerified: true,
      isAdmin: true,
    });

    const club = await ClubModel.create({
      name: 'Sandbox Club',
      description: 'test',
      location: 'Test',
      admin: [admin._id],
      moderators: [],
      members: [],
      tournamentPlayers: [],
      isActive: true,
    });

    const p1 = await PlayerModel.create({ name: 'SP1', isRegistered: false });
    const p2 = await PlayerModel.create({ name: 'SP2', isRegistered: false });

    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [{ boardNumber: 1, name: 'B1', isActive: true, status: 'idle' }],
      tournamentSettings: {
        status: 'pending',
        name: `Sandbox reopen ${Date.now()}`,
        description: 'test',
        startDate: new Date(),
        maxPlayers: 8,
        format: 'group',
        startingScore: 501,
        boardCount: 1,
        entryFee: 0,
        tournamentPassword: 't',
        location: 'L',
        type: 'amateur',
        registrationDeadline: new Date(Date.now() + 86400000),
      },
      isSandbox: true,
      verified: false,
      isActive: true,
    });

    await TournamentService.addTournamentPlayer(tournament.tournamentId, p1._id.toString());
    await TournamentService.addTournamentPlayer(tournament.tournamentId, p2._id.toString());
    await TournamentService.updateTournamentPlayerStatus(tournament.tournamentId, p1._id.toString(), 'checked-in');
    await TournamentService.updateTournamentPlayerStatus(tournament.tournamentId, p2._id.toString(), 'checked-in');

    const manualMatch = await MatchModel.create({
      boardReference: 1,
      tournamentRef: tournament._id,
      type: 'group',
      round: 1,
      status: 'finished',
      winnerId: p1._id,
      player1: {
        playerId: p1._id,
        legsWon: 2,
        legsLost: 0,
        average: 50,
        firstNineAvg: 50,
        highestCheckout: 80,
        oneEightiesCount: 0,
      },
      player2: {
        playerId: p2._id,
        legsWon: 0,
        legsLost: 2,
        average: 40,
        firstNineAvg: 40,
        highestCheckout: 0,
        oneEightiesCount: 0,
      },
      legs: [],
      manualOverride: true,
      manualChangeType: 'admin_finish',
    });

    const tdoc = await TournamentModel.findById(tournament._id);
    if (!tdoc) throw new Error('missing');
    tdoc.groups = [{ board: 1, matches: [manualMatch._id] }] as any;
    await tdoc.save();

    await TournamentService.finishTournament(tournament.tournamentId, admin._id.toString());

    const p1Before = (await PlayerModel.findById(p1._id).lean()) as Record<string, unknown> | null;
    const tpBefore = (p1Before?.stats as { tournamentsPlayed?: number } | undefined)?.tournamentsPlayed;
    const histBefore = JSON.stringify(
      (p1Before?.tournamentHistory as unknown[] | undefined) || [],
    );

    await TournamentService.reopenTournament(tournament.tournamentId, admin._id.toString());

    const p1After = (await PlayerModel.findById(p1._id).lean()) as Record<string, unknown> | null;
    expect((p1After?.stats as { tournamentsPlayed?: number } | undefined)?.tournamentsPlayed).toBe(tpBefore);
    expect(JSON.stringify((p1After?.tournamentHistory as unknown[] | undefined) || [])).toBe(histBefore);
  });
});
