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

    // Check if user exists
    const user = await UserModel.findById(creatorId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Check if user is already in a club (as member, admin, or moderator)
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

    // Check if club name is unique
    const existingClubName = await ClubModel.findOne({ name: clubData.name });
    if (existingClubName) {
      throw new BadRequestError('Club name already exists');
    }

    // Create new club with creator as admin
    const club = new ClubModel({
      ...clubData,
      admin: [creatorId],
      members: [creatorId],
      moderators: [],
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

    // Check if user is admin
    if (!club.admin.includes(new Types.ObjectId(userId))) {
      throw new BadRequestError('Only admins can update club details');
    }

    // Check if new name is unique (if provided)
    if (updates.name && updates.name !== club.name) {
      const existingClub = await ClubModel.findOne({
        name: updates.name,
        _id: { $ne: club._id }, // Use club._id directly
      });
      if (existingClub) {
        throw new BadRequestError('Club name already exists');
      }
    }

    // Apply updates
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

    // Check if requester is admin or moderator
    const isAuthorized = club.admin.includes(new Types.ObjectId(requesterId)) || 
                        club.moderators.includes(new Types.ObjectId(requesterId));
    if (!isAuthorized) {
      throw new BadRequestError('Only admins or moderators can add members');
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Check if user is already in a club
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

    // Add user to members
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

    // Check if requester is admin or moderator
    const isAuthorized = club.admin.includes(new Types.ObjectId(requesterId)) || 
                        club.moderators.includes(new Types.ObjectId(requesterId));
    if (!isAuthorized) {
      throw new BadRequestError('Only admins or moderators can remove members');
    }

    // Prevent removing the last admin
    if (club.admin.includes(new Types.ObjectId(userId)) && club.admin.length === 1) {
      throw new BadRequestError('Cannot remove the last admin');
    }

    // Remove user from members, moderators, and admin arrays
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

    // Check if requester is admin
    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can add moderators');
    }

    // Check if user exists and is a member
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }
    if (!club.members.includes(new Types.ObjectId(userId))) {
      throw new BadRequestError('User must be a member to become a moderator');
    }

    // Add user to moderators
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

    // Check if requester is admin
    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can remove moderators');
    }

    // Remove user from moderators
    club.moderators = club.moderators.filter((id: Types.ObjectId) => !id.equals(userId));
    await club.save();
    return club;
  }

  static async deactivateClub(clubId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    // Check if requester is admin
    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can deactivate clubs');
    }

    club.isActive = false;
    await club.save();
    return club;
  }

  static async getClub(clubId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    return club;
  }

  static async getUserClubs(userId: string): Promise<ClubDocument[]> {
    await connectMongo();

    const clubs = await ClubModel.find({
      $or: [
        { members: userId },
        { admin: userId },
        { moderators: userId },
      ],
    });

    return clubs;
  }
}