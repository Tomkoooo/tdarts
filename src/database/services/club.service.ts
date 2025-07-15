import { Types } from 'mongoose';
import { ClubDocument, Club } from '@/interface/club.interface';
import { BadRequestError } from '@/middleware/errorHandle';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { UserModel } from '@/database/models/user.model';

export class ClubService {
  static async createClub(
    creatorId: string,
    clubData: {
      name: string;
      description: string;
      location: string;
      contact?: {
        email?: string;
        phone?: string;
        website?: string;
      };
    }
  ): Promise<ClubDocument> {
    await connectMongo();

    const user = await UserModel.findById(creatorId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const existingClub = await ClubModel.findOne({
      $or: [
        { members: creatorId },
        { admin: creatorId },
        { moderators: creatorId },
      ],
    });
    if (existingClub) {
      throw new BadRequestError('User is already associated with a club');
    }

    const existingClubName = await ClubModel.findOne({ name: clubData.name });
    if (existingClubName) {
      throw new BadRequestError('Club name already exists');
    }

    const club = new ClubModel({
      ...clubData,
      admin: [creatorId],
      members: [creatorId],
      moderators: [],
      tournamentPlayers: [],
      isActive: true,
    });

    await club.save();
    return club;
  }

  static async updateClub(
    clubId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      location?: string;
      contact?: {
        email?: string;
        phone?: string;
        website?: string;
      };
    }
  ): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    console.log(userId)

    if (!club.admin.includes(new Types.ObjectId(userId))) {
      throw new BadRequestError('Only admins can update club details');
    }

    if (updates.name && updates.name !== club.name) {
      const existingClub = await ClubModel.findOne({
        name: updates.name,
        _id: { $ne: club._id },
      });
      if (existingClub) {
        throw new BadRequestError('Club name already exists');
      }
    }

    if (updates.name) club.name = updates.name;
    if (updates.description) club.description = updates.description;
    if (updates.location) club.location = updates.location;
    if (updates.contact) club.contact = { ...club.contact, ...updates.contact };

    await club.save();
    return club;
  }

  static async addMember(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = club.admin.includes(new Types.ObjectId(requesterId)) || 
                        club.moderators.includes(new Types.ObjectId(requesterId));
    if (!isAuthorized) {
      throw new BadRequestError('Only admins or moderators can add members');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const existingClub = await ClubModel.findOne({
      $or: [
        { members: userId },
        { admin: userId },
        { moderators: userId },
      ],
    });
    if (existingClub) {
      throw new BadRequestError('User is already associated with a club');
    }

    if (!club.members.includes(new Types.ObjectId(userId))) {
      club.members.push(new Types.ObjectId(userId));
      await club.save();
    }

    return club;
  }

  static async removeMember(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = club.admin.includes(new Types.ObjectId(requesterId)) || 
                        club.moderators.includes(new Types.ObjectId(requesterId)) ||
                        userId === requesterId;
    if (!isAuthorized) {
      throw new BadRequestError('Only admins, moderators, or the user themselves can remove members');
    }

    if (club.admin.includes(new Types.ObjectId(userId)) && club.admin.length === 1) {
      throw new BadRequestError('Cannot remove the last admin');
    }

    club.members = club.members.filter((id: Types.ObjectId) => !id.equals(userId));
    club.moderators = club.moderators.filter((id: Types.ObjectId) => !id.equals(userId));
    club.admin = club.admin.filter((id: Types.ObjectId) => !id.equals(userId));

    await club.save();
    return club;
  }

  static async addModerator(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can add moderators');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }
    if (!club.members.includes(new Types.ObjectId(userId))) {
      throw new BadRequestError('User must be a member to become a moderator');
    }

    if (!club.moderators.includes(new Types.ObjectId(userId))) {
      club.moderators.push(new Types.ObjectId(userId));
      await club.save();
    }

    return club;
  }

  static async removeModerator(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can remove moderators');
    }

    club.moderators = club.moderators.filter((id: Types.ObjectId) => !id.equals(userId));
    await club.save();
    return club;
  }

  static async addTournamentPlayer(clubId: string, playerName: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = club.admin.includes(new Types.ObjectId(requesterId)) || 
                        club.moderators.includes(new Types.ObjectId(requesterId));
    if (!isAuthorized) {
      throw new BadRequestError('Only admins or moderators can add tournament players');
    }

    if (club.tournamentPlayers.some((p: any) => p.name.toLowerCase() === playerName.toLowerCase())) {
      throw new BadRequestError('Player already added');
    }

    club.tournamentPlayers.push({ name: playerName });
    await club.save();
    return club;
  }

  static async removeTournamentPlayer(clubId: string, playerName: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = club.admin.includes(new Types.ObjectId(requesterId)) || 
                        club.moderators.includes(new Types.ObjectId(requesterId));
    if (!isAuthorized) {
      throw new BadRequestError('Only admins or moderators can remove tournament players');
    }

    club.tournamentPlayers = club.tournamentPlayers.filter((p: any) => p.name.toLowerCase() !== playerName.toLowerCase());
    await club.save();
    return club;
  }

  static async deactivateClub(clubId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can deactivate clubs');
    }

    club.isActive = false;
    await club.save();
    return club;
  }

  static async getClub(clubId: string): Promise<Club> {
    await connectMongo();

    const club = await ClubModel.findById(clubId).populate('members admin moderators', 'name username');
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const populatedClub: Club = {
      ...club.toJSON(),
      members: club.members.map((user: any) => ({
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
      })),
      tournamentPlayers: club.tournamentPlayers,
    };

    return populatedClub;
  }

  static async getUserClubs(userId: string): Promise<{ clubs: ClubDocument[], userRoleInClub: string }> {
    await connectMongo();

    const clubs = await ClubModel.find({
      $or: [
        { members: userId },
        { admin: userId },
        { moderators: userId },
      ],
    });

    const club = clubs[0];
    const userObjectId = new Types.ObjectId(userId);
    const userRoleInClub = club.admin.includes(userObjectId) ? 'admin' :
                           club.moderators.includes(userObjectId) ? 'moderator' :
                           club.members.includes(userObjectId) ? 'member' : 'none';

    return { clubs, userRoleInClub };
  }

  static async getUserRoleInClub(userId: string, clubId: string): Promise<string> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    if (club.admin.includes(userObjectId)) {
      return 'admin';
    } else if (club.moderators.includes(userObjectId)) {
      return 'moderator';
    } else if (club.members.includes(userObjectId)) {
      return 'member';
    } else {
      return 'none';
    }
  }

  static async searchUsers(query: string): Promise<{ _id: string; name: string; username: string }[]> {
    await connectMongo();

    const users = await UserModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    }).limit(10);

    return users.map(user => ({
      _id: user._id.toString(),
      name: user.name,
      username: user.username,
    }));
  }
}