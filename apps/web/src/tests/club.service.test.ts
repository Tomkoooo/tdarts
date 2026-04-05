import { ClubService } from '@/database/services/club.service';
import { ClubModel } from '@/database/models/club.model';
import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';
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
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
    await PlayerModel.deleteMany({});
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
});