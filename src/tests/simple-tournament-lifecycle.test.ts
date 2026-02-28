import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { PlayerModel } from '@/database/models/player.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { MatchModel } from '@/database/models/match.model';
import { LeagueModel } from '@/database/models/league.model';
import { TournamentService } from '@/database/services/tournament.service';
import { MatchService } from '@/database/services/match.service';
import { LeagueService } from '@/database/services/league.service';
import { connectMongo } from '@/lib/mongoose';
import { PointSystemId, POINT_SYSTEM_IDS, normalizePointSystemId } from '@/lib/leaguePointSystems';

const TEST_CONFIG = {
  playerCount: 16,
  boardCount: 4,
  legsToWin: 2,
};

let testUser: any;
let testClub: any;

type PlayerId = string;

function parsePointSystemsFromEnv(): PointSystemId[] {
  const raw = process.env.LIFECYCLE_POINT_SYSTEMS;
  if (!raw || raw.trim() === '' || raw.toLowerCase() === 'none') {
    return [];
  }

  if (raw.toLowerCase() === 'all') {
    return [...POINT_SYSTEM_IDS];
  }

  return raw
    .split(',')
    .map((value) => normalizePointSystemId(value.trim()))
    .filter((value, index, self) => self.indexOf(value) === index);
}

const calculateKnockoutPlayersCount = (totalPlayers: number): number => {
  let playersCount = 1;
  while (playersCount * 2 <= totalPlayers) {
    playersCount *= 2;
  }
  return Math.max(4, Math.min(playersCount, totalPlayers));
};

const setupTestData = async () => {
  await connectMongo();

  const hashedPassword = await bcrypt.hash('testuser123', 10);
  testUser = await UserModel.create({
    email: 'lifecycle-test@test.com',
    password: hashedPassword,
    username: 'lifecycle_test',
    name: 'Lifecycle Test User',
    isVerified: true,
    isAdmin: false
  });

  testClub = await ClubModel.create({
    name: 'Test Club for Lifecycle',
    description: 'Automated test club',
    location: 'Test Location',
    admin: [testUser._id],
    moderators: [],
    members: [],
    tournamentPlayers: [],
    isActive: true
  });

  await PlayerModel.create({
    name: testUser.name,
    userRef: testUser._id,
    isRegistered: true
  });
};

async function playMatchFast(tournamentCode: string, matchId: string, winner: 1 | 2): Promise<void> {
  await MatchService.startMatch(tournamentCode, matchId, TEST_CONFIG.legsToWin, 1);
  await MatchService.finishMatch(matchId, {
    player1LegsWon: winner === 1 ? TEST_CONFIG.legsToWin : 0,
    player2LegsWon: winner === 2 ? TEST_CONFIG.legsToWin : 0,
    allowManualFinish: true
  });
}

function calculatePlatformPoints(position: number, eliminatedIn: string, totalPlayers: number, config: any): number {
  if (config.useFixedRanks && config.fixedRankPoints) {
    return config.fixedRankPoints[position] || 0;
  }

  if (eliminatedIn === 'group' || eliminatedIn.includes('group')) {
    return config.groupDropoutPoints;
  }

  if (position === 1) {
    const highestGeometric = config.knockoutBasePoints * Math.pow(config.knockoutMultiplier, config.maxKnockoutRounds - 1);
    return Math.round(highestGeometric + config.winnerBonus);
  }

  let knockoutRound = 1;
  if (position === 2) knockoutRound = config.maxKnockoutRounds;
  else knockoutRound = Math.max(1, config.maxKnockoutRounds - Math.floor(Math.log2(position - 1)));

  const points = config.knockoutBasePoints * Math.pow(config.knockoutMultiplier, Math.max(1, knockoutRound) - 1);
  return Math.round(points);
}

function calculateOntourPoints(position: number): number {
  switch (position) {
    case 1: return 45;
    case 2: return 32;
    case 3: return 24;
    case 4: return 20;
    case 8: return 16;
    case 16: return 10;
    case 32: return 4;
    case 48: return 2;
    default: return 0;
  }
}

function calculateGoldfischPoints(position: number, totalPlayers: number): number {
  if (totalPlayers < 8) {
    switch (position) {
      case 1: return 10;
      case 2: return 8;
      case 3: return 6;
      case 4: return 5;
      case 5: return 4;
      case 6: return 3;
      case 7: return 2;
      default: return 0;
    }
  }

  switch (position) {
    case 1: return 15;
    case 2: return 12;
    case 4: return 10;
    case 8: return 8;
    case 16: return 6;
    case 32: return 4;
    case 64: return 2;
    case 128: return 1;
    default: return 0;
  }
}

