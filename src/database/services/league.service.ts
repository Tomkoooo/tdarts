import mongoose from 'mongoose';
import { LeagueModel } from '@/database/models/league.model';
import { PlayerModel } from '@/database/models/player.model';
import { ClubModel } from '@/database/models/club.model';
import {
  LeagueDocument,
  League,
  CreateLeagueRequest,
  UpdateLeagueRequest,
  AddPlayerToLeagueRequest,
  ManualPointsAdjustmentRequest,
  LeagueLeaderboard,
  LeagueStatsResponse,
  LeaguePointsConfig,
  DEFAULT_LEAGUE_POINTS_CONFIG,
} from '@/interface/league.interface';
import { TournamentDocument } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError, AuthorizationError } from '@/middleware/errorHandle';
import { AuthorizationService } from './authorization.service';
import { TournamentService } from './tournament.service';

export class LeagueService {

  /**
   * Helper function to get player ID from either ObjectId or populated object
   */
  private static getPlayerId(player: any): string {
    if (!player) return '';
    // If it's a populated object, use _id
    if (typeof player === 'object' && player._id) {
      return player._id.toString();
    }
    // If it's already a string or ObjectId, convert to string
    return player.toString();
  }

  /**
   * Helper function to get ObjectId from either ObjectId or populated object
   */
  private static getObjectId(obj: any): string {
    if (!obj) return '';
    // If it's a populated object, use _id
    if (typeof obj === 'object' && obj._id) {
      return obj._id.toString();
    }
    // If it's already a string or ObjectId, convert to string
    return obj.toString();
  }

  /**
   * Create a new league within a club
   */
  static async createLeague(
    clubId: string,
    creatorId: string,
    leagueData: CreateLeagueRequest
  ): Promise<LeagueDocument> {
    await connectMongo();

    // Check if user has moderator permissions for this club
    const hasPermission = await AuthorizationService.hasClubModerationPermission(creatorId, clubId);
    if (!hasPermission) {
      throw new AuthorizationError('Only club moderators can create leagues');
    }

    // Verify club exists
    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found');
    }

    // Check for duplicate league names within the club
    const existingLeague = await LeagueModel.findOne({
      club: clubId,
      name: leagueData.name,
      isActive: true
    });
    if (existingLeague) {
      throw new BadRequestError('A league with this name already exists in the club');
    }

    // Merge provided points config with defaults
    const pointsConfig: LeaguePointsConfig = {
      ...DEFAULT_LEAGUE_POINTS_CONFIG,
      ...leagueData.pointsConfig
    };

    const league = new LeagueModel({
      name: leagueData.name,
      description: leagueData.description,
      club: clubId,
      pointsConfig,
      pointSystemType: leagueData.pointSystemType || 'platform',
      createdBy: creatorId,
      startDate: leagueData.startDate,
      endDate: leagueData.endDate,
      attachedTournaments: [],
      players: []
    });

