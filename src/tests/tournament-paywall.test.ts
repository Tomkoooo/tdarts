import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';  
import { UserModel } from '@/database/models/user.model';
import { SubscriptionService } from '@/database/services/subscription.service';

describe('Tournament Paywall & OAC Limits', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Enable subscription feature for tests
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    
    // Disconnect any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await ClubModel.deleteMany({});
    await TournamentModel.deleteMany({});
    await UserModel.deleteMany({});
  });

  describe('Subscription Limits', () => {
    it('should allow free tier to create 1 tournament per month', async () => {
      // Create club with free subscription
      const club = await ClubModel.create({
        name: 'Free Club',
        description: 'Test',
        location: 'Test',
        subscriptionModel: 'free',
        admin: []
      });

      const startDate = new Date();

      // First tournament should succeed
      const check1 = await SubscriptionService.canCreateTournament(
        club._id.toString(),
        startDate,
        false, // not sandbox
        false  // not verified
      );
      expect(check1.canCreate).toBe(true);

      // Create first tournament
      await TournamentModel.create({
        tournamentId: 'TEST1',
        clubId: club._id,
        tournamentPlayers: [],
        groups: [],
        knockout: [],
        boards: [],
        tournamentSettings: {
          status: 'pending',
          name: 'Test Tournament 1',
          startDate,
          maxPlayers: 16,
          format: 'group',
          startingScore: 501,
          tournamentPassword: 'test',
          boardCount: 1,
          entryFee: 0,
          location: 'Test',
          type: 'amateur',
          registrationDeadline: startDate
        },
        isSandbox: false,
        verified: false
      });

      // Second tournament should fail
      const check2 = await SubscriptionService.canCreateTournament(
        club._id.toString(),
        startDate,
        false,
        false
      );
      expect(check2.canCreate).toBe(false);
      expect(check2.currentCount).toBe(1);
      expect(check2.maxAllowed).toBe(1);
    });

    it('should allow basic tier to create 2 tournaments per month', async () => {
      const club = await ClubModel.create({
        name: 'Basic Club',
        description: 'Test',
        location: 'Test',
        subscriptionModel: 'basic',
        admin: []
      });

      const startDate = new Date();

      // Create 2 tournaments
      for (let i = 0; i < 2; i++) {
        await TournamentModel.create({
          tournamentId: `TEST${i}`,
          clubId: club._id,
          tournamentPlayers: [],
          groups: [],
          knockout: [],
          boards: [],
          tournamentSettings: {
            status: 'pending',
            name: `Test Tournament ${i}`,
            startDate,
            maxPlayers: 16,
            format: 'group',
            startingScore: 501,
            tournamentPassword: 'test',
            boardCount: 1,
            entryFee: 0,
            location: 'Test',
            type: 'amateur',
            registrationDeadline: startDate
          },
          isSandbox: false,
          verified: false
        });
      }

      // Third tournament should fail
      const check = await SubscriptionService.canCreateTournament(
        club._id.toString(),
        startDate,
        false,
        false
      );
      expect(check.canCreate).toBe(false);
      expect(check.currentCount).toBe(2);
      expect(check.maxAllowed).toBe(2);
    });

    it('should allow enterprise tier unlimited tournaments', async () => {
      const club = await ClubModel.create({
        name: 'Enterprise Club',
        description: 'Test',
        location: 'Test',
        subscriptionModel: 'enterprise',
        admin: []
      });

      const startDate = new Date();

      // Create 10 tournaments
      for (let i = 0; i < 10; i++) {
        await TournamentModel.create({
          tournamentId: `TEST${i}`,
          clubId: club._id,
          tournamentPlayers: [],
          groups: [],
          knockout: [],
          boards: [],
          tournamentSettings: {
            status: 'pending',
            name: `Test Tournament ${i}`,
            startDate,
            maxPlayers: 16,
            format: 'group',
            startingScore: 501,
            tournamentPassword: 'test',
            boardCount: 1,
            entryFee: 0,
            location: 'Test',
            type: 'amateur',
            registrationDeadline: startDate
          },
          isSandbox: false,
          verified: false
        });
      }

      // Should still be able to create more
      const check = await SubscriptionService.canCreateTournament(
        club._id.toString(),
        startDate,
        false,
        false
      );
      expect(check.canCreate).toBe(true);
      expect(check.maxAllowed).toBe(-1);
    });
  });

  describe('Sandbox Exclusion', () => {
    it('should not count sandbox tournaments towards monthly limit', async () => {
      const club = await ClubModel.create({
        name: 'Free Club',
        description: 'Test',
        location: 'Test',
        subscriptionModel: 'free',
        admin: []
      });

      const startDate = new Date();

      // Create 5 sandbox tournaments
      for (let i = 0; i < 5; i++) {
        await TournamentModel.create({
          tournamentId: `SANDBOX${i}`,
          clubId: club._id,
          tournamentPlayers: [],
          groups: [],
          knockout: [],
          boards: [],
          tournamentSettings: {
            status: 'pending',
            name: `Sandbox ${i}`,
            startDate,
            maxPlayers: 16,
            format: 'group',
            startingScore: 501,
            tournamentPassword: 'test',
            boardCount: 1,
            entryFee: 0,
            location: 'Test',
            type: 'amateur',
            registrationDeadline: startDate
          },
          isSandbox: true,
          verified: false
        });
      }

      // Should still allow regular tournament
      const check = await SubscriptionService.canCreateTournament(
        club._id.toString(),
        startDate,
        false,
        false
      );
      expect(check.canCreate).toBe(true);
      expect(check.currentCount).toBe(0);
    });
  });

  describe('OAC Verified Tournament Limits', () => {
    it('should not count verified tournaments towards monthly limit', async () => {
      const club = await ClubModel.create({
        name: 'Free Club',
        description: 'Test',
        location: 'Test',
        subscriptionModel: 'free',
        admin: []
      });

      const startDate = new Date();

      // Create verified tournament
      await TournamentModel.create({
        tournamentId: 'OAC1',
        clubId: club._id,
        tournamentPlayers: [],
        groups: [],
        knockout: [],
        boards: [],
        tournamentSettings: {
          status: 'pending',
          name: 'OAC Tournament',
          startDate,
          maxPlayers: 16,
          format: 'group',
          startingScore: 501,
          tournamentPassword: 'test',
          boardCount: 1,
          entryFee: 0,
          location: 'Test',
          type: 'amateur',
          registrationDeadline: startDate
        },
        isSandbox: false,
        verified: true
      });

      // Should still allow regular tournament
      const check = await SubscriptionService.canCreateTournament(
        club._id.toString(),
        startDate,
        false,
        false
      );
      expect(check.canCreate).toBe(true);
      expect(check.currentCount).toBe(0);
    });

    it('should limit verified tournaments to 1 per week (Monday-Saturday)', async () => {
      const club = await ClubModel.create({
        name: 'Pro Club',
        description: 'Test',
        location: 'Test',
        subscriptionModel: 'pro',
        admin: []
      });

      // Create tournament on Monday
      const monday = new Date('2025-12-22'); // A Monday
      await TournamentModel.create({
        tournamentId: 'OAC_MON',
        clubId: club._id,
        tournamentPlayers: [],
        groups: [],
        knockout: [],
        boards: [],
        tournamentSettings: {
          status: 'pending',
          name: 'OAC Monday',
          startDate: monday,
          maxPlayers: 16,
          format: 'group',
          startingScore: 501,
          tournamentPassword: 'test',
          boardCount: 1,
          entryFee: 0,
          location: 'Test',
          type: 'amateur',
          registrationDeadline: monday
        },
        isSandbox: false,
        verified: true
      });

      const existing = await TournamentModel.findOne({
        clubId: club._id,
        verified: true,
        'tournamentSettings.startDate': {
          $gte: new Date('2025-12-22T00:00:00.000Z'), // Monday
          $lte: new Date('2025-12-27T23:59:59.999Z')  // Saturday
        },
        isDeleted: false,
        isCancelled: false
      });

      expect(existing).not.toBeNull();
      expect(existing?.tournamentId).toBe('OAC_MON');
    });
  });
});
