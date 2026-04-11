import { Types } from 'mongoose';
import { ClubDocument, BillingInfo } from '@tdarts/core';
import { BadRequestError, AuthorizationError } from '@tdarts/core';
import { connectMongo } from '@tdarts/core';
import { ClubModel } from '@tdarts/core';
import { UserModel } from '@tdarts/core';
import { PlayerModel } from '@tdarts/core';
import { TournamentModel } from '@tdarts/core';
import { ClubShareTokenModel } from '@tdarts/core';
import { AuthorizationService } from './authorization.service';
import { GeocodingService } from './geocoding.service';
import { clubHasCorrectAddress, clubHasGeoLocationSynced } from '@tdarts/core';
import type { StructuredLocation } from '@tdarts/core';
import { randomBytes } from 'node:crypto';

//TODO a klubba és a tornákra ezentúl nem a user collectionből vesszük fel az emberekt.
//Hanem egy köztes kapcsoló Player collectionbe rakjuk és hogyha regisztrált akkor kap egy userRefet
//Viszont így is úgy is felvesszük a nevét, és a statisztikák minden esetben itt lesznek tárolva
//Frontendről  elsz egy kereső ami innen és a user collectionből keres embereket és ha tornához 
//vagy klubbhoz rendeljük őket akkor igazából a player collectionbe kerülnek fevételre és a klubbon is oda fog tartozni a referencia kivéve az admin és modoknál.

export type ManagedClubLocationCompletenessRow = {
  _id: string;
  name: string;
  role: 'admin' | 'moderator';
  hasCorrectAddress: boolean;
  geoLocationSynced: boolean;
};

export class ClubService {
  private static readonly MANUAL_GEOCODE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  private static readonly SHARE_TOKEN_DEFAULT_TTL_DAYS = 60;
  private static sanitizeObjectIdStrings(values: unknown[]): string[] {
    const normalized = values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter((value) => value.length > 0 && value !== 'undefined' && value !== 'null');
    return [...new Set(normalized.filter((value) => Types.ObjectId.isValid(value)))];
  }

  private static logTiming(label: string, startedAt: number, requestId?: string, meta?: Record<string, string>) {
    if (process.env.NODE_ENV === 'production') return;
    const elapsed = Date.now() - startedAt;
    const details = meta
      ? ` ${Object.entries(meta).map(([key, value]) => `${key}=${value}`).join(' ')}`
      : '';
    console.log(`[perf][club]${requestId ? ` [${requestId}]` : ''} ${label} ${elapsed}ms${details}`);
  }

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

    // Create club with empty members array (players are added later through other flows)
    const geocodeResult = await GeocodingService.geocodeAddress(clubData.location, 'user');
    const club = new ClubModel({
      name: clubData.name,
      description: clubData.description,
      location: clubData.location,
      // Keep legacy compatibility: older reads may still rely on address.
      address: clubData.location,
      structuredLocation: geocodeResult.location,
      contact: clubData.contact || {},
      admin: [creatorId], // creator is admin
      members: [], // No initial members, they are added through other flows
      moderators: [],
      tournamentPlayers: [],
      isActive: true,
    });

    await club.save();

    // Note: Boards are now created at tournament level, not club level
    // Players are added through other flows (tournament registration, manual addition, etc.)

