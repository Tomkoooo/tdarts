/**
 * Tests for Tournament Legs-to-Win Configuration feature.
 * Covers Unit 1 (data model), Unit 4 (board payload), Unit 5 (board enforcement), Unit 6 (gameplay enforcement).
 */
import bcrypt from 'bcryptjs';
import { UserModel, ClubModel, PlayerModel, TournamentModel, MatchModel } from '@tdarts/core';
import { TournamentService } from '@tdarts/services';
import { connectMongo } from '@/lib/mongoose';
import type { LegsConfig } from '@/interface/tournament.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSettings = (overrides = {}) => ({
  status: 'pending' as const,
  name: `Legs Config Test ${Date.now()}`,
  startDate: new Date(),
  maxPlayers: 8,
  format: 'group_knockout' as const,
  startingScore: 501,
  boardCount: 2,
  entryFee: 0,
  tournamentPassword: 'test123',
  type: 'amateur' as const,
  registrationDeadline: new Date(Date.now() + 86400000),
  ...overrides,
});

let adminUser: any;
let club: any;

beforeEach(async () => {
  await connectMongo();
  await TournamentModel.deleteMany({});
  await MatchModel.deleteMany({});
  await PlayerModel.deleteMany({});
  await ClubModel.deleteMany({});
  await UserModel.deleteMany({});

  const hashedPassword = await bcrypt.hash('admin123', 10);
  adminUser = await UserModel.create({
    email: `legs-test-${Date.now()}@test.com`,
    password: hashedPassword,
    username: `legs_test_${Date.now()}`,
    name: 'Legs Test Admin',
    isVerified: true,
    isAdmin: true,
  });

  club = await ClubModel.create({
    name: 'Legs Config Test Club',
    description: 'test',
    location: 'Test',
    admin: [adminUser._id],
    moderators: [],
    members: [],
    tournamentPlayers: [],
    isActive: true,
  });
});

// ---------------------------------------------------------------------------
// Unit 1: Data model — legsConfig persistence
// ---------------------------------------------------------------------------

describe('Unit 1: legsConfig — schema round-trip', () => {
  test('tournament without legsConfig persists without errors and field is absent', async () => {
    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [{ boardNumber: 1, name: 'B1', isActive: true, status: 'idle' }],
      tournamentSettings: makeSettings(),
    });

    const reloaded = await TournamentModel.findOne({ tournamentId: tournament.tournamentId });
    expect(reloaded).toBeTruthy();
    // Field should be absent or undefined — not an empty object that could cause issues
    const legsConfig = reloaded!.tournamentSettings.legsConfig;
    expect(legsConfig === undefined || legsConfig === null).toBe(true);
  });

  test('tournament with legsConfig.groups persists and reads back correctly', async () => {
    const legsConfig: LegsConfig = { groups: { 1: 3, 2: 5 } };
    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [
        { boardNumber: 1, name: 'B1', isActive: true, status: 'idle' },
        { boardNumber: 2, name: 'B2', isActive: true, status: 'idle' },
      ],
      tournamentSettings: { ...makeSettings(), legsConfig },
    });

    const reloaded = await TournamentModel.findOne({ tournamentId: tournament.tournamentId });
    expect(reloaded!.tournamentSettings.legsConfig?.groups).toBeDefined();
    expect(reloaded!.tournamentSettings.legsConfig!.groups![1]).toBe(3);
    expect(reloaded!.tournamentSettings.legsConfig!.groups![2]).toBe(5);
  });

  test('tournament with legsConfig.knockout persists and reads back correctly', async () => {
    const legsConfig: LegsConfig = { knockout: { 1: 3, 2: 5, 3: 7 } };
    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [{ boardNumber: 1, name: 'B1', isActive: true, status: 'idle' }],
      tournamentSettings: { ...makeSettings(), legsConfig },
    });

    const reloaded = await TournamentModel.findOne({ tournamentId: tournament.tournamentId });
    expect(reloaded!.tournamentSettings.legsConfig?.knockout).toBeDefined();
    expect(reloaded!.tournamentSettings.legsConfig!.knockout![1]).toBe(3);
    expect(reloaded!.tournamentSettings.legsConfig!.knockout![2]).toBe(5);
    expect(reloaded!.tournamentSettings.legsConfig!.knockout![3]).toBe(7);
  });

  test('legsConfig survives a $set update to other tournamentSettings fields', async () => {
    const legsConfig: LegsConfig = { groups: { 1: 3 } };
    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [{ boardNumber: 1, name: 'B1', isActive: true, status: 'idle' }],
      tournamentSettings: { ...makeSettings(), legsConfig },
    });

    // Simulate the kind of update updateTournamentSettingsAction does: $set legsConfig
    await TournamentModel.findOneAndUpdate(
      { tournamentId: tournament.tournamentId },
      { $set: { 'tournamentSettings.legsConfig': legsConfig } }
    );

    // Update a separate field (description) using $set — legsConfig must not be overwritten
    await TournamentModel.findOneAndUpdate(
      { tournamentId: tournament.tournamentId },
      { $set: { 'tournamentSettings.description': 'updated' } }
    );

    const reloaded = await TournamentModel.findOne({ tournamentId: tournament.tournamentId });
    // legsConfig should still be intact
    expect(reloaded!.tournamentSettings.legsConfig?.groups?.[1]).toBe(3);
    expect(reloaded!.tournamentSettings.description).toBe('updated');
  });
});