function getRemizGroupPoints(groupSize: number, wins: number): number {
  const pointsMap: Record<number, Record<number, number>> = {
    3: { 0: 0, 1: 30, 2: 60 },
    4: { 0: 0, 1: 20, 2: 40, 3: 60 },
    5: { 0: 0, 1: 15, 2: 30, 3: 45, 4: 60 },
    6: { 0: 0, 1: 12, 2: 24, 3: 36, 4: 48, 5: 60 },
  };

  const groupMap = pointsMap[groupSize];
  if (!groupMap) return 0;
  if (groupMap[wins] !== undefined) return groupMap[wins];
  const maxWins = Math.max(...Object.keys(groupMap).map(Number));
  if (wins > maxWins) return groupMap[maxWins];
  return 0;
}

function getRemizPlacementPoints(position: number): number {
  if (position === 1) return 100;
  if (position === 2) return 60;
  if (position === 4) return 40;
  if (position === 8) return 30;
  if (position === 16) return 20;
  if (position === 32) return 10;
  return 0;
}

async function calculateExpectedPoints(system: PointSystemId, tournament: any, leagueConfig: any): Promise<Map<PlayerId, number>> {
  const checkedInPlayers = tournament.tournamentPlayers.filter(
    (player: any) => player.status === 'checked-in' || player.status === 'eliminated' || player.status === 'winner'
  );
  const totalPlayers = checkedInPlayers.length;
  const points = new Map<PlayerId, number>();

  const groupMatchesByGroup = new Map<string, any[]>();
  if (system === 'remiz_christmas') {
    for (const group of tournament.groups || []) {
      const groupId = group._id.toString();
      const matches = await MatchModel.find({
        _id: { $in: group.matches || [] },
        type: 'group'
      });
      groupMatchesByGroup.set(groupId, matches);
    }
  }

  for (const tp of checkedInPlayers) {
    const playerId = tp.playerReference?._id?.toString() || tp.playerReference.toString();
    const position = tp.tournamentStanding || tp.finalPosition || 999;
    const eliminatedIn = tp.eliminatedIn || 'unknown';

    let playerPoints = 0;
    switch (system) {
      case 'remiz_christmas': {
        playerPoints = 20;
        const groupId = tp.groupId?.toString();
        if (groupId) {
          const groupPlayers = checkedInPlayers.filter((p: any) => p.groupId?.toString() === groupId);
          const groupMatches = groupMatchesByGroup.get(groupId) || [];
          const wins = groupMatches.filter((m: any) => m.winnerId?.toString() === playerId).length;
          playerPoints += getRemizGroupPoints(groupPlayers.length, wins);
        }
        playerPoints += getRemizPlacementPoints(position);
        break;
      }
      case 'ontour':
        playerPoints = calculateOntourPoints(position);
        break;
      case 'goldfisch':
        playerPoints = calculateGoldfischPoints(position, totalPlayers);
        break;
      default:
        playerPoints = calculatePlatformPoints(position, eliminatedIn, totalPlayers, leagueConfig);
        break;
    }

    points.set(playerId, playerPoints);
  }

  return points;
}

