
import { PlayerModel } from '../models/player.model'; 
import { UserModel } from '../models/user.model';
import { ClubModel } from '../models/club.model';

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
        
        // If player has userRef, find which club this user belongs to
        if (player.userRef) {
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
  ): Promise<import('@/interface/player.interface').PlayerDocument | null> {
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

  static async findPlayerById(playerId: string): Promise<import('@/interface/player.interface').PlayerDocument | null> {
    let player = await PlayerModel.findById(playerId).populate('members');
    if (!player) {
      player = await PlayerModel.findOne({ userRef: playerId }).populate('members');
    }
    return player;
  }

  static async findTeamsForPlayer(playerId: string): Promise<import('@/interface/player.interface').PlayerDocument[]> {
    // Find players of type 'pair' or 'team' where this player is a member
    return await PlayerModel.find({
      type: { $in: ['pair', 'team'] },
      members: playerId
    }).populate('members');
  }


  static async findOrCreateTeam(name: string, m1: string, m2: string) {
    // Check if team with same name and same members exists
    // (Order of members shouldn't matter for existence check, but exact name match is good enough for now or complex query)
    // Actually, usually team name is unique per tournament or globally?
    // Let's assume team name + members combo.
    
    // Sort members to ensure consistency
    const members = [m1, m2].sort();

    const existingTeam = await PlayerModel.findOne({
      type: 'pair',
      name: name,
      members: { $all: members, $size: 2 }
    });

    if (existingTeam) return existingTeam;

    const newTeam = new PlayerModel({
      name: name,
      type: 'pair',
      members: members,
      isRegistered: false // Teams are virtual players
    });

    await newTeam.save();
    return newTeam;
  }
} 