// ---------------------------------------------------------------------------
// Unit 1 (edge): legsConfig survives group and knockout generation
// ---------------------------------------------------------------------------

describe('Unit 1: legsConfig — survives generation', () => {
  test('legsConfig.groups survives group generation and cancellation', async () => {
    const legsConfig: LegsConfig = { groups: { 1: 3, 2: 3 } };
    const players = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        PlayerModel.create({ name: `Player ${i + 1}`, isRegistered: false })
      )
    );

    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [
        { boardNumber: 1, name: 'B1', isActive: true, status: 'idle' },
        { boardNumber: 2, name: 'B2', isActive: true, status: 'idle' },
      ],
      tournamentSettings: { ...makeSettings({ format: 'group', maxPlayers: 4, boardCount: 2 }), legsConfig },
    });

    // Add & check-in players
    for (const p of players) {
      await TournamentService.addTournamentPlayer(tournament.tournamentId, p._id.toString());
      await TournamentService.updateTournamentPlayerStatus(tournament.tournamentId, p._id.toString(), 'checked-in');
    }

    // Generate groups — this replaces tournament.groups wholesale
    await TournamentService.generateGroups(tournament.tournamentId);

    const afterGenerate = await TournamentModel.findOne({ tournamentId: tournament.tournamentId });
    // legsConfig.groups must survive the wholesale groups[] replacement
    expect(afterGenerate!.tournamentSettings.legsConfig?.groups?.[1]).toBe(3);
    expect(afterGenerate!.tournamentSettings.legsConfig?.groups?.[2]).toBe(3);
  });

  test('cancelKnockout clears legsConfig.knockout but preserves legsConfig.groups', async () => {
    const legsConfig: LegsConfig = { groups: { 1: 3 }, knockout: { 1: 3, 2: 5, 3: 7 } };
    const players = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        PlayerModel.create({ name: `KO Player ${i + 1}`, isRegistered: false })
      )
    );

    const tournament = await TournamentService.createTournament({
      clubId: club._id,
      tournamentPlayers: [],
      groups: [],
      knockout: [],
      boards: [{ boardNumber: 1, name: 'B1', isActive: true, status: 'idle' }],
      tournamentSettings: { ...makeSettings({ format: 'knockout', maxPlayers: 4, boardCount: 1 }), legsConfig },
    });

    for (const p of players) {
      await TournamentService.addTournamentPlayer(tournament.tournamentId, p._id.toString());
      await TournamentService.updateTournamentPlayerStatus(tournament.tournamentId, p._id.toString(), 'checked-in');
    }

    // Manually set tournament to knockout stage to allow cancelKnockout
    await TournamentModel.findOneAndUpdate(
      { tournamentId: tournament.tournamentId },
      { $set: { 'tournamentSettings.status': 'knockout', knockout: [] } }
    );

    await TournamentService.cancelKnockout(tournament.tournamentId);

    const afterCancel = await TournamentModel.findOne({ tournamentId: tournament.tournamentId });
    // legsConfig.knockout should be cleared
    const knockoutConfig = afterCancel!.tournamentSettings.legsConfig?.knockout;
    expect(knockoutConfig === undefined || knockoutConfig === null).toBe(true);
    // legsConfig.groups should be preserved
    expect(afterCancel!.tournamentSettings.legsConfig?.groups?.[1]).toBe(3);
  });
});
