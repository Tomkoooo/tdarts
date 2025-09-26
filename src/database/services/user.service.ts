import { UserModel } from '../models/user.model';
import { ClubModel } from '../models/club.model';
import { PlayerModel } from '../models/player.model';

export class UserService {
  static async updateUserAndPlayerName(userId: string, newName: string) {
    try {
      // Update the user document
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { name: newName },
        { new: true }
      );

      if (!updatedUser) {
        throw new Error('User not found');
      }

      // Find and update the linked player document
      const linkedPlayer = await PlayerModel.findOne({ userRef: userId });
      if (linkedPlayer) {
        await PlayerModel.findByIdAndUpdate(
          linkedPlayer._id,
          { name: newName },
          { new: true }
        );
        console.log(`Updated player name for user ${userId} to: ${newName}`);
      }

      return updatedUser;
    } catch (error) {
      console.error('Error updating user and player name:', error);
      throw error;
    }
  }

  static async searchUsers(query: string, clubId?: string) {
    if (!query || query.length < 2) return [];
    const users = await UserModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    }).limit(10);
    
    // Get club information for each user and check if they already have a player profile
    const usersWithClubInfo = await Promise.all(
      users.map(async (user) => {
        // Find which club this user belongs to (as a member)
        const club = await ClubModel.findOne({
          $or: [
            { 'members.userRef': user._id },
            { admin: user._id },
            { moderators: user._id }
          ]
        });

        // Check if user already has a player profile
        const existingPlayer = await PlayerModel.findOne({ userRef: user._id });

        // Check if user is already admin/moderator in any club
        let isAdminInAnyClub = false;
        const existingAdminClub = await ClubModel.findOne({ 
          $or: [
            { admin: user._id },
            { moderators: user._id }
          ]
        });
        isAdminInAnyClub = !!existingAdminClub;

        // Check if user is already a member of the current club
        let isCurrentClubMember = false;
        if (clubId && existingPlayer) {
          const currentClub = await ClubModel.findById(clubId);
          if (currentClub && currentClub.members.includes(existingPlayer._id)) {
            isCurrentClubMember = true;
          }
        }

        return {
          _id: user._id,
          name: user.name,
          username: user.username,
          userRef: user._id, // Add userRef for consistency
          clubId: club?._id,
          clubName: club?.name,
          hasPlayerProfile: !!existingPlayer, // Indicates if user already has a player profile
          isAdminInAnyClub: isAdminInAnyClub, // Indicates if user is already admin/moderator in any club
          isCurrentClubMember: isCurrentClubMember // Indicates if user is already a member of the current club
        };
      })
    );
    
    // Return all users (both with and without player profiles)
    return usersWithClubInfo;
  }
} 