    return club;
  }

  static async updateLandingSettings(
    clubId: string,
    userId: string,
    landingSettings: any
  ): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins or moderators can update landing settings');
    }

    // TODO: Validate subscriptions/feature flags for premium features (e.g. custom colors)
    
    club.landingPage = { ...(club.landingPage || {}), ...landingSettings };
    club.markModified('landingPage');
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
      address?: string;
      contact?: {
        email?: string;
        phone?: string;
        website?: string;
      };
      billingInfo?: BillingInfo;
    }
  ): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = await AuthorizationService.checkAdminOnly(userId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins can update club details');
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
    const locationInput = (updates.location || updates.address || '').trim();
    if (locationInput) {
      club.location = locationInput;
      club.address = locationInput;
      const geocodeResult = await GeocodingService.geocodeAddress(locationInput, 'user');
      club.structuredLocation = geocodeResult.location as any;
    }
    if (updates.contact) club.contact = { ...club.contact, ...updates.contact };
    if (updates.billingInfo) club.billingInfo = { ...club.billingInfo, ...updates.billingInfo };
    //TODO: update the boards from the club.
    await club.save();
    return club;
  }

  static async requestClubGeocode(clubId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins or moderators can request geocoding');
    }

    const locationInput = (club.location || club.address || '').trim();
    if (!locationInput) {
      throw new BadRequestError('Club location is missing');
    }

    const lastRequestedAt = club.structuredLocation?.lastRequestedAt
      ? new Date(club.structuredLocation.lastRequestedAt).getTime()
      : 0;
    const now = Date.now();
    const remainingMs = lastRequestedAt + this.MANUAL_GEOCODE_COOLDOWN_MS - now;
    if (remainingMs > 0) {
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      throw new BadRequestError(`Geocode request cooldown active. Try again in ${remainingHours} hour(s).`);
    }

    const geocodeResult = await GeocodingService.geocodeAddress(locationInput, 'manual');
    club.location = locationInput;
    club.address = locationInput;
    club.structuredLocation = {
      ...(club.structuredLocation || {}),
      ...geocodeResult.location,
      lastRequestedAt: new Date(),
    } as any;
    await club.save();
    return club;
  }

  static async addMember(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found', 'club', {
        clubId,
        endpoint: 'addMember'
      });
    }
    const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins or moderators can add members', 'club', {
        userId: requesterId,
        clubId,
        endpoint: 'addMember'
      });
    }
    
    // Check if userId is a player or a user
    let player = await PlayerModel.findById(userId);
    if (!player) {
      // Try to find user in User collection
      const user = await UserModel.findById(userId);
      if (user) {
        // Create player with userRef
        player = await PlayerModel.create({ 
          name: user.name, 
          userRef: user._id,
          isRegistered: true 
        });
      } else {
        throw new BadRequestError('Player or user not found', 'club', {
          userId,
          clubId,
          endpoint: 'addMember'
        });
      }
    }
    
    // Check if player is already a member of this specific club
    if (club.members.includes(player._id)) {
      throw new BadRequestError('Player is already a member of this club', 'club', {
        userId: player._id.toString(),
        clubId,
        endpoint: 'addMember'
      });
    }
    
    // Check if player is admin/moderator in any other club (they can only be admin/moderator in one club)
    const existingAdminClub = await ClubModel.findOne({ 
      $or: [
        { admin: player._id },
        { moderators: player._id }
      ]
    });
    
    if (existingAdminClub && existingAdminClub._id.toString() !== clubId) {
      throw new BadRequestError(`Player is already admin/moderator in club: ${existingAdminClub.name}. They can only be admin/moderator in one club.`, 'club', {
        userId: player._id.toString(),
        clubId,
        existingClubId: existingAdminClub._id.toString(),
        endpoint: 'addMember'
      });
    }
    
    // Add player to club
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
    const isAuthorized = await AuthorizationService.checkAdminOnly(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins can add moderators');
    }
    
    // the id from the request refers to the player collection and in the player collection we refer to the user if it's registered
    const player = await PlayerModel.findById(userId);
    if (!player || !player.userRef) throw new BadRequestError('Player not found');
    const user = await UserModel.findById(player.userRef);
    if (!user) throw new BadRequestError('User not found');
    
    // Check if user is already admin/moderator in any other club
    const existingAdminClub = await ClubModel.findOne({ 
      $or: [
        { admin: user._id },
        { moderators: user._id }
      ]
    });
    
    if (existingAdminClub && existingAdminClub._id.toString() !== clubId) {
      throw new BadRequestError(`User is already admin/moderator in club: ${existingAdminClub.name}. They can only be admin/moderator in one club.`);
    }
    
    // Add player to members if not already there
    if (!club.members.includes(player._id)) {
      club.members.push(player._id);
    }
    
    // Add user to moderators if not already there
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
    const isAuthorized = await AuthorizationService.checkAdminOnly(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins can add admins');
    }
    
    // Only allow if userId is a registered user and has a player entry with userRef
    const user = await UserModel.findById(userId);
    if (!user) throw new BadRequestError('User not found');
    const player = await PlayerModel.findOne({ userRef: user._id });
    if (!player) throw new BadRequestError('User must be a member (player with userRef) to become an admin');
    
    // Check if user is already admin/moderator in any other club
    const existingAdminClub = await ClubModel.findOne({ 
      $or: [
        { admin: user._id },
        { moderators: user._id }
      ]
    });
    
    if (existingAdminClub && existingAdminClub._id.toString() !== clubId) {
      throw new BadRequestError(`User is already admin/moderator in club: ${existingAdminClub.name}. They can only be admin/moderator in one club.`);
    }
    
    // Add player to members if not already there
    if (!club.members.includes(player._id)) {
      club.members.push(player._id);
    }
    
    // Add user to admin if not already there
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

    // Check if user is removing themselves
    if (userId === requesterId) {
      const isMember = await AuthorizationService.checkMemberOrHigher(requesterId, clubId);
      if (!isMember) {
        throw new BadRequestError('User is not a member of this club');
      }
    } else {
      // Check if requester has admin or moderator permissions
      const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, clubId);
      if (!isAuthorized) {
        throw new AuthorizationError('Only admins or moderators can remove members');
      }
    }

    // userId is a Player ID - need to get the User ID for moderators/admin filtering
    const player = await PlayerModel.findById(userId);
    let userRefId: Types.ObjectId | null = null;
    
    if (player && player.userRef) {
      userRefId = new Types.ObjectId(player.userRef);
      
      // Check if this is the last admin
      if (club.admin.includes(userRefId) && club.admin.length === 1) {
        throw new BadRequestError('Cannot remove the last admin');
      }
    }

    // Remove from members array (Player ID)
    club.members = club.members.filter((id: Types.ObjectId) => !id.equals(userId));
    
    // Remove from moderators and admin arrays (User ID) - only if player has userRef
    if (userRefId) {
      club.moderators = club.moderators.filter((id: Types.ObjectId) => !id.equals(userRefId));
      club.admin = club.admin.filter((id: Types.ObjectId) => !id.equals(userRefId));
    }

    await club.save();
    return club;
  }

  static async removeModerator(clubId: string, userId: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    // userId is a Player ID from the members array
    const player = await PlayerModel.findById(userId);
    if (!player) {
      throw new BadRequestError('Player not found');
    }
    
    if (!player.userRef) {
      throw new BadRequestError('Player is not a registered user (no userRef)');
    }

    const isAuthorized = await AuthorizationService.checkAdminOnly(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins can remove moderators');
    }

    // Only remove from moderators array (User ref) - demote to regular member
    club.moderators = club.moderators.filter((_id: Types.ObjectId) => !_id.equals(player.userRef));
    
    await club.save();
    return club;
  }

  static async addTournamentPlayer(clubId: string, playerName: string, requesterId: string): Promise<ClubDocument> {
    await connectMongo();

    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins or moderators can add tournament players');
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

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins or moderators can remove tournament players');
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

    const isAuthorized = await AuthorizationService.checkAdminOnly(requesterId, clubId);
    if (!isAuthorized) {
      throw new AuthorizationError('Only admins can deactivate clubs');
    }

    club.isActive = false;
    await club.save();
    return club;
  }

  static async createSelectedTournamentsShareToken(
    clubId: string,
    tournamentIds: string[],
    options?: { ttlDays?: number }
  ): Promise<string> {
    await connectMongo();
    const normalizedTournamentIds = [...new Set(
      (Array.isArray(tournamentIds) ? tournamentIds : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )];

    if (normalizedTournamentIds.length === 0) {
      throw new BadRequestError('At least one tournamentId is required');
    }

    const club = await ClubModel.findById(clubId).select('_id').lean();
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const existingTournaments = await TournamentModel.find({
      clubId: new Types.ObjectId(clubId),
      tournamentId: { $in: normalizedTournamentIds },
      isDeleted: { $ne: true },
    })
      .select('tournamentId')
      .lean();

    const allowedTournamentIds = new Set(existingTournaments.map((t: any) => String(t.tournamentId || '').trim()).filter(Boolean));
    const validTournamentIds = normalizedTournamentIds.filter((id) => allowedTournamentIds.has(id));
    if (validTournamentIds.length === 0) {
      throw new BadRequestError('No valid tournaments selected for share link');
    }

    const canonicalTournamentIds = [...validTournamentIds].sort();
    const existingToken = await ClubShareTokenModel.findOne({
      clubId: new Types.ObjectId(clubId),
      type: 'selected_tournaments',
      expiresAt: { $gt: new Date() },
      tournamentIds: canonicalTournamentIds,
    })
      .select('token')
      .lean();
    if (existingToken && typeof (existingToken as any).token === 'string') {
      return String((existingToken as any).token);
    }

    const ttlDays = Math.max(1, Math.min(365, Number(options?.ttlDays || this.SHARE_TOKEN_DEFAULT_TTL_DAYS)));
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(6).toString('base64url');
      try {
        await ClubShareTokenModel.create({
          token,
          clubId: new Types.ObjectId(clubId),
          type: 'selected_tournaments',
          tournamentIds: canonicalTournamentIds,
          expiresAt,
        });
        return token;
      } catch (error: any) {
        if (error?.code === 11000) continue;
        throw error;
      }
    }

    throw new BadRequestError('Failed to create a unique share token');
  }

  static async resolveSelectedTournamentsShareToken(token: string): Promise<{
    clubId: string;
    tournamentIds: string[];
  } | null> {
    await connectMongo();
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) return null;

    const row = await ClubShareTokenModel.findOne({
      token: normalizedToken,
      type: 'selected_tournaments',
      expiresAt: { $gt: new Date() },
    })
      .select('clubId tournamentIds')
      .lean();

    if (!row) return null;
    const rawTournamentIds: unknown[] = Array.isArray((row as any).tournamentIds)
      ? (row as any).tournamentIds
      : [];
    const uniqueTournamentIds = Array.from(
      new Set(rawTournamentIds.map((id) => String(id || '').trim()).filter((id) => id.length > 0))
    );

    return {
      clubId: String((row as any).clubId),
      tournamentIds: uniqueTournamentIds,
    };
  }

  static async listSelectedTournamentsShareTokens(clubId: string): Promise<Array<{
    token: string;
    tournamentIds: string[];
    expiresAt: string;
    createdAt: string;
  }>> {
    await connectMongo();
    const rows = await ClubShareTokenModel.find({
      clubId: new Types.ObjectId(clubId),
      type: 'selected_tournaments',
      expiresAt: { $gt: new Date() },
    })
      .select('token tournamentIds expiresAt createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return rows.map((row: any) => ({
      token: String(row.token),
      tournamentIds: Array.isArray(row.tournamentIds) ? row.tournamentIds.map((id: unknown) => String(id)) : [],
      expiresAt: new Date(row.expiresAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
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
      .select('_id tournamentId tournamentSettings code tournamentPlayers isSandbox isDeleted invoiceId verified')

    // Válasz: minden szereplőhöz role mező
    // For members, always include name, userRef, and username ("vendég" if not registered)
    const userRefIds = club.members
      .map((player: any) => (player?.userRef ? String(player.userRef) : ''))
      .filter(Boolean);
    const usersById = userRefIds.length
      ? new Map(
          (
            await UserModel.find({ _id: { $in: userRefIds } }).select('username').lean()
          ).map((u: any) => [String(u._id), u])
        )
      : new Map<string, any>();

    const adminUsers = (club.admin || []).filter((user: any) => user?._id);
    const moderatorUsers = (club.moderators || []).filter((user: any) => user?._id);
    const adminIds = adminUsers.map((user: any) => user._id.toString());
    const moderatorIds = moderatorUsers.map((user: any) => user._id.toString());

    const membersWithUsernames = club.members.map((player: any) => {
      let username = 'vendég';
      if (player.userRef) {
        const user = usersById.get(String(player.userRef));
        if (user && user.username) username = user.username;
      }
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
    });

    const existingMemberUserRefs = new Set(
      membersWithUsernames
        .map((member: any) => (member.userRef ? String(member.userRef) : ''))
        .filter(Boolean)
    );
    const roleOnlyUsers = [
      ...adminUsers.map((user: any) => ({ ...user, role: 'admin' as const })),
      ...moderatorUsers.map((user: any) => ({ ...user, role: 'moderator' as const })),
    ].filter((user: any) => !existingMemberUserRefs.has(String(user._id)));

    if (roleOnlyUsers.length > 0) {
      const roleOnlyUserIds = this.sanitizeObjectIdStrings(roleOnlyUsers.map((user: any) => user?._id));
      if (roleOnlyUserIds.length > 0) {
        const roleOnlyPlayersByUserRef = new Map(
          (
            await PlayerModel.find({ userRef: { $in: roleOnlyUserIds } })
              .select('_id userRef')
              .lean()
          ).map((player: any) => [String(player.userRef), player])
        );

        for (const user of roleOnlyUsers) {
          const userId = String(user._id);
          if (!roleOnlyUserIds.includes(userId)) continue;
          const player = roleOnlyPlayersByUserRef.get(userId);
          membersWithUsernames.push({
            _id: player ? String(player._id) : userId,
            name: user.name || '',
            userRef: userId,
            username: user.username || 'vendég',
            role: user.role,
          });
        }
      }
    }
    const result = {
      ...club.toJSON(),
      admin: adminUsers.map((user: any) => ({
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: 'admin',
      })),
      moderators: moderatorUsers.map((user: any) => ({
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: 'moderator',
      })),
      members: membersWithUsernames,
      tournaments: tournaments.map((t: any) => ({
        _id: t._id.toString(),
        tournamentSettings: t.tournamentSettings,
        tournamentId: t.tournamentId,
        tournamentPlayers: t.tournamentPlayers || [],
        isSandbox: t.isSandbox,
        isDeleted: t.isDeleted,
        invoiceId: t.invoiceId,
        verified: t.verified,
      })),
    };
    return result;
  }

  static async getClubSummary(clubId: string, requestId?: string): Promise<any> {
    const startedAt = Date.now();
    await connectMongo();

    const club = await ClubModel.findById(clubId)
      .select('name description location structuredLocation address logo contact landingPage verified members')
      .lean();
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const tournaments = await TournamentModel.aggregate([
      { $match: { clubId: (club as any)._id } },
      { $sort: { 'tournamentSettings.startDate': -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 1,
          tournamentId: 1,
          tournamentSettings: {
            name: '$tournamentSettings.name',
            startDate: '$tournamentSettings.startDate',
            status: '$tournamentSettings.status',
            location: '$tournamentSettings.location',
            type: '$tournamentSettings.type',
            entryFee: '$tournamentSettings.entryFee',
            entryFeeCurrency: '$tournamentSettings.entryFeeCurrency',
            maxPlayers: '$tournamentSettings.maxPlayers',
            registrationDeadline: '$tournamentSettings.registrationDeadline',
          },
          isSandbox: 1,
          isDeleted: 1,
          invoiceId: 1,
          verified: 1,
          playerCount: { $size: { $ifNull: ['$tournamentPlayers', []] } },
        },
      },
    ]);
    const membersCount = Array.isArray((club as any).members) ? (club as any).members.length : 0;

    const summaryResult = {
      _id: String((club as any)._id),
      name: (club as any).name,
      description: (club as any).description,
      location: (club as any).location,
      structuredLocation: (club as any).structuredLocation,
      address: (club as any).address,
      logo: (club as any).logo,
      contact: (club as any).contact || {},
      landingPage: (club as any).landingPage,
      verified: Boolean((club as any).verified),
      admin: [],
      moderators: [],
      members: [],
      membersCount,
      tournaments: tournaments.map((t: any) => ({
        _id: String(t._id),
        tournamentSettings: t.tournamentSettings,
        tournamentId: t.tournamentId,
        isSandbox: t.isSandbox,
        isDeleted: t.isDeleted,
        invoiceId: t.invoiceId,
        verified: t.verified,
        playerCount: Number(t.playerCount || 0),
      })),
    };
    this.logTiming('getClubSummary', startedAt, requestId, { clubId });
    return summaryResult;
  }

  static async getClubMembersForManagement(clubId: string, requestId?: string): Promise<{
    members: Array<{
      _id: string;
      name: string;
      userRef?: string;
      username: string;
      role: 'admin' | 'moderator' | 'member';
      honors?: any[];
      stats?: { last10ClosedAvg?: number };
    }>;
    admin: Array<{ _id: string; role: 'admin' }>;
    moderators: Array<{ _id: string; role: 'moderator' }>;
    membersCount: number;
  }> {
    const startedAt = Date.now();
    await connectMongo();

    const club = await ClubModel.findById(clubId)
      .select('members admin moderators')
      .populate('members', 'name userRef honors stats')
      .populate('admin', 'name username')
      .populate('moderators', 'name username')
      .lean();

    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const adminUsers = ((club as any).admin || []) as Array<{ _id: unknown; name?: string; username?: string }>;
    const moderatorUsers = ((club as any).moderators || []) as Array<{ _id: unknown; name?: string; username?: string }>;
    const adminIds = adminUsers.map((user: any) => String(user?._id || user));
    const moderatorIds = moderatorUsers.map((user: any) => String(user?._id || user));
    const rawMembers = ((club as any).members || []) as any[];

    const userRefIds = rawMembers
      .map((player: any) => (player?.userRef ? String(player.userRef) : ''))
      .filter(Boolean);
    const usersById = userRefIds.length
      ? new Map(
          (
            await UserModel.find({ _id: { $in: userRefIds } }).select('username').lean()
          ).map((u: any) => [String(u._id), u])
        )
      : new Map<string, any>();

    const members: Array<{
      _id: string;
      name: string;
      userRef?: string;
      username: string;
      role: 'admin' | 'moderator' | 'member';
      honors?: any[];
      stats?: { last10ClosedAvg?: number };
    }> = rawMembers.map((player: any) => {
      const userRefStr = player?.userRef ? String(player.userRef) : '';
      const isAdmin = userRefStr ? adminIds.includes(userRefStr) : false;
      const isModerator = userRefStr ? moderatorIds.includes(userRefStr) : false;
      const username = userRefStr ? usersById.get(userRefStr)?.username || 'vendég' : 'vendég';
      return {
        _id: String(player._id),
        name: String(player?.name || ''),
        userRef: userRefStr || undefined,
        username,
        role: isAdmin ? 'admin' : isModerator ? 'moderator' : 'member',
        honors: Array.isArray(player?.honors) ? player.honors : undefined,
        stats: player?.stats ? { last10ClosedAvg: player.stats?.last10ClosedAvg } : undefined,
      };
    });

    const existingMemberUserRefs = new Set(
      members
        .map((member: any) => (member.userRef ? String(member.userRef) : ''))
        .filter(Boolean)
    );
    const roleOnlyUserIds = this.sanitizeObjectIdStrings(
      [...new Set([...adminIds, ...moderatorIds])].filter((id) => !existingMemberUserRefs.has(id))
    );
    if (roleOnlyUserIds.length > 0) {
      const roleOnlyUsersFromPopulate = [...adminUsers, ...moderatorUsers]
        .map((user: any) => {
          const id = user?._id ? String(user._id) : '';
          if (!id) return null;
          return {
            _id: id,
            name: typeof user?.name === 'string' ? user.name : undefined,
            username: typeof user?.username === 'string' ? user.username : undefined,
          };
        })
        .filter(Boolean) as Array<{ _id: string; name?: string; username?: string }>;
      const roleOnlyUsersFromDb = (
        await UserModel.find({ _id: { $in: roleOnlyUserIds } }).select('name username').lean()
      ).map((user: any) => ({
        _id: String(user._id),
        name: typeof user?.name === 'string' ? user.name : undefined,
        username: typeof user?.username === 'string' ? user.username : undefined,
      }));

      const roleOnlyUserById = new Map<string, { _id: string; name?: string; username?: string }>();
      for (const user of roleOnlyUsersFromDb) roleOnlyUserById.set(user._id, user);
      for (const user of roleOnlyUsersFromPopulate) {
        const existing = roleOnlyUserById.get(user._id);
        roleOnlyUserById.set(user._id, {
          _id: user._id,
          name: existing?.name || user.name,
          username: existing?.username || user.username,
        });
      }

      const roleOnlyPlayerByUserRef = new Map(
        (
          await PlayerModel.find({ userRef: { $in: roleOnlyUserIds } })
            .select('_id userRef name honors stats')
            .lean()
        ).map((player: any) => [String(player.userRef), player])
      );

      for (const userId of roleOnlyUserIds) {
        const user = roleOnlyUserById.get(userId);
        const player = roleOnlyPlayerByUserRef.get(userId);
        const resolvedName = String(user?.name || player?.name || 'Ismeretlen tag');
        const resolvedUsername = user?.username ? String(user.username) : 'vendég';
        members.push({
          _id: player ? String(player._id) : userId,
          name: resolvedName,
          userRef: userId,
          username: resolvedUsername,
          role: adminIds.includes(userId) ? 'admin' : 'moderator',
          honors: Array.isArray(player?.honors) ? player.honors : undefined,
          stats: player?.stats ? { last10ClosedAvg: player.stats?.last10ClosedAvg } : undefined,
        });
      }
    }

    const response = {
      members,
      admin: adminIds.map((id: string) => ({ _id: id, role: 'admin' as const })),
      moderators: moderatorIds.map((id: string) => ({ _id: id, role: 'moderator' as const })),
      membersCount: members.length,
    };
    this.logTiming('getClubMembersForManagement', startedAt, requestId, { clubId });
    return response;
  }

  static async getClubMetadataTheme(clubId: string, requestId?: string): Promise<{
    _id: string;
    name: string;
    description?: string;
    location?: string;
    address?: string;
    logo?: string;
    membersCount: number;
    landingPage?: {
      seo?: {
        title?: string;
        description?: string;
        keywords?: string;
      };
      coverImage?: string;
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  }> {
    const startedAt = Date.now();
    await connectMongo();
    const club = await ClubModel.findById(clubId)
      .select('name description location address logo members landingPage')
      .lean();
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    const membersCount = Array.isArray((club as any).members) ? (club as any).members.length : 0;
    const metadataTheme = {
      _id: String((club as any)._id),
      name: (club as any).name || 'Darts Klub',
      description: (club as any).description,
      location: (club as any).location,
      address: (club as any).address,
      logo: (club as any).logo,
      membersCount,
      landingPage: (club as any).landingPage,
    };
    this.logTiming('getClubMetadataTheme', startedAt, requestId, { clubId });
    return metadataTheme;
  }

  static async getUserClubs(userId: string): Promise<{
    clubs: Array<Record<string, unknown> & { _id: Types.ObjectId; userRole: 'admin' | 'moderator' | 'member' | 'none' }>;
  }> {
    await connectMongo();

    const userObjectId = new Types.ObjectId(userId);
    const playerResult = await PlayerModel.findOne({ userRef: userObjectId }).select('_id').lean();
    const player = Array.isArray(playerResult) ? playerResult[0] : playerResult;
    const playerId = player && typeof player === 'object' && '_id' in player && (player as { _id?: unknown })._id
      ? new Types.ObjectId(String((player as { _id: unknown })._id))
      : null;

    const clubs = await ClubModel.find({
      $or: [
        ...(playerId ? [{ members: playerId }] : []),
        { admin: userObjectId },
        { moderators: userObjectId },
      ],
    });
    if (clubs.length === 0) {
      return { clubs: [] };
    }
    const isGlobalAdmin = await AuthorizationService.checkAdminOnly(userId, clubs[0]?._id.toString());
    const clubsWithRoles = clubs.map((club) => {
      const userRole: 'admin' | 'moderator' | 'member' | 'none' = club.admin.includes(userObjectId)
        ? 'admin'
        : club.moderators.includes(userObjectId)
          ? 'moderator'
          : playerId && club.members.includes(playerId)
            ? 'member'
            : isGlobalAdmin
              ? 'admin'
              : 'none';

      return {
        _id: club._id,
        ...(club.toObject() as Record<string, unknown>),
        userRole,
      } as Record<string, unknown> & { _id: Types.ObjectId; userRole: 'admin' | 'moderator' | 'member' | 'none' };
    });
    return { clubs: clubsWithRoles };
  }

  /**
   * Admin/moderator clubs with venue address + map geocode completeness (for dashboard prompts).
   */
  static async listManagedClubsLocationCompleteness(
    userId: string,
    requestId?: string,
  ): Promise<ManagedClubLocationCompletenessRow[]> {
    const startedAt = Date.now();
    await connectMongo();

    const userObjectId = new Types.ObjectId(userId);
    const clubs = await ClubModel.find({
      $or: [{ admin: userObjectId }, { moderators: userObjectId }],
    })
      .select('_id name admin moderators location address structuredLocation')
      .lean();

    const rows: ManagedClubLocationCompletenessRow[] = [];
    for (const club of clubs) {
      const c = club as {
        _id: Types.ObjectId;
        name?: string;
        admin?: Types.ObjectId[];
        moderators?: Types.ObjectId[];
        location?: string;
        address?: string;
        structuredLocation?: unknown;
      };
      const isAdmin = Array.isArray(c.admin) && c.admin.some((id) => id.equals(userObjectId));
      const isModerator =
        Array.isArray(c.moderators) && c.moderators.some((id) => id.equals(userObjectId));
      if (!isAdmin && !isModerator) continue;

      const sl = c.structuredLocation as StructuredLocation | undefined;
      rows.push({
        _id: String(c._id),
        name: c.name || '',
        role: isAdmin ? 'admin' : 'moderator',
        hasCorrectAddress: clubHasCorrectAddress(sl, c.location, c.address),
        geoLocationSynced: clubHasGeoLocationSynced(sl),
      });
    }

    this.logTiming('listManagedClubsLocationCompleteness', startedAt, requestId, {
      userId,
      count: String(rows.length),
    });
    return rows;
  }

  static async getUserRoleInClub(userId: string, clubId: string, requestId?: string): Promise<string> {
    const startedAt = Date.now();
    await connectMongo();

    const userObjectId = new Types.ObjectId(userId);
    const clubObjectId = new Types.ObjectId(clubId);

    // Get the club to check admin/moderators (User IDs) and members (Player IDs)
    const club = await ClubModel.findById(clubObjectId).select('admin moderators members');
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    // Global super admin must always retain admin-level access regardless of member role.
    const { UserModel } = await import('@tdarts/core');
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin === true) {
      this.logTiming('getUserRoleInClub', startedAt, requestId, { clubId, userId });
      return 'admin';
    }

    // Check Admin (User ID)
    if (club.admin.some((id: Types.ObjectId) => id.equals(userObjectId))) {
      this.logTiming('getUserRoleInClub', startedAt, requestId, { clubId, userId });
      return 'admin';
    }

    // Check Moderator (User ID)
    if (club.moderators.some((id: Types.ObjectId) => id.equals(userObjectId))) {
      this.logTiming('getUserRoleInClub', startedAt, requestId, { clubId, userId });
      return 'moderator';
    }

    // Check Member (Player ID)
    // Find if the user has a player profile
    // We need to check if ANY of the club members is a player linked to this user
    const player = await PlayerModel.findOne({ userRef: userObjectId });
    
    if (player && club.members.some((id: Types.ObjectId) => id.equals(player._id))) {
      this.logTiming('getUserRoleInClub', startedAt, requestId, { clubId, userId });
      return 'member';
    }
    
    this.logTiming('getUserRoleInClub', startedAt, requestId, { clubId, userId });
    return 'none';
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

  // --- SITEMAP SUPPORT ---
  static async getAllClubs(): Promise<{ _id: string; updatedAt?: Date }[]> {
    await connectMongo();
    const clubs = await ClubModel.find({ isActive: { $ne: false } })
      .select('_id updatedAt')
      .lean();
    return clubs.map((club: any) => ({
      _id: club._id.toString(),
      updatedAt: club.updatedAt
    }));
  }
}