describe('Simple Tournament Lifecycle Test', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('Complete lifecycle and optional point-system matrix', async () => {
    jest.setTimeout(300000);
    await setupTestData();

    const tournamentBoards = Array.from({ length: TEST_CONFIG.boardCount }, (_, index) => ({
      boardNumber: index + 1,
      name: `Tabla ${index + 1}`,
      isActive: true,
      status: 'idle' as const
    }));

    const tournament = await TournamentService.createTournament({
      clubId: testClub._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: tournamentBoards,
      tournamentSettings: {
        status: 'pending',
        name: `Simple Lifecycle Tournament - ${Date.now()}`,
        description: `Automated lifecycle test with ${TEST_CONFIG.playerCount} players`,
        startDate: new Date(),
        maxPlayers: TEST_CONFIG.playerCount,
        format: 'group_knockout',
        startingScore: 501,
        boardCount: TEST_CONFIG.boardCount,
        entryFee: 1000,
        tournamentPassword: 'test123',
        location: 'Test Location',
        type: 'amateur',
        registrationDeadline: new Date(Date.now() + 60 * 60 * 1000)
      },
      isSandbox: false,
      verified: false,
      isActive: true
    });

    const tournamentCode = tournament.tournamentId;
    const tournamentId = tournament._id.toString();

    const createdPlayers = await Promise.all(
      Array.from({ length: TEST_CONFIG.playerCount }, (_, index) =>
        PlayerModel.create({ name: `Lifecycle Player ${index + 1}`, isRegistered: false })
      )
    );

    for (const player of createdPlayers) {
      await TournamentService.addTournamentPlayer(tournamentCode, player._id.toString());
      await TournamentService.updateTournamentPlayerStatus(tournamentCode, player._id.toString(), 'checked-in');
    }

    await TournamentService.generateGroups(tournamentCode, testUser._id.toString());

    let currentTournament = await TournamentModel.findById(tournamentId);
    expect(currentTournament?.groups?.length).toBeGreaterThan(0);

    const groupMatchIds = (currentTournament?.groups || []).flatMap((group: any) =>
      (group.matches || []).map((matchId: any) => matchId.toString())
    );

    for (let index = 0; index < groupMatchIds.length; index++) {
      const matchId = groupMatchIds[index];
      await playMatchFast(tournamentCode, matchId, index % 2 === 0 ? 1 : 2);
    }

    await TournamentService.updateGroupStanding(tournamentCode);

    currentTournament = await TournamentModel.findById(tournamentId);
    const checkedInCount = (currentTournament?.tournamentPlayers || []).filter((p: any) => p.status === 'checked-in').length;
    const knockoutPlayers = calculateKnockoutPlayersCount(checkedInCount);

    await TournamentService.generateKnockout(tournamentCode, testUser._id.toString(), {
      playersCount: knockoutPlayers
    });

    while (true) {
      const knockoutTournament = await TournamentModel.findById(tournamentId);
      const playableByRound = new Map<number, string[]>();

      for (const round of knockoutTournament?.knockout || []) {
        for (const knockoutMatch of round.matches || []) {
          const matchId = knockoutMatch.matchReference?.toString();
          if (!matchId) continue;

          const matchDoc = await MatchModel.findById(matchId);
          if (!matchDoc) continue;
          if (matchDoc.status === 'finished') continue;
          if (!matchDoc.player1?.playerId || !matchDoc.player2?.playerId) continue;

          const roundMatches = playableByRound.get(round.round) || [];
          roundMatches.push(matchId);
          playableByRound.set(round.round, roundMatches);
        }
      }

      if (playableByRound.size === 0) break;

      const nextRound = Math.min(...Array.from(playableByRound.keys()));
      const matchesInRound = playableByRound.get(nextRound) || [];
      for (let index = 0; index < matchesInRound.length; index++) {
        await playMatchFast(tournamentCode, matchesInRound[index], index % 2 === 0 ? 1 : 2);
      }
    }

    await TournamentService.finishTournament(tournamentCode, testUser._id.toString());

    const finishedTournament = await TournamentModel.findById(tournamentId);
    expect(finishedTournament?.tournamentSettings?.status).toBe('finished');
    expect(finishedTournament?.tournamentPlayers?.length).toBe(TEST_CONFIG.playerCount);

    const pointSystemsToTest = parsePointSystemsFromEnv();
    for (let index = 0; index < pointSystemsToTest.length; index++) {
      const pointSystemType = pointSystemsToTest[index];

      const league = await LeagueService.createLeague(
        testClub._id.toString(),
        testUser._id.toString(),
        {
          name: `Lifecycle ${pointSystemType} League ${Date.now()}-${index}`,
          description: `Lifecycle test league for ${pointSystemType}`,
          pointSystemType
        }
      );

      await LeagueService.attachTournamentToLeague(
        league._id.toString(),
        tournamentId,
        testUser._id.toString(),
        false
      );

      await TournamentService.reopenTournament(tournamentCode, testUser._id.toString());
      await TournamentService.finishTournament(tournamentCode, testUser._id.toString());

      const recalculatedTournament = await TournamentModel.findById(tournamentId);
      const refreshedLeague = await LeagueModel.findById(league._id);
      const expected = await calculateExpectedPoints(
        pointSystemType,
        recalculatedTournament,
        refreshedLeague?.pointsConfig
      );

      const actual = new Map<string, number>();
      const leaguePlayers = refreshedLeague?.players || [];
      for (const playerEntry of leaguePlayers) {
        const playerId = playerEntry.player.toString();
        const tournamentPointsEntry = (playerEntry.tournamentPoints || []).find(
          (entry: any) => entry.tournament.toString() === tournamentId
        );
        actual.set(playerId, tournamentPointsEntry?.points || 0);
      }

      for (const [playerId, expectedPoints] of expected.entries()) {
        expect(actual.get(playerId)).toBe(expectedPoints);
      }

      if (index < pointSystemsToTest.length - 1) {
        await LeagueService.detachTournamentFromLeague(
          league._id.toString(),
          tournamentId,
          testUser._id.toString()
        );
      }
    }
  }, 300000);
});

describe('Test Configuration', () => {
  test('Configuration is valid', () => {
    expect(TEST_CONFIG.playerCount).toBeGreaterThan(0);
    expect(TEST_CONFIG.boardCount).toBeGreaterThan(0);
    expect(TEST_CONFIG.legsToWin).toBeGreaterThan(0);
  });
});
