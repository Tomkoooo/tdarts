import { PlayerModel } from '@tdarts/core';
import { UserModel } from '@tdarts/core';
import { ClubModel } from '@tdarts/core';
import { BadRequestError } from '@tdarts/core';
import { connectMongo } from '@tdarts/core';
import { Types } from 'mongoose';
import { AuthorizationService } from './authorization.service';
import { MediaService } from './media.service';

export class PlayerService {
  static async updatePlayerNameByUserRef(userRef: string, newName: string) {
    try {
      // Find the player document linked to this user
      const player = await PlayerModel.findOne({ userRef });
      
      if (!player) {
        console.log(`No player found for userRef: ${userRef}`);
        return null;
      }

      // Update the player's name
      const updatedPlayer = await PlayerModel.findByIdAndUpdate(
        player._id,
        { name: newName },
        { new: true }
      );

      console.log(`Updated player name for userRef ${userRef} to: ${newName}`);
      return updatedPlayer;
    } catch (error) {
      console.error('Error updating player name by userRef:', error);
      throw error;
    }
  }

  static async searchPlayers(query: string, clubId?: string) {
    if (!query || query.length < 2) return [];
    console.log(clubId);
    // Search for all players in the player collection (both registered and guest)
    const players = await PlayerModel.find({ 
      name: { $regex: query, $options: 'i' }
    }).limit(10);
    
    // Get club information for each player
    const playersWithClubInfo = await Promise.all(
      players.map(async (player) => {
        let clubId = null;
        let clubName = null;
        let username: string | null = null;
        let profilePicture: string | null = null;
        
        // If player has userRef, find which club this user belongs to
        if (player.userRef) {
          const linkedUser = await UserModel.findById(player.userRef).select('username profilePicture');
          username = linkedUser?.username || null;
          profilePicture = linkedUser?.profilePicture || null;

          const club = await ClubModel.findOne({
            $or: [
              { 'members.userRef': player.userRef },
              { admin: player.userRef },
              { moderators: player.userRef }
            ]
          });
          
          if (club) {
            clubId = club._id;
            clubName = club.name;
          }
        }
        
        // Check if player is already admin/moderator in any club
        let isAdminInAnyClub = false;
        if (player.userRef) {
          const existingAdminClub = await ClubModel.findOne({ 
            $or: [
              { admin: player.userRef },
              { moderators: player.userRef }
            ]
          });
          isAdminInAnyClub = !!existingAdminClub;
        }

        // Check if player is already a member of the current club
        let isCurrentClubMember = false;
        if (clubId) {
          const currentClub = await ClubModel.findById(clubId);
          if (currentClub && currentClub.members.includes(player._id)) {
            isCurrentClubMember = true;
          }
        }

        return {
          ...player.toObject(),
          username,
          profilePicture,
          clubId,
          clubName,
          isAdminInAnyClub,
          isCurrentClubMember
        };
      })
    );
    
    return playersWithClubInfo;
  }

  static async createPlayer(data: { userRef?: string; name: string }) {
    // Ha userRef van, nézzük van-e már ilyen player
    if (data.userRef) {
      let player = await PlayerModel.findOne({ userRef: data.userRef });
      if (player) return player;
      player = new PlayerModel({ 
        userRef: data.userRef, 
        name: data.name,
        isRegistered: true 
      });
      await player.save();
      return player;
    }
    // Guest player: név alapján duplikációt elkerülni
    let player = await PlayerModel.findOne({ name: data.name, userRef: { $exists: false } });
    if (player) return player;
    player = new PlayerModel({ 
      name: data.name,
      isRegistered: false 
    });
    await player.save();
    return player;
  }

  /**
   * Keres vagy létrehoz egy játékost név alapján (csak guest/név alapú játékosokhoz)
   */
  static async findOrCreatePlayerByName(name: string) {
    let player = await PlayerModel.findOne({ name, userRef: { $exists: false } });
    if (player) return player;
    player = new PlayerModel({ 
      name,
      isRegistered: false 
    });
    await player.save();
    return player;
  }

  /**
   * Keres vagy létrehoz egy játékost userRef alapján
   */
  static async findOrCreatePlayerByUserRef(userRef: string, name: string) {
    let player = await PlayerModel.findOne({ userRef });
    if (player) return player;
    player = new PlayerModel({ 
      userRef, 
      name,
      isRegistered: true 
    });
    await player.save();
    return player;
  }

