import { ClubService } from '@/database/services/club.service';
import { ClubModel } from '@/database/models/club.model';
import { UserModel } from '@/database/models/user.model';
import { BadRequestError } from '@/middleware/errorHandle';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { Types } from 'mongoose';
import { ClubDocument } from '@/interface/club.interface';

describe('ClubService', () => {
  beforeAll(async () => {
    await connectToDatabase();
  }, 15000);

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
  });

  it('should create a new club', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(user._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
      contact: { email: 'club@example.com' },
    });

    expect(club).toBeDefined();
    expect(club.name).toBe('TestClub');
    expect(club.description).toBe('A test club');
    expect(club.location).toBe('Test City');
    expect(club.contact.email).toBe('club@example.com');
    expect(club.admin).toContainEqual(new Types.ObjectId(user._id));
    expect(club.members).toContainEqual(new Types.ObjectId(user._id));
    expect(club.isActive).toBe(true);
  }, 15000);

  it('should throw error if club name already exists', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
      isVerified: true,
    });

    await ClubService.createClub(user._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.createClub(user._id.toString(), {
        name: 'TestClub',
        description: 'Another club',
        location: 'Another City',
      })
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.createClub(user._id.toString(), {
        name: 'TestClub',
        description: 'Another club',
        location: 'Another City',
      })
    ).rejects.toThrow('Club name already exists');
  }, 15000);

  it('should throw error if user is already in a club', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
      isVerified: true,
    });

    await ClubService.createClub(user._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.createClub(user._id.toString(), {
        name: 'AnotherClub',
        description: 'Another club',
        location: 'Another City',
      })
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.createClub(user._id.toString(), {
        name: 'AnotherClub',
        description: 'Another club',
        location: 'Another City',
      })
    ).rejects.toThrow('User is already associated with a club');
  }, 15000);

  it('should update club details by admin', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(user._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    const updatedClub: ClubDocument = await ClubService.updateClub(club._id.toString(), user._id.toString(), {
      name: 'UpdatedClub',
      description: 'Updated description',
      location: 'Updated City',
      contact: { email: 'updated@example.com' },
    });

    expect(updatedClub.name).toBe('UpdatedClub');
    expect(updatedClub.description).toBe('Updated description');
    expect(updatedClub.location).toBe('Updated City');
    expect(updatedClub.contact.email).toBe('updated@example.com');
  }, 15000);

  it('should throw error if non-admin tries to update club', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const nonAdmin = await UserModel.create({
      email: 'nonadmin@example.com',
      password: 'password123',
      username: 'nonadmin_user',
      name: 'NonAdmin User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.updateClub(club._id.toString(), nonAdmin._id.toString(), {
        name: 'UpdatedClub',
      })
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.updateClub(club._id.toString(), nonAdmin._id.toString(), {
        name: 'UpdatedClub',
      })
    ).rejects.toThrow('Only admins can update club details');
  }, 15000);

  it('should add a member by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const member = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    const updatedClub: ClubDocument = await ClubService.addMember(club._id.toString(), member._id.toString(), admin._id.toString());

    expect(updatedClub.members).toContainEqual(new Types.ObjectId(member._id));
  }, 15000);

  it('should throw error if non-admin/moderator tries to add member', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const nonAuthorized = await UserModel.create({
      email: 'nonadmin@example.com',
      password: 'password123',
      username: 'nonadmin_user',
      name: 'NonAdmin User',
      isVerified: true,
    });

    const member = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.addMember(club._id.toString(), member._id.toString(), nonAuthorized._id.toString())
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.addMember(club._id.toString(), member._id.toString(), nonAuthorized._id.toString())
    ).rejects.toThrow('Only admins or moderators can add members');
  }, 15000);

  it('should remove a member by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const member = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), member._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.removeMember(club._id.toString(), member._id.toString(), admin._id.toString());

    expect(updatedClub.members).not.toContainEqual(new Types.ObjectId(member._id));
  }, 15000);

  it('should throw error if trying to remove the last admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.removeMember(club._id.toString(), admin._id.toString(), admin._id.toString())
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.removeMember(club._id.toString(), admin._id.toString(), admin._id.toString())
    ).rejects.toThrow('Cannot remove the last admin');
  }, 15000);

  it('should add a moderator by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const member = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), member._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.addModerator(club._id.toString(), member._id.toString(), admin._id.toString());

    expect(updatedClub.moderators).toContainEqual(new Types.ObjectId(member._id));
  }, 15000);

  it('should deactivate a club by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    const deactivatedClub: ClubDocument = await ClubService.deactivateClub(club._id.toString(), admin._id.toString());

    expect(deactivatedClub.isActive).toBe(false);
  }, 15000);
});