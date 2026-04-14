import { ClubService } from '@tdarts/services';
import { ClubModel, UserModel, PlayerModel, TournamentModel, ClubShareTokenModel } from '@tdarts/core';
import { BadRequestError, AuthorizationError } from '@/middleware/errorHandle';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { Types } from 'mongoose';
import { ClubDocument } from '@/interface/club.interface';

describe('ClubService', () => {
  beforeAll(async () => {
    await connectToDatabase();
  }, 20000);

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
    await PlayerModel.deleteMany({});
    await TournamentModel.deleteMany({});
    await ClubShareTokenModel.deleteMany({});
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
    await PlayerModel.deleteMany({});
    await TournamentModel.deleteMany({});
    await ClubShareTokenModel.deleteMany({});
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
    // Members array is empty initially (uses Player IDs, admin is User ID)
    expect(club.members).toEqual([]);
    expect(club.isActive).toBe(true);
  }, 20000);

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
  }, 20000);

  it('should throw error if club name already exists', async () => {
    const user1 = await UserModel.create({
      email: 'test1@example.com',
      password: 'password123',
      username: 'test_user1',
      name: 'Test User 1',
      isVerified: true,
    });

    const user2 = await UserModel.create({
      email: 'test2@example.com',
      password: 'password123',
      username: 'test_user2',
      name: 'Test User 2',
      isVerified: true,
    });

    await ClubService.createClub(user1._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.createClub(user2._id.toString(), {
        name: 'TestClub',
        description: 'Another club',
        location: 'Another City',
      })
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.createClub(user2._id.toString(), {
        name: 'TestClub',
        description: 'Another club',
        location: 'Another City',
      })
    ).rejects.toThrow('Club name already exists');
  }, 20000);

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
  }, 20000);

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
    ).rejects.toThrow(AuthorizationError);
    await expect(
      ClubService.updateClub(club._id.toString(), nonAdmin._id.toString(), {
        name: 'UpdatedClub',
      })
    ).rejects.toThrow('Only admins can update club details');
  }, 20000);

  it('should add a member by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    // Create Player for the member
    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    // addMember expects Player ID
    const updatedClub: ClubDocument = await ClubService.addMember(
      club._id.toString(), 
      memberPlayer._id.toString(), 
      admin._id.toString()
    );

    expect(updatedClub.members).toContainEqual(new Types.ObjectId(memberPlayer._id));
  }, 20000);

  it('should add a member by moderator', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const moderatorUser = await UserModel.create({
      email: 'moderator@example.com',
      password: 'password123',
      username: 'moderator_user',
      name: 'Moderator User',
      isVerified: true,
    });

    const moderatorPlayer = await PlayerModel.create({
      name: moderatorUser.name,
      userRef: moderatorUser._id,
      isRegistered: true
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    await ClubService.addModerator(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), moderatorUser._id.toString());

    expect(updatedClub.members).toContainEqual(new Types.ObjectId(memberPlayer._id));
  }, 20000);

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

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), nonAuthorized._id.toString())
    ).rejects.toThrow(AuthorizationError);
  }, 20000);

  it('should remove a member by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.removeMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());

    expect(updatedClub.members).not.toContainEqual(new Types.ObjectId(memberPlayer._id));
  }, 20000);

  it('should remove a member by moderator', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const moderatorUser = await UserModel.create({
      email: 'moderator@example.com',
      password: 'password123',
      username: 'moderator_user',
      name: 'Moderator User',
      isVerified: true,
    });

    const moderatorPlayer = await PlayerModel.create({
      name: moderatorUser.name,
      userRef: moderatorUser._id,
      isRegistered: true
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    await ClubService.addModerator(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.removeMember(club._id.toString(), memberPlayer._id.toString(), moderatorUser._id.toString());

    expect(updatedClub.members).not.toContainEqual(new Types.ObjectId(memberPlayer._id));
  }, 20000);

  it('should allow a member to remove themselves', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.removeMember(club._id.toString(), memberPlayer._id.toString(), memberPlayer._id.toString());

    expect(updatedClub.members).not.toContainEqual(new Types.ObjectId(memberPlayer._id));
  }, 20000);

  it('should throw error if trying to remove the last admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const adminPlayer = await PlayerModel.create({
      name: admin.name,
      userRef: admin._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    // Add admin as member too (conceptually admin is member)
    await ClubService.addMember(club._id.toString(), adminPlayer._id.toString(), admin._id.toString());

    await expect(
      ClubService.removeMember(club._id.toString(), adminPlayer._id.toString(), admin._id.toString())
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.removeMember(club._id.toString(), adminPlayer._id.toString(), admin._id.toString())
    ).rejects.toThrow('Cannot remove the last admin');
  }, 20000);

  it('should add a moderator by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.addModerator(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());

    expect(updatedClub.moderators).toContainEqual(new Types.ObjectId(memberUser._id));
  }, 20000);

  it('should throw error if non-admin tries to add moderator', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
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

    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    await expect(
      ClubService.addModerator(club._id.toString(), memberPlayer._id.toString(), nonAdmin._id.toString())
    ).rejects.toThrow(AuthorizationError);
  }, 20000);

  it('should remove a moderator by admin', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    await ClubService.addModerator(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    const updatedClub: ClubDocument = await ClubService.removeModerator(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());

    expect(updatedClub.moderators).not.toContainEqual(new Types.ObjectId(memberUser._id));
  }, 20000);

  it('should throw error if non-admin tries to remove moderator', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
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

    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    await ClubService.addModerator(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    await expect(
      ClubService.removeModerator(club._id.toString(), memberPlayer._id.toString(), nonAdmin._id.toString())
    ).rejects.toThrow(AuthorizationError);
  }, 20000);

  it('should add a tournament player by admin', async () => {
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

    const updatedClub: any = await ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString());

    expect(updatedClub.tournamentPlayers).toContainEqual(expect.objectContaining({ name: 'Guest Player' }));
  }, 20000);

  it('should add a tournament player by moderator', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const moderatorUser = await UserModel.create({
      email: 'moderator@example.com',
      password: 'password123',
      username: 'moderator_user',
      name: 'Moderator User',
      isVerified: true,
    });

    const moderatorPlayer = await PlayerModel.create({
      name: moderatorUser.name,
      userRef: moderatorUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    await ClubService.addModerator(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    const updatedClub: any = await ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', moderatorUser._id.toString());

    expect(updatedClub.tournamentPlayers).toContainEqual(expect.objectContaining({ name: 'Guest Player' }));
  }, 20000);

  it('should throw error if non-admin/moderator tries to add tournament player', async () => {
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

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await expect(
      ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', nonAuthorized._id.toString())
    ).rejects.toThrow(AuthorizationError);
  }, 20000);

  it('should throw error if tournament player already exists', async () => {
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

    await ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString());
    await expect(
      ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString())
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString())
    ).rejects.toThrow('Player already added');
  }, 20000);

  it('should remove a tournament player by admin', async () => {
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

    await ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString());
    const updatedClub: any = await ClubService.removeTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString());

    expect(updatedClub.tournamentPlayers).not.toContainEqual(expect.objectContaining({ name: 'Guest Player' }));
  }, 20000);

  it('should remove a tournament player by moderator', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const moderatorUser = await UserModel.create({
      email: 'moderator@example.com',
      password: 'password123',
      username: 'moderator_user',
      name: 'Moderator User',
      isVerified: true,
    });

    const moderatorPlayer = await PlayerModel.create({
      name: moderatorUser.name,
      userRef: moderatorUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    await ClubService.addModerator(club._id.toString(), moderatorPlayer._id.toString(), admin._id.toString());
    await ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString());
    const updatedClub: any = await ClubService.removeTournamentPlayer(club._id.toString(), 'Guest Player', moderatorUser._id.toString());

    expect(updatedClub.tournamentPlayers).not.toContainEqual(expect.objectContaining({ name: 'Guest Player' }));
  }, 20000);

  it('should throw error if non-admin/moderator tries to remove tournament player', async () => {
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

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    await ClubService.addTournamentPlayer(club._id.toString(), 'Guest Player', admin._id.toString());
    await expect(
      ClubService.removeTournamentPlayer(club._id.toString(), 'Guest Player', nonAuthorized._id.toString())
    ).rejects.toThrow(AuthorizationError);
  }, 20000);

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
  }, 20000);

  it('should throw error if non-admin tries to deactivate club', async () => {
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
      ClubService.deactivateClub(club._id.toString(), nonAdmin._id.toString())
    ).rejects.toThrow(AuthorizationError);
  }, 20000);

  it('should get club details with populated members', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const memberUser = await UserModel.create({
      email: 'member@example.com',
      password: 'password123',
      username: 'member_user',
      name: 'Member User',
      isVerified: true,
    });

    const memberPlayer = await PlayerModel.create({
      name: memberUser.name,
      userRef: memberUser._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    // Add member using Player ID
    await ClubService.addMember(club._id.toString(), memberPlayer._id.toString(), admin._id.toString());
    const fetchedClub = await ClubService.getClub(club._id.toString());

    expect(fetchedClub).toBeDefined();
    expect(fetchedClub.name).toBe('TestClub');
    expect(fetchedClub.members).toContainEqual(expect.objectContaining({
      _id: memberPlayer._id.toString(),
      name: 'Member User',
      username: 'member_user',
      role: 'member'
    }));
  }, 20000);

  it('should throw error if club not found', async () => {
    await expect(
      ClubService.getClub(new Types.ObjectId().toString())
    ).rejects.toThrow(BadRequestError);
    await expect(
      ClubService.getClub(new Types.ObjectId().toString())
    ).rejects.toThrow('Club not found');
  }, 20000);

  it('should get user role in club correctly prioritizing admin > moderator > member', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      password: 'password123',
      username: 'admin_user',
      name: 'Admin User',
      isVerified: true,
    });

    const user = await UserModel.create({
      email: 'user@example.com',
      password: 'password123',
      username: 'user_user',
      name: 'User User',
      isVerified: true,
    });

    const userPlayer = await PlayerModel.create({
      name: user.name,
      userRef: user._id,
      isRegistered: true
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'TestClub',
      description: 'A test club',
      location: 'Test City',
    });

    // Test admin role
    let role = await ClubService.getUserRoleInClub(admin._id.toString(), club._id.toString());
    expect(role).toBe('admin');

    // Add user as member using Player ID
    await ClubService.addMember(club._id.toString(), userPlayer._id.toString(), admin._id.toString());
    role = await ClubService.getUserRoleInClub(user._id.toString(), club._id.toString());
    expect(role).toBe('member');

    // Add user as moderator
    await ClubService.addModerator(club._id.toString(), userPlayer._id.toString(), admin._id.toString());
    role = await ClubService.getUserRoleInClub(user._id.toString(), club._id.toString());
    expect(role).toBe('moderator');

    // Add user as admin (should prioritize admin role)
    await ClubModel.findByIdAndUpdate(club._id, { $push: { admin: user._id } });
    role = await ClubService.getUserRoleInClub(user._id.toString(), club._id.toString());
    expect(role).toBe('admin');

    // Test non-member
    const nonMember = await UserModel.create({
      email: 'nonmember@example.com',
      password: 'password123',
      username: 'nonmember_user',
      name: 'NonMember User',
      isVerified: true,
    });
    role = await ClubService.getUserRoleInClub(nonMember._id.toString(), club._id.toString());
    expect(role).toBe('none');
  }, 30000);

  it('keeps global admin access even when user is only a regular member in club', async () => {
    const clubAdmin = await UserModel.create({
      email: 'clubadmin@example.com',
      password: 'password123',
      username: 'club_admin',
      name: 'Club Admin',
      isVerified: true,
      isAdmin: false,
    });

    const superAdmin = await UserModel.create({
      email: 'superadmin@example.com',
      password: 'password123',
      username: 'super_admin',
      name: 'Super Admin',
      isVerified: true,
      isAdmin: true,
    });

    const superAdminPlayer = await PlayerModel.create({
      name: superAdmin.name,
      userRef: superAdmin._id,
      isRegistered: true,
    });

    const club: ClubDocument = await ClubService.createClub(clubAdmin._id.toString(), {
      name: 'SuperAdminClub',
      description: 'Role precedence test club',
      location: 'Test City',
    });

    await ClubService.addMember(club._id.toString(), superAdminPlayer._id.toString(), clubAdmin._id.toString());

    const role = await ClubService.getUserRoleInClub(superAdmin._id.toString(), club._id.toString());
    expect(role).toBe('admin');
  }, 30000);

  it('should search users by name or username', async () => {
    await UserModel.insertMany([
      {
        email: 'user1@example.com',
        password: 'password123',
        username: 'user_one',
        name: 'User One',
        isVerified: true,
      },
      {
        email: 'user2@example.com',
        password: 'password123',
        username: 'user_two',
        name: 'User Two',
        isVerified: true,
      },
    ]);

    const results = await ClubService.searchUsers('user');
    expect(results).toHaveLength(2);
    expect(results).toContainEqual({
      _id: expect.any(String),
      name: 'User One',
      username: 'user_one',
    });
    expect(results).toContainEqual({
      _id: expect.any(String),
      name: 'User Two',
      username: 'user_two',
    });
  }, 30000);

  it('projects role-only admin into members list using player by userRef', async () => {
    const adminUser = await UserModel.create({
      email: 'admin-only@example.com',
      password: 'password123',
      username: 'admin_only',
      name: 'Admin Only',
      isVerified: true,
    });
    const modUser = await UserModel.create({
      email: 'mod-member@example.com',
      password: 'password123',
      username: 'mod_member',
      name: 'Mod Member',
      isVerified: true,
    });

    const adminPlayer = await PlayerModel.create({
      name: adminUser.name,
      userRef: adminUser._id,
      isRegistered: true,
      stats: { last10ClosedAvg: 61.23 },
      honors: [{ title: 'Captain', year: 2025, type: 'special' }],
    });
    const modPlayer = await PlayerModel.create({
      name: modUser.name,
      userRef: modUser._id,
      isRegistered: true,
    });

    const club = await ClubModel.create({
      name: 'Projection Club',
      description: 'Projection test',
      location: 'Budapest',
      members: [modPlayer._id], // admin player intentionally missing from members
      admin: [adminUser._id],
      moderators: [modUser._id],
      isActive: true,
    });

    const projected = await ClubService.getClubMembersForManagement(club._id.toString(), 'test-role-projection');

    expect(projected.members).toHaveLength(2);
    expect(projected.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: modPlayer._id.toString(),
          userRef: modUser._id.toString(),
          username: 'mod_member',
          role: 'moderator',
        }),
        expect.objectContaining({
          _id: adminPlayer._id.toString(),
          userRef: adminUser._id.toString(),
          username: 'admin_only',
          role: 'admin',
        }),
      ])
    );
  }, 30000);

  it('ignores malformed role user refs when fetching club', async () => {
    const user = await UserModel.create({
      email: 'clean-user@example.com',
      password: 'password123',
      username: 'clean_user',
      name: 'Clean User',
      isVerified: true,
    });

    const player = await PlayerModel.create({
      name: user.name,
      userRef: user._id,
      isRegistered: true,
    });

    const club = await ClubModel.create({
      name: 'Malformed Role Club',
      description: 'Regression test',
      location: 'Budapest',
      members: [player._id],
      admin: [user._id],
      moderators: [],
      isActive: true,
    });

    await ClubModel.collection.updateOne({ _id: club._id }, { $push: { admin: 'undefined' as any } });

    const fetched = await ClubService.getClub(club._id.toString());
    expect(fetched).toBeDefined();
    expect(Array.isArray(fetched.members)).toBe(true);
    expect(fetched.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ userRef: user._id })])
    );
  }, 30000);

  it('creates and resolves selected tournament share token', async () => {
    const admin = await UserModel.create({
      email: 'share-admin@example.com',
      password: 'password123',
      username: 'share_admin',
      name: 'Share Admin',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'Share Club',
      description: 'Share token club',
      location: 'Budapest',
    });

    await TournamentModel.create({
      clubId: club._id,
      tournamentId: 'tour_a',
      tournamentSettings: {
        name: 'Tournament A',
        startDate: new Date(),
        status: 'pending',
        maxPlayers: 16,
        format: 'group',
        startingScore: 501,
        tournamentPassword: 'test-pass',
      },
      tournamentPlayers: [],
      isDeleted: false,
      isSandbox: false,
    });

    const token = await ClubService.createSelectedTournamentsShareToken(club._id.toString(), ['tour_a']);
    expect(token).toEqual(expect.any(String));
    expect(token.length).toBeGreaterThanOrEqual(8);

    const resolved = await ClubService.resolveSelectedTournamentsShareToken(token);
    expect(resolved).toEqual({
      clubId: club._id.toString(),
      tournamentIds: ['tour_a'],
    });
  }, 30000);

  it('rejects selected tournament token creation when tournaments are invalid', async () => {
    const admin = await UserModel.create({
      email: 'share-admin-2@example.com',
      password: 'password123',
      username: 'share_admin_2',
      name: 'Share Admin 2',
      isVerified: true,
    });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'Share Club 2',
      description: 'Share token validation',
      location: 'Budapest',
    });

    await expect(
      ClubService.createSelectedTournamentsShareToken(club._id.toString(), ['missing_tournament'])
    ).rejects.toThrow(BadRequestError);
  }, 30000);

  it('adds club competition avg band to club summary tournaments', async () => {
    const admin = await UserModel.create({
      email: 'club-band-admin@example.com',
      password: 'password123',
      username: 'club_band_admin',
      name: 'Club Band Admin',
      isVerified: true,
    });

    const playerA = await PlayerModel.create({ name: 'Player A', isRegistered: false });
    const playerB = await PlayerModel.create({ name: 'Player B', isRegistered: false });
    const playerC = await PlayerModel.create({ name: 'Player C', isRegistered: false });

    const club: ClubDocument = await ClubService.createClub(admin._id.toString(), {
      name: 'Club Band',
      description: 'Competition band test',
      location: 'Budapest',
    });

    await TournamentModel.create({
      clubId: club._id,
      tournamentId: 'band_1',
      tournamentSettings: {
        name: 'Band One',
        startDate: new Date('2026-01-01T10:00:00.000Z'),
        status: 'finished',
        maxPlayers: 16,
        format: 'group',
        startingScore: 501,
        tournamentPassword: 'test-pass',
      },
      tournamentPlayers: [
        { playerReference: playerA._id, status: 'winner', stats: { avg: 40, oneEightiesCount: 2 } },
        { playerReference: playerB._id, status: 'eliminated', stats: { avg: 50, oneEightiesCount: 1 } },
      ],
      isDeleted: false,
      isArchived: false,
      isSandbox: false,
    });

    await TournamentModel.create({
      clubId: club._id,
      tournamentId: 'band_2',
      tournamentSettings: {
        name: 'Band Two',
        startDate: new Date('2026-01-02T10:00:00.000Z'),
        status: 'finished',
        maxPlayers: 16,
        format: 'group',
        startingScore: 501,
        tournamentPassword: 'test-pass',
      },
      tournamentPlayers: [
        { playerReference: playerB._id, status: 'winner', stats: { avg: 60, oneEightiesCount: 3 } },
        { playerReference: playerC._id, status: 'eliminated', stats: { avg: 70, oneEightiesCount: 0 } },
      ],
      isDeleted: false,
      isArchived: false,
      isSandbox: false,
    });

    const summary = await ClubService.getClubSummary(club._id.toString());
    expect(Array.isArray(summary.tournaments)).toBe(true);
    expect(summary.tournaments.length).toBe(2);

    for (const tournament of summary.tournaments) {
      expect(tournament.clubCompetitionAvgBand).toEqual({
        minAvg: 45,
        maxAvg: 65,
        sampleSize: 2,
      });
      expect(tournament.clubOneEightiesStats).toEqual({
        avgPerTournament: 3,
        total: 6,
        sampleSize: 2,
      });
    }
  }, 30000);
});