  static async findPlayerByUserId(
    userId: string
  ): Promise<import('@tdarts/core').PlayerDocument | null> {
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    // Try to match both as string and as ObjectId
    let player = await PlayerModel.findOne({ userRef: userId });
    if (!player) {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }
      player = await PlayerModel.create({ 
        userRef: userId, 
        name: user.name,
        isRegistered: true 
      });
    }
    return player || null;
  }

  static async findPlayerById(playerId: string): Promise<import('@tdarts/core').PlayerDocument | null> {
    let player = await PlayerModel.findById(playerId).populate('members');
    if (!player) {
      player = await PlayerModel.findOne({ userRef: playerId }).populate('members');
    }
    return player;
  }

  static async findTeamsForPlayer(playerId: string): Promise<import('@tdarts/core').PlayerDocument[]> {
    // Find players of type 'pair' or 'team' where this player is a member
    return await PlayerModel.find({
      type: { $in: ['pair', 'team'] },
      members: playerId
    }).populate('members');
  }


  static async findOrCreateTeam(name: string, m1: string, m2: string) {
    // Sort members to ensure consistency
    const sortedMembers = [m1, m2].sort();

    // 1. Check if a pair with these exact members already exists
    const existingTeam = await PlayerModel.findOne({
      type: 'pair',
      members: { $all: sortedMembers, $size: 2 }
    });

    if (existingTeam) {
      // If the team exists but has a different name, update it to the new name
      // This ensures that the pair's identity (MMR, stats) is preserved 
      // even if they choose a new name for a new tournament.
      if (existingTeam.name !== name) {
        console.log(`Updating team name from "${existingTeam.name}" to "${name}" for members: ${sortedMembers.join(', ')}`);
        existingTeam.name = name;
        await existingTeam.save();
      }
      return existingTeam;
    }

    // 2. If no such pair exists, create a new one
    const newTeam = new PlayerModel({
      name: name,
      type: 'pair',
      members: sortedMembers,
      isRegistered: false // Teams are virtual players
    });

    await newTeam.save();
    return newTeam;
  }

  /**
   * Upload avatar image for a player document (linked user or global admin only).
   */
  static async uploadPlayerAvatarFromBuffer(
    requestingUserId: string,
    playerId: string,
    file: Buffer,
    mimeType: string,
    filename: string,
    size: number,
  ): Promise<{ url: string; mediaId: string }> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(mimeType)) {
      throw new BadRequestError('Unsupported image type', 'player', {
        mimeType,
        errorCode: 'MEDIA_UNSUPPORTED_TYPE',
        expected: true,
        operation: 'player.uploadPlayerAvatarFromBuffer',
      });
    }
    const maxBytes = 5 * 1024 * 1024;
    if (size <= 0 || size > maxBytes) {
      throw new BadRequestError('Invalid file size', 'player', {
        errorCode: 'MEDIA_INVALID_SIZE',
        expected: true,
        operation: 'player.uploadPlayerAvatarFromBuffer',
      });
    }

    await connectMongo();
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestError('Invalid player id', 'player', {
        errorCode: 'PLAYER_INVALID_ID',
        expected: true,
        operation: 'player.uploadPlayerAvatarFromBuffer',
      });
    }

    const player = await PlayerModel.findById(playerId);
    if (!player) {
      throw new BadRequestError('Player not found', 'player', {
        errorCode: 'PLAYER_NOT_FOUND',
        expected: true,
        operation: 'player.uploadPlayerAvatarFromBuffer',
      });
    }

    const isAdmin = await AuthorizationService.isGlobalAdmin(requestingUserId);
    const ownerId = player.userRef ? String(player.userRef) : null;
    const isOwner = ownerId === requestingUserId;
    if (!isOwner && !isAdmin) {
      throw new BadRequestError('Forbidden', 'player', {
        errorCode: 'PLAYER_AVATAR_FORBIDDEN',
        expected: true,
        operation: 'player.uploadPlayerAvatarFromBuffer',
      });
    }

    const oldUrl = player.profilePicture;
    if (oldUrl && oldUrl.startsWith('/api/media/')) {
      const oldId = oldUrl.split('/').pop();
      if (oldId) {
        try {
          await MediaService.deleteMedia(oldId);
        } catch {
          /* best-effort cleanup */
        }
      }
    }

    const media = await MediaService.createMedia(requestingUserId, file, mimeType, filename || 'upload', size);
    const mediaId = String(media._id);
    const publicBase = (process.env.API_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '')
      .trim()
      .replace(/\/$/, '');
    const path = `/api/media/${mediaId}`;
    const url = publicBase ? `${publicBase}${path}` : path;

    player.profilePicture = url;
    await player.save();

    if (ownerId) {
      const user = await UserModel.findById(ownerId);
      if (user) {
        user.profilePicture = url;
        await user.save();
      }
    }

    return { url, mediaId };
  }
}
