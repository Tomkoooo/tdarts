import { Types } from 'mongoose';
import { ClubDocument } from '@/interface/club.interface';
import { BadRequestError } from '@/middleware/errorHandle';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';
import { BoardModel } from '@/database/models/board.model';
import { TournamentModel } from '@/database/models/tournament.model';

//TODO a klubba és a tornákra ezentúl nem a user collectionből vesszük fel az emberekt.
//Hanem egy köztes kapcsoló Player collectionbe rakjuk és hogyha regisztrált akkor kap egy userRefet
//Viszont így is úgy is felvesszük a nevét, és a statisztikák minden esetben itt lesznek tárolva
//Frontendről  elsz egy kereső ami innen és a user collectionből keres embereket és ha tornához 
//vagy klubbhoz rendeljük őket akkor igazából a player collectionbe kerülnek fevételre és a klubbon is oda fog tartozni a referencia kivéve az admin és modoknál.

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
      boardCount: number;
      players?: any[]; // Player objects (optional)
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

    // Player collectionből referált tagok (ha vannak)
    const memberIds: Types.ObjectId[] = [];
    if (clubData.players && clubData.players.length > 0) {
      for (const player of clubData.players) {
        let playerDoc = await PlayerModel.findOne({ name: player.name });
        if (!playerDoc) {
          playerDoc = await PlayerModel.create({ name: player.name });
        }
        memberIds.push(playerDoc._id);
      }
    }

    const club = new ClubModel({
      ...clubData,
      admin: [creatorId], // csak admin, NEM member
      members: memberIds,
      moderators: [],
      isActive: true,
    });

    await club.save();

    const boards: string[] = [];
    for (let i = 1; i < clubData.boardCount + 1; i++) {
      const board = new BoardModel({
        clubId: club._id,
        boardNumber: i,
      });
      boards.push(board._id);
    }
    await ClubModel.updateOne({ _id: club._id }, { boards: boards });

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

    if (!club.admin.includes(userId)) {
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
    //TODO: update the boards from the club.
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
    // Check if userId is a player or a user
    let player = await PlayerModel.findById(userId);
    if (!player) {
      // Try to find user in User collection
      const user = await UserModel.findById(userId);
      if (user) {
        // Create player with userRef
        player = await PlayerModel.create({ name: user.name, userRef: user._id });
      } else {
        throw new BadRequestError('Player or user not found');
      }
    }
    if (!club.members.includes(player._id)) {
      club.members.push(player._id);
      await club.save();
    }
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
    // the id from the requst refers to the player collection and in the plaer collection we refer to th. user if it registe
    const player = await PlayerModel.findById(userId);
    if (!player || !player.userRef) throw new BadRequestError('Player not found');
    const user = await UserModel.findById(player.userRef);
    if (!user) throw new BadRequestError('User not found');
    if (!player) throw new BadRequestError('User must be a member (player with userRef) to become a moderator');
    if (!club.members.includes(player._id)) {
      club.members.push(player._id);
    }
    if (!club.moderators.includes(user._id)) {
      club.moderators.push(user._id);
    }
    await club.save();
    return club;
  }

  static async addAdmin(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }
    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can add admins');
    }
    // Only allow if userId is a registered user and has a player entry with userRef
    const user = await UserModel.findById(userId);
    if (!user) throw new BadRequestError('User not found');
    const player = await PlayerModel.findOne({ userRef: user._id });
    if (!player) throw new BadRequestError('User must be a member (player with userRef) to become an admin');
    if (!club.members.includes(player._id)) {
      club.members.push(player._id);
    }
    if (!club.admin.includes(user._id)) {
      club.admin.push(user._id);
    }
    await club.save();
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

  static async removeModerator(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const playerUserRef = await PlayerModel.findOne({ _id: userId }).select('userRef');

    if (!club.admin.includes(new Types.ObjectId(requesterId))) {
      throw new BadRequestError('Only admins can remove moderators');
    }

    club.moderators = club.moderators.filter((_id: Types.ObjectId) => !_id.equals(playerUserRef.userRef));
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

  static async getClub(clubId: string): Promise<any> {
    await connectMongo();

    const club = await ClubModel.findById(clubId)
      .populate('members', 'name userRef')
      .populate('admin', 'name username')
      .populate('moderators', 'name username');
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    // Lekérjük a klubhoz tartozó tornákat külön
    const tournaments = await TournamentModel.find({ clubId: club._id })
      .select('_id tournamentId tournamentSettings.name code tournamentSettings.status tournamentSettings.startDate tournamentSettings.description')
      .lean();

    // Válasz: minden szereplőhöz role mező
    // For members, always include name, userRef, and username ("vendég" if not registered)
    const membersWithUsernames = await Promise.all(club.members.map(async (player: any) => {
      let username = 'vendég';
      if (player.userRef) {
        const user = await UserModel.findById(player.userRef).select('username');
        if (user && user.username) username = user.username;
      }

      // Convert all admin and moderator IDs to string for comparison
      const adminIds = club.admin.map((player: any) => player._id.toString());
      const moderatorIds = club.moderators.map((player: any) => player._id.toString());
      const userRefStr = player.userRef ? player.userRef.toString() : undefined;

      const isAdmin = userRefStr ? adminIds.includes(userRefStr) : false;
      const isModerator = userRefStr ? moderatorIds.includes(userRefStr) : false;
      const playerRole = isAdmin ? 'admin' : isModerator ? 'moderator' : 'member';

      return {
        _id: player._id.toString(),
        name: player.name,
        userRef: player.userRef,
        username,
        role: playerRole,
      };
    }));
    const result = {
      ...club.toJSON(),
      admin: club.admin.map((user: any) => ({
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: 'admin',
      })),
      moderators: club.moderators.map((user: any) => ({
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: 'moderator',
      })),
      members: membersWithUsernames,
      tournaments: tournaments.map((t: any) => ({
        _id: t._id.toString(),
        name: t.tournamentSettings?.name || t.name,
        tournamentId: t.tournamentId,
        status: t.tournamentSettings?.status,
        startDate: t.tournamentSettings?.startDate, // vagy startTime, ha úgy van
        description: t.tournamentSettings?.description,
      })),
    };
    return result;
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
    if (clubs.length === 0) {
      return { clubs: [], userRoleInClub: 'none' };
    }
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

  // --- BOARD MANAGEMENT ---
  static async addBoard(clubId: string, userId: string, boardData: { name?: string; description?: string }): Promise<ClubDocument> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) throw new BadRequestError('Club not found');
    if (!club.admin.includes(new Types.ObjectId(userId))) throw new BadRequestError('Only admins can add boards');
    // Determine next board number
    const nextBoardNumber = (club.boards?.length || 0) + 1;
    club.boards.push({
      boardNumber: nextBoardNumber,
      name: boardData.name,
      isActive: true,
    });
    await club.save();
    return club;
  }

  static async getBoard(clubId: string, boardNumber: number): Promise<any> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) throw new BadRequestError('Club not found');
    const board = club.boards.find((b: any) => b.boardNumber === boardNumber);
    if (!board) throw new BadRequestError('Board not found');
    return board;
    
  }

  static async updateBoard(clubId: string, userId: string, boardNumber: number, updates: { name?: string; description?: string }): Promise<ClubDocument> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) throw new BadRequestError('Club not found');
    if (!club.admin.includes(new Types.ObjectId(userId))) throw new BadRequestError('Only admins can update boards');
    // Update in Board collection
    await BoardModel.findOneAndUpdate({ clubId, boardNumber }, updates);
    // Update in club.boards array
    const board = club.boards.find((b: any) => b.boardNumber === boardNumber);
    if (board) {
      if (updates.name !== undefined) board.name = updates.name;
      if (updates.description !== undefined) board.description = updates.description;
    }
    await club.save();
    return club;
  }

  static async removeBoard(clubId: string, userId: string, boardNumber: number): Promise<ClubDocument> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) throw new BadRequestError('Club not found');
    if (!club.admin.includes(new Types.ObjectId(userId))) throw new BadRequestError('Only admins can remove boards');
    // Remove from Board collection
    await BoardModel.findOneAndDelete({ clubId, boardNumber });
    // Remove from club.boards array
    club.boards = club.boards.filter((b: any) => b.boardNumber !== boardNumber);
    await club.save();
    return club;
  }
}