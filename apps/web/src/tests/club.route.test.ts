/**
 * Club route tests - migrated to test server actions.
 * Original API routes were removed during Next.js 16 migration.
 */
import { getClubAction } from '@/features/clubs/actions/getClub.action';
import { ClubService } from '@tdarts/services';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { UserModel, ClubModel } from '@tdarts/core';
import { Types } from 'mongoose';

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  ClubService: {
    getClubByCode: jest.fn(),
    getClub: jest.fn(),
  },
}));

describe('Club Actions', () => {
  beforeAll(async () => {
    await connectToDatabase();
  }, 20000);

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
  });

  describe('getClubAction', () => {
    it('should get club details', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        description: 'A test club',
        location: 'Test City',
        members: [],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      (ClubService.getClub as jest.Mock).mockResolvedValue(mockClub);

      const result = await getClubAction({ clubId: mockClub._id });

      expect(result).toMatchObject(mockClub);
      expect(ClubService.getClub).toHaveBeenCalledWith(mockClub._id);
    }, 20000);
  });
});