    return await league.save();
  }

  /**
   * Update league settings
   */
  static async updateLeague(
    leagueId: string,
    userId: string,
    updates: UpdateLeagueRequest
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    if (league.verified) {
      const isGlobalAdmin = await AuthorizationService.isGlobalAdmin(userId);
      if (!isGlobalAdmin) {
        throw new AuthorizationError('Only global admins can update verified OAC leagues');
      }
    } else {
      const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
      if (!hasPermission) {
        throw new AuthorizationError('Only club moderators can update leagues');
      }
    }

    // Check for name conflicts if name is being updated
    if (updates.name && updates.name !== league.name) {
      const existingLeague = await LeagueModel.findOne({
        club: league.club,
        name: updates.name,
        _id: { $ne: leagueId },
        isActive: true
      });
      if (existingLeague) {
        throw new BadRequestError('A league with this name already exists in the club');
      }
    }

    // Update fields
    if (updates.name) league.name = updates.name;
    if (updates.description !== undefined) league.description = updates.description;
    if (updates.isActive !== undefined) league.isActive = updates.isActive;
    if (updates.startDate !== undefined) league.startDate = updates.startDate;
    if (updates.endDate !== undefined) league.endDate = updates.endDate;
    if (updates.pointSystemType !== undefined) league.pointSystemType = updates.pointSystemType;

    if (updates.pointsConfig) {
      league.pointsConfig = {
        ...league.pointsConfig,
        ...updates.pointsConfig
      };
    }

    return await league.save();
  }

  /**
   * Attach a tournament to a league
   * @param calculatePoints - If false, only updates league averages without assigning points (for already finished tournaments)
   */
  static async attachTournamentToLeague(
    leagueId: string,
    tournamentId: string,
    userId: string,
    calculatePoints: boolean = true,
    isSystemAction: boolean = false
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions (skip for system actions)
    if (!isSystemAction) {
      if (league.verified) {
        const isGlobalAdmin = await AuthorizationService.isGlobalAdmin(userId);
        if (!isGlobalAdmin) {
          throw new AuthorizationError('Only global admins can attach tournaments to verified OAC leagues');
        }
      } else {
        const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
        if (!hasPermission) {
          throw new AuthorizationError('Only club moderators can attach tournaments to leagues');
        }
      }
    }

    if (!tournamentId) {
      throw new BadRequestError('Tournament ID is required - League Service');
    }

    const tournament = await TournamentService.getTournament(tournamentId);

    if (!tournament) {
      throw new BadRequestError('Tournament not found - League Service');
    }

    // Verify tournament belongs to the same club
    const tournamentClubId = this.getObjectId(tournament.clubId);
    const leagueClubId = this.getObjectId(league.club);
    if (tournamentClubId !== leagueClubId) {
      throw new BadRequestError('Tournament must belong to the same club as the league');
    }

    // Check if tournament is already attached to this or another league
    const tournamentObjectId = tournament._id;
    if (league.attachedTournaments.some((id: mongoose.Types.ObjectId) => id.equals(tournamentObjectId))) {
      throw new BadRequestError('Tournament is already attached to this league');
    }

    const existingLeague = await LeagueModel.findOne({
      attachedTournaments: tournamentObjectId,
      _id: { $ne: leagueId }
    });
    if (existingLeague) {
      throw new BadRequestError('Tournament is already attached to another league');
    }

    // Attach tournament
    league.attachedTournaments.push(tournamentObjectId);
    await league.save();

    // If tournament is finished and calculatePoints is true, calculate points
    // If calculatePoints is false, it means the tournament was already finished and we only want to track averages
    if (tournament.tournamentSettings.status === 'finished' && calculatePoints) {
      await this.calculatePointsForTournament(tournament, league);
    }

    return league;
  }

  /**
   * Detach a tournament from a league and remove all associated tournament points
   */
  static async detachTournamentFromLeague(
    leagueId: string,
    tournamentId: string,
    userId: string
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    if (league.verified) {
      const isGlobalAdmin = await AuthorizationService.isGlobalAdmin(userId);
      if (!isGlobalAdmin) {
        throw new AuthorizationError('Only global admins can detach tournaments from verified OAC leagues');
      }
    } else {
      const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
      if (!hasPermission) {
        throw new AuthorizationError('Only club moderators can detach tournaments from leagues');
      }
    }

    const tournament = await TournamentService.getTournament(tournamentId);
    if (!tournament) {
      throw new BadRequestError('Tournament not found - League Service');
    }

    // Check if tournament is actually attached to this league
    const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
    const tournamentIndex = league.attachedTournaments.findIndex((id: mongoose.Types.ObjectId) => id.equals(tournamentObjectId));

    if (tournamentIndex === -1) {
      throw new BadRequestError('Tournament is not attached to this league');
    }

    // Remove tournament from attachedTournaments
    league.attachedTournaments.splice(tournamentIndex, 1);

    // Remove all tournamentPoints entries for this tournament from all players
    for (const player of league.players) {
      const pointsIndex = player.tournamentPoints.findIndex(
        (tp: any) => tp.tournament.toString() === tournamentId
      );

      if (pointsIndex !== -1) {
        console.log(`Removing tournament points for player ${player.player} from tournament ${tournamentId}`);
        player.tournamentPoints.splice(pointsIndex, 1);

        // Recalculate total points for this player
        player.totalPoints = this.calculatePlayerTotalPointsForLeague(player);
      }
    }

    await league.save();
    console.log(`Tournament ${tournamentId} detached from league ${leagueId} successfully`);

    return league;
  }

  /**
   * Add a player manually to a league
   */
  static async addPlayerToLeague(
    leagueId: string,
    userId: string,
    playerData: AddPlayerToLeagueRequest
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    if (league.verified) {
      const isGlobalAdmin = await AuthorizationService.isGlobalAdmin(userId);
      if (!isGlobalAdmin) {
        throw new AuthorizationError('Only global admins can add players to verified OAC leagues');
      }
    } else {
      const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
      if (!hasPermission) {
        throw new AuthorizationError('Only club moderators can add players to leagues');
      }
    }

    // No, the approach as written will never reach the second lookup (by userRef) because of the thrown error.
    // Correct version: try to find by _id, if not found, try by userRef, and only throw if neither found.
    let player = await PlayerModel.findById(playerData.playerId);
    if (!player) {
      player = await PlayerModel.findOne({ userRef: playerData.playerId });
      if (!player) {
        throw new BadRequestError('Player not found');
      }
    }

    // Check if player is already in the league
    const existingPlayer = league.players.find((p: any) => this.getPlayerId(p.player) === playerData.playerId);
    if (existingPlayer) {
      throw new BadRequestError('Player is already in this league');
    }

    // Add player
    league.players.push({
      player: player._id,
      totalPoints: 0,
      tournamentPoints: [],
      manualAdjustments: []
    });

    return await league.save();
  }

  /**
   * Make manual points adjustment for a player
   */
  static async adjustPlayerPoints(
    leagueId: string,
    userId: string,
    adjustment: ManualPointsAdjustmentRequest
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    if (league.verified) {
      const isGlobalAdmin = await AuthorizationService.isGlobalAdmin(userId);
      if (!isGlobalAdmin) {
        throw new AuthorizationError('Only global admins can adjust player points in verified OAC leagues');
      }
    } else {
      const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
      if (!hasPermission) {
        throw new AuthorizationError('Only club moderators can adjust player points');
      }
    }

    const playerIndex = league.players.findIndex((p: any) => this.getPlayerId(p.player) === adjustment.playerId);
    if (playerIndex === -1) {
      throw new BadRequestError('Player not found in this league');
    }

    // Add manual adjustment
    league.players[playerIndex].manualAdjustments.push({
      points: adjustment.pointsAdjustment,
      reason: adjustment.reason,
      adjustedBy: userId as any,
      adjustedAt: new Date()
    });

    // Recalculate total points
    league.players[playerIndex].totalPoints = league.calculatePlayerTotalPoints(adjustment.playerId);

    return await league.save();
  }

  /**
   * Undo a manual points adjustment for a player
   */
  static async undoPointsAdjustment(
    leagueId: string,
    userId: string,
    playerId: string,
    adjustmentIndex: number
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    if (league.verified) {
      const isGlobalAdmin = await AuthorizationService.isGlobalAdmin(userId);
      if (!isGlobalAdmin) {
        throw new AuthorizationError('Only global admins can undo adjustments in verified OAC leagues');
      }
    } else {
      const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
      if (!hasPermission) {
        throw new AuthorizationError('Only club moderators can undo adjustments');
      }
    }

    const playerIndex = league.players.findIndex((p: any) => this.getPlayerId(p.player) === playerId);
    if (playerIndex === -1) {
      throw new BadRequestError('Player not found in this league');
    }

    // Check if adjustment exists
    if (adjustmentIndex < 0 || adjustmentIndex >= league.players[playerIndex].manualAdjustments.length) {
      throw new BadRequestError('Invalid adjustment index');
    }

    // Remove the adjustment
    league.players[playerIndex].manualAdjustments.splice(adjustmentIndex, 1);

    // Recalculate total points
    league.players[playerIndex].totalPoints = league.calculatePlayerTotalPoints(playerId);

    return await league.save();
  }

  /**
   * Calculate and update points for a tournament
   */
  static async calculatePointsForTournament(
    tournament: TournamentDocument,
    league: LeagueDocument
  ): Promise<void> {
    await connectMongo();

    if (tournament.tournamentSettings.status !== 'finished') {
      throw new BadRequestError('Can only calculate points for finished tournaments');
    }

    // Get all checked-in players with their final positions
    const checkedInPlayers = tournament.tournamentPlayers.filter(
      (player: any) => player.status === 'checked-in' || player.status === 'eliminated' || player.status === 'winner'
    );

    if (checkedInPlayers.length === 0) {
      return; // No players to calculate points for
    }

    // Calculate points for each player
    for (const tournamentPlayer of checkedInPlayers) {
      const playerId = this.getPlayerId(tournamentPlayer.playerReference);
      const position = tournamentPlayer.tournamentStanding || tournamentPlayer.finalPosition || 999;
      const eliminatedIn = tournamentPlayer.eliminatedIn || 'unknown';

      let points: number;

      switch (league.pointSystemType) {
        case 'remiz_christmas':
          points = await this.calculateRemizChristmasPoints(
            tournamentPlayer,
            tournament,
            position,
          );
          break;
        case 'ontour':
          points = await this.calculateOntourPoints(
            tournamentPlayer,
            tournament,
            position,
          );
          break;
        case 'gold_fisch':
          points = await this.calculateGoldFischPoints(
            tournamentPlayer,
            tournament,
            position,
          );
          break;
        default:
          points = this.calculatePlayerPointsForTournament(
            position,
            eliminatedIn,
            checkedInPlayers.length,
            league.pointsConfig
          );
          break;
      }

      if (league.pointSystemType === 'remiz_christmas') {
        points = await this.calculateRemizChristmasPoints(
          tournamentPlayer,
          tournament,
          position,
        );
      } else if (league.pointSystemType === 'ontour') {
        points = await this.calculateOntourPoints(
          tournamentPlayer,
          tournament,
          position,
        );
      } else {
        points = this.calculatePlayerPointsForTournament(
          position,
          eliminatedIn,
          checkedInPlayers.length,
          league.pointsConfig
        );
      }

      // National League Constraint: If league is verified and less than 16 players, points are 0
      if (league.verified && checkedInPlayers.length < 16) {
        points = 0;
      }

      // Find or create player in league
      let leaguePlayer = league.players.find((p: any) => this.getPlayerId(p.player) === playerId);
      if (!leaguePlayer) {
        // Auto-add player to league if not already present
        league.players.push({
          player: playerId as any,
          totalPoints: 0,
          tournamentPoints: [],
          manualAdjustments: []
        });
        leaguePlayer = league.players[league.players.length - 1];
      }

      // Remove any existing points for this tournament (in case of recalculation)
      leaguePlayer.tournamentPoints = leaguePlayer.tournamentPoints.filter(
        tp => tp.tournament.toString() !== tournament._id.toString()
      );

      // Add new tournament points
      leaguePlayer.tournamentPoints.push({
        tournament: tournament._id as any,
        points,
        position,
        eliminatedIn
      });

      // Recalculate total points
      leaguePlayer.totalPoints = this.calculatePlayerTotalPointsForLeague(leaguePlayer);
    }

    // Normalize player references to ensure only ObjectIds are stored (not populated objects)
    league.players = league.players.map((p: any) => {
      const playerId = this.getPlayerId(p.player);
      return {
        ...p,
        player: new mongoose.Types.ObjectId(playerId) // Ensure it's an ObjectId, not a populated object
      };
    });

    await league.save();
  }

  /**
   * Calculate total points for a player in a league
   */
  private static calculatePlayerTotalPointsForLeague(leaguePlayer: any): number {
    const tournamentPoints = leaguePlayer.tournamentPoints.reduce((sum: number, tp: any) => sum + tp.points, 0);
    const adjustmentPoints = leaguePlayer.manualAdjustments.reduce((sum: number, adj: any) => sum + adj.points, 0);
    return tournamentPoints + adjustmentPoints;
  }

  /* Calculate total points based on the dartbarlang ontour point system */

  private static async calculateOntourPoints(
    tournamentPlayer: any,
    tournament: TournamentDocument,
    position: number
  ) {
    /*
      winner: 45p
      runner up: 32p
      third: 24p
      fourth: 20p
      8. placement: 16p
      16. placement: 10p
      32. placement: 4p
      48. placement: 2p
    */
    let tournamentPoint: number;
    switch (position) {
      case 1:
        tournamentPoint = 45;
        break;
      case 2:
        tournamentPoint = 32;
        break;
      case 3:
        tournamentPoint = 24;
        break;
      case 4:
        tournamentPoint = 20;
        break;
      case 8:
        tournamentPoint = 16;
        break;
      case 16:
        tournamentPoint = 10;
        break;
      case 32:
        tournamentPoint = 4;
        break;
      case 48:
        tournamentPoint = 2;
        break;
      default:
        tournamentPoint = 0;
        break;
    }

    return tournamentPoint;
  }

  /**
   * Calculate points using Remiz Christmas Series system
   */
  private static async calculateRemizChristmasPoints(
    tournamentPlayer: any,
    tournament: TournamentDocument,
    position: number,
  ): Promise<number> {
    let totalPoints = 20; // Fixed 20 points for participation

    // Calculate group points based on group size and wins
    if (tournamentPlayer.groupId) {
      // Find all players in the same group
      const groupPlayers = tournament.tournamentPlayers.filter(
        (p: any) => p.groupId?.toString() === tournamentPlayer.groupId?.toString()
      );
      const groupSize = groupPlayers.length;

      // Count only group matches won (not knockout matches)
      const playerRefId = this.getPlayerId(tournamentPlayer.playerReference);
      const groupMatchesWon = await this.countGroupMatchesWon(
        tournament,
        playerRefId,
        tournamentPlayer.groupId.toString()
      );

      // Calculate group points based on group size and wins
      const groupPoints = this.getRemizGroupPoints(groupSize, groupMatchesWon);
      totalPoints += groupPoints;
    }

    // Calculate placement points
    const placementPoints = this.getRemizPlacementPoints(position);
    totalPoints += placementPoints;

    return totalPoints;
  }

  //Here add the gold fisch point calculation
  private static async calculateGoldFischPoints(
    tournamentPlayer: any,
    tournament: TournamentDocument,
    position: number
  ) {
    /*
      winner: 15p
      runner up: 12p
      fourth: 10p
      8. placement: 8p
      16. placement: 6p
      32. placement: 4p
      64. placement: 2p
      128. placement: 1p

      if playercount is under 8:
      winner: 10p
      runner up: 8p
      third: 6p
      4. placement: 5p
      5. placement: 4p
      6. placement: 3p
      7. placement: 2p
    */
    let tournamentPoint: number;
    if (tournament.tournamentPlayers.length < 8) {
      switch (position) {
        case 1:
          tournamentPoint = 10;
          break;
        case 2:
          tournamentPoint = 8;
          break;
        case 3:
          tournamentPoint = 6;
          break;
        case 4:
          tournamentPoint = 5;
          break;
        case 5:
          tournamentPoint = 4;
          break;
        case 6:
          tournamentPoint = 3;
          break;
        case 7:
          tournamentPoint = 2;
          break;
        default:
          tournamentPoint = 0;
          break;
      }
    } else {
      switch (position) {
        case 1:
          tournamentPoint = 15;
          break;
        case 2:
          tournamentPoint = 12;
          break;
        case 4:
          tournamentPoint = 10;
          break;
        case 8:
          tournamentPoint = 8;
          break;
        case 16:
          tournamentPoint = 6;
          break;
        case 32:
          tournamentPoint = 4;
          break;
        case 64:
          tournamentPoint = 2;
          break;
        case 128:
          tournamentPoint = 1;
          break;
        default:
          tournamentPoint = 0;
          break;
      }
    }
    return tournamentPoint;
  }

  /**
   * Count group matches won by a player (excluding knockout matches)
   */
  private static async countGroupMatchesWon(
    tournament: TournamentDocument,
    playerId: string,
    groupId: string
  ): Promise<number> {
    const { MatchModel } = await import('@/database/models/match.model');

    // Find the group
    const group = tournament.groups?.find((g: any) => g._id?.toString() === groupId);
    if (!group || !group.matches || group.matches.length === 0) {
      return 0;
    }

    // Get all matches for this group
    const matchDocs = await MatchModel.find({
      _id: { $in: group.matches },
      type: 'group' // Ensure we only count group matches
    });

    // Count wins for this player
    let wins = 0;
    for (const match of matchDocs) {
      if (match.winnerId && match.winnerId.toString() === playerId) {
        wins++;
      }
    }

    return wins;
  }

  /**
   * Get group points for Remiz Christmas Series based on group size and wins
   * Table header "0p, 2p, 4p, 6p, 8p, 10p" represents wins (0, 1, 2, 3, 4, 5 wins)
   * where "p" means points in tournament (each win = 2 points)
   */
  private static getRemizGroupPoints(groupSize: number, wins: number): number {
    // Map wins to points based on group size
    // Table: 0p=0 wins, 2p=1 win, 4p=2 wins, 6p=3 wins, 8p=4 wins, 10p=5 wins
    const pointsMap: Record<number, Record<number, number>> = {
      3: { 0: 0, 1: 30, 2: 60 }, // 3 players: 0 wins = 0p, 1 win = 30p, 2 wins = 60p
      4: { 0: 0, 1: 20, 2: 40, 3: 60 }, // 4 players: 0 wins = 0p, 1 win = 20p, 2 wins = 40p, 3 wins = 60p
      5: { 0: 0, 1: 15, 2: 30, 3: 45, 4: 60 }, // 5 players: 0 wins = 0p, 1 win = 15p, 2 wins = 30p, 3 wins = 45p, 4 wins = 60p
      6: { 0: 0, 1: 12, 2: 24, 3: 36, 4: 48, 5: 60 }, // 6 players: 0 wins = 0p, 1 win = 12p, 2 wins = 24p, 3 wins = 36p, 4 wins = 48p, 5 wins = 60p
    };

    const groupMap = pointsMap[groupSize];
    if (!groupMap) {
      // Default to 0 if group size not in table
      return 0;
    }

    // Find the exact match or closest lower value
    if (groupMap[wins] !== undefined) {
      return groupMap[wins];
    }

    // If wins exceed table, return max points
    const maxWins = Math.max(...Object.keys(groupMap).map(Number));
    if (wins > maxWins) {
      return groupMap[maxWins];
    }

    // If wins are between values, return the lower one
    const winKeys = Object.keys(groupMap).map(Number).sort((a, b) => b - a);
    for (const winKey of winKeys) {
      if (wins >= winKey) {
        return groupMap[winKey];
      }
    }

    return 0;
  }

  /**
   * Get placement points for Remiz Christmas Series
   * Mapping: 1st = 100, 2nd = 60, 3rd = 40, 5th (position 4) = 30, 11th (position 8) = 20, 17th (position 16) = 10
   */
  private static getRemizPlacementPoints(position: number): number {
    // Placement mapping:
    // 1st place (position 1) = 100 points
    // 2nd place (position 2) = 60 points
    // 3rd place (position 3) = 40 points
    // 5th place (position 4) = 30 points
    // 11th place (position 8) = 20 points
    // 17th place (position 16) = 10 points

    if (position === 1) return 100;
    if (position === 2) return 60;
    if (position === 4) return 40;
    if (position === 8) return 30; // 5th placement
    if (position === 16) return 20; // 11th placement
    if (position === 32) return 10; // 17th placement

    // For other positions, return 0 (no placement points)
    return 0;
  }

  /**
   * Calculate points for a single player based on their tournament performance
   */
  private static calculatePlayerPointsForTournament(
    position: number,
    eliminatedIn: string,
    totalPlayers: number,
    config: LeaguePointsConfig
  ): number {
    // If using fixed rank points
    if (config.useFixedRanks && config.fixedRankPoints) {
      return config.fixedRankPoints[position] || 0;
    }

    // If eliminated in group stage
    if (eliminatedIn === 'group' || eliminatedIn.includes('group')) {
      return config.groupDropoutPoints;
    }

    // For knockout stage eliminations
    if (position === 1) {
      // Winner gets highest geometric value + winner bonus
      const highestGeometric = config.knockoutBasePoints * Math.pow(config.knockoutMultiplier, config.maxKnockoutRounds - 1);
      return Math.round(highestGeometric + config.winnerBonus);
    }

    // Calculate knockout round from position
    let knockoutRound = 1;
    if (position === 2) knockoutRound = config.maxKnockoutRounds; // Finalist
    else {
      // Estimate knockout round based on position and total players
      knockoutRound = Math.max(1, config.maxKnockoutRounds - Math.floor(Math.log2(position - 1)));
    }

    // Calculate geometric progression points
    const roundFromBottom = Math.max(1, knockoutRound);
    const points = config.knockoutBasePoints * Math.pow(config.knockoutMultiplier, roundFromBottom - 1);

    return Math.round(points);
  }

  /**
   * Get league leaderboard
   */
  static async getLeagueLeaderboard(leagueId: string): Promise<LeagueLeaderboard[]> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId)
      .populate('players.player')
      .populate('attachedTournaments');
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Get all attached tournaments to extract player positions and averages
    const attachedTournaments = league.attachedTournaments || [];

    const leaderboard: LeagueLeaderboard[] = league.players
      .filter((player: any) => player.player !== null && player.player !== undefined) // Filter out null/undefined players
      .map((player: any) => {
        const totalPoints = this.calculatePlayerTotalPointsForLeague(player);


        // Get positions from tournamentPoints (tournaments with points)
        const positionsFromPoints = player.tournamentPoints.map((tp: any) => tp.position).filter((p: number) => p > 0);

        // Also get positions and averages from all attached tournaments for this player
        const playerIdStr = this.getPlayerId(player.player);
        const allPositions: number[] = [...positionsFromPoints];
        const allAverages: number[] = [];

        attachedTournaments.forEach((tournament: any) => {
          if (tournament && tournament.tournamentPlayers) {
            const tournamentPlayer = tournament.tournamentPlayers.find(
              (tp: any) => tp.playerReference?.toString() === playerIdStr
            );

            if (tournamentPlayer) {
              // Add position if available
              const position = tournamentPlayer.tournamentStanding || tournamentPlayer.finalPosition;
              if (position && position > 0 && !positionsFromPoints.includes(position)) {
                allPositions.push(position);
              }

              // Add average if available
              const avg = tournamentPlayer.stats?.avg || tournamentPlayer.stats?.average;
              if (avg && avg > 0) {
                allAverages.push(avg);
              }
            }
          }
        });

        // Calculate statistics
        const averagePosition = allPositions.length > 0
          ? allPositions.reduce((sum: number, pos: number) => sum + pos, 0) / allPositions.length
          : 0;
        const bestPosition = allPositions.length > 0 ? Math.min(...allPositions) : 999;
        const leagueAverage = allAverages.length > 0
          ? allAverages.reduce((sum: number, avg: number) => sum + avg, 0) / allAverages.length
          : 0;

        // Get last tournament date
        const lastTournamentDate = player.tournamentPoints.length > 0
          ? new Date(Math.max(...player.tournamentPoints.map((tp: { tournament: { createdAt?: Date } }) => new Date(tp.tournament.createdAt || 0).getTime())))
          : undefined;

        // Ensure player object exists and has required properties
        const playerData = player.player;
        if (!playerData) {
          console.warn('Player data is null/undefined for player ID:', player.player);
          return null;
        }

        return {
          position: 0, // Will be set after sorting
          player: {
            _id: playerData._id?.toString() || playerData.toString(),
            name: playerData.name || 'Unknown Player'
          },
          totalPoints,
          tournamentsPlayed: allPositions.length, // Count all tournaments where player participated
          averagePosition: Math.round(averagePosition * 10) / 10,
          bestPosition: bestPosition === 999 ? 0 : bestPosition,
          leagueAverage: Math.round(leagueAverage * 100) / 100, // Add league average
          lastTournamentDate
        };
      })
      .filter((item: any) => item !== null) // Remove null items
      .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
      .map((player: any, index: number) => ({
        ...player,
        position: index + 1
      }));

    return leaderboard;
  }

  /**
   * Get comprehensive league statistics
   */
  static async getLeagueStats(leagueId: string): Promise<LeagueStatsResponse> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId)
      .populate({
        path: 'attachedTournaments',
        populate: {
          path: 'clubId',
          select: 'name'
        }
      })
      .populate({
        path: 'players.player',
        select: 'name username'
      })
      .populate({
        path: 'players.manualAdjustments.adjustedBy',
        select: 'name username'
      })
      .populate({
        path: 'removedPlayers.player',
        select: 'name username'
      })
      .populate({
        path: 'removedPlayers.removedBy',
        select: 'name username'
      })
      .populate({
        path: 'removedPlayers.manualAdjustments.adjustedBy',
        select: 'name username'
      });

    if (!league) {
      throw new BadRequestError('League not found');
    }

    const leaderboard = await this.getLeagueLeaderboard(leagueId);
    const totalTournaments = league.attachedTournaments.length;
    const totalPlayers = league.players.length;

    // Debug: Check if players are populated
    console.log('League players populated check:', league.players.map((p: any) => ({
      playerId: p.player?._id || p.player,
      playerName: p.player?.name || 'NOT POPULATED',
      isPopulated: typeof p.player === 'object'
    })));

    // If players are not populated, manually populate them
    if (league.players.length > 0 && typeof league.players[0].player === 'string') {
      console.log('Players not populated, manually populating...');
      const PlayerModel = (await import('@/database/models/player.model')).PlayerModel;

      for (let i = 0; i < league.players.length; i++) {
        const playerId = league.players[i].player;
        const playerDoc = await PlayerModel.findById(playerId).select('name username');
        if (playerDoc) {
          league.players[i].player = playerDoc;
        }
      }

      // Also populate manualAdjustments.adjustedBy
      for (let i = 0; i < league.players.length; i++) {
        for (let j = 0; j < league.players[i].manualAdjustments.length; j++) {
          const adjustedById = league.players[i].manualAdjustments[j].adjustedBy;
          if (typeof adjustedById === 'string') {
            const UserModel = (await import('@/database/models/user.model')).UserModel;
            const userDoc = await UserModel.findById(adjustedById).select('name username');
            if (userDoc) {
              league.players[i].manualAdjustments[j].adjustedBy = userDoc;
            }
          }
        }
      }
    }

    // Calculate average points per tournament
    const totalPointsAwarded = league.players.reduce((sum: number, player: any) =>
      sum + player.tournamentPoints.reduce((playerSum: number, tp: any) => playerSum + tp.points, 0), 0
    );
    const averagePointsPerTournament = totalTournaments > 0 ? totalPointsAwarded / totalTournaments : 0;

    // Create a clean league data object with populated fields
    const leagueData = {
      _id: league._id,
      name: league.name,
      description: league.description,
      club: league.club,
      pointsConfig: league.pointsConfig,
      createdBy: league.createdBy,
      isActive: league.isActive,
      startDate: league.startDate,
      endDate: league.endDate,
      createdAt: league.createdAt,
      updatedAt: league.updatedAt,
      verified: league.verified,
      pointSystemType: league.pointSystemType,
      // Include populated tournaments
      attachedTournaments: league.attachedTournaments.map((tournament: any) => ({
        _id: tournament._id,
        tournamentId: tournament.tournamentId,
        tournamentSettings: tournament.tournamentSettings,
        tournamentPlayers: tournament.tournamentPlayers,
        clubId: tournament.clubId,
        status: tournament.status,
        createdAt: tournament.createdAt,
        updatedAt: tournament.updatedAt
      })),
      // Include populated players (filter out null/undefined players)
      players: league.players
        .filter((player: any) => player.player !== null && player.player !== undefined)
        .map((player: any) => ({
          player: {
            _id: player.player._id,
            name: player.player.name,
            username: player.player.username
          },
          totalPoints: player.totalPoints,
          tournamentPoints: player.tournamentPoints,
          manualAdjustments: player.manualAdjustments.map((adjustment: any) => ({
            points: adjustment.points,
            reason: adjustment.reason,
            adjustedBy: {
              _id: adjustment.adjustedBy._id,
              name: adjustment.adjustedBy.name,
              username: adjustment.adjustedBy.username
            },
            adjustedAt: adjustment.adjustedAt
          }))
        })),
      // Include removed players with full data
      removedPlayers: league.removedPlayers ? league.removedPlayers.map((removal: any) => ({
        player: {
          _id: removal.player._id,
          name: removal.player.name,
          username: removal.player.username
        },
        totalPoints: removal.totalPoints,
        tournamentPoints: removal.tournamentPoints.map((tp: any) => ({
          tournament: tp.tournament,
          points: tp.points,
          position: tp.position,
          eliminatedIn: tp.eliminatedIn
        })),
        manualAdjustments: removal.manualAdjustments.map((adjustment: any) => ({
          points: adjustment.points,
          reason: adjustment.reason,
          adjustedBy: {
            _id: adjustment.adjustedBy._id || adjustment.adjustedBy,
            name: adjustment.adjustedBy.name || 'Unknown',
            username: adjustment.adjustedBy.username || 'Unknown'
          },
          adjustedAt: adjustment.adjustedAt
        })),
        reason: removal.reason,
        removedBy: {
          _id: removal.removedBy._id,
          name: removal.removedBy.name,
          username: removal.removedBy.username
        },
        removedAt: removal.removedAt
      })) : []
    };

    return {
      league: leagueData,
      leaderboard,
      totalTournaments,
      totalPlayers,
      averagePointsPerTournament: Math.round(averagePointsPerTournament * 10) / 10
    };
  }

  /**
   * Get all leagues for a club
   */
  static async getClubLeagues(clubId: string, activeOnly: boolean = true): Promise<League[]> {
    await connectMongo();

    const query: any = { club: clubId };
    if (activeOnly) {
      query.isActive = true;
    }

    const leagues = await LeagueModel.find(query)
      .populate('attachedTournaments', 'tournamentId tournamentSettings.name tournamentSettings.startDate')
      .sort({ createdAt: -1 });

    return leagues.map(league => league.toJSON());
  }

  /**
   * Delete a league (soft delete by setting isActive to false)
   */
  static async deleteLeague(leagueId: string, userId: string): Promise<boolean> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
    if (!hasPermission) {
      throw new AuthorizationError('Only club moderators can delete leagues');
    }

    league.isActive = false;
    await league.save();

    return true;
  }

  /**
   * Remove a player from a league
   */
  static async removePlayerFromLeague(
    leagueId: string,
    userId: string,
    playerId: string,
    reason: string
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
    if (!hasPermission) {
      throw new AuthorizationError('Only club moderators can remove players from leagues');
    }

    const playerIndex = league.players.findIndex((p: any) => this.getPlayerId(p.player) === playerId);
    if (playerIndex === -1) {
      throw new BadRequestError('Player not found in this league');
    }

    // Get player data before removal (full snapshot)
    const playerData = league.players[playerIndex];

    // Initialize removedPlayers array if it doesn't exist
    if (!league.removedPlayers) {
      league.removedPlayers = [];
    }

    // Add to removedPlayers history with full data snapshot
    league.removedPlayers.push({
      player: playerData.player,
      totalPoints: playerData.totalPoints,
      tournamentPoints: playerData.tournamentPoints,
      manualAdjustments: playerData.manualAdjustments,
      reason,
      removedBy: userId as any,
      removedAt: new Date()
    });

    // Remove player from active players
    league.players.splice(playerIndex, 1);

    return await league.save();
  }

  /**
   * Undo a player removal from a league
   */
  static async undoPlayerRemoval(
    leagueId: string,
    userId: string,
    playerId: string,
    removalIndex: number
  ): Promise<LeagueDocument> {
    await connectMongo();

    const league = await LeagueModel.findById(leagueId);
    if (!league) {
      throw new BadRequestError('League not found');
    }

    // Check permissions
    const hasPermission = await AuthorizationService.hasClubModerationPermission(userId, league.club.toString());
    if (!hasPermission) {
      throw new AuthorizationError('Only club moderators can undo player removals');
    }

    if (!league.removedPlayers || league.removedPlayers.length === 0) {
      throw new BadRequestError('No removed players found');
    }

    // Check if removal exists
    if (removalIndex < 0 || removalIndex >= league.removedPlayers.length) {
      throw new BadRequestError('Invalid removal index');
    }

    const removal = league.removedPlayers[removalIndex];

    // Check if player is already back in the league
    const existingPlayer = league.players.find((p: any) => this.getPlayerId(p.player) === playerId);
    if (existingPlayer) {
      throw new BadRequestError('Player is already in the league');
    }

    // Re-add player to the league with their full previous data
    league.players.push({
      player: removal.player,
      totalPoints: removal.totalPoints,
      tournamentPoints: removal.tournamentPoints,
      manualAdjustments: removal.manualAdjustments
    });

    // Remove from removedPlayers history
    league.removedPlayers.splice(removalIndex, 1);

    return await league.save();
  }

  /**
   * Find league by tournament ID
   */
  static async findLeagueByTournament(tournamentId: string): Promise<LeagueDocument | null> {
    await connectMongo();

    return await LeagueModel.findOne({
      attachedTournaments: tournamentId,
      isActive: true
    });
  }
}
