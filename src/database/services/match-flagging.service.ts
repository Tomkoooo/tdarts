import { MatchModel } from '../models/match.model';
import { TournamentModel } from '../models/tournament.model';
import { LeagueModel } from '../models/league.model';
import { connectMongo } from '@/lib/mongoose';
import mongoose from 'mongoose';
import { LeagueDocument } from '@/interface/league.interface';

export interface SuspiciousMatchAnalysis {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  player1: { _id: string; name: string };
  player2: { _id: string; name: string };
  manualChangeType?: string | null;
  manualChangedBy?: string;
  manualOverride?: boolean;
  overrideTimestamp?: Date;
  flags: {
    tournamentAppearances: {
      player1: number;
      player2: number;
    };
    leagueAppearances?: {
      player1: number;
      player2: number;
    };
    suspicionReasons: string[];
    suspicionScore: number; // 0-100
  };
}

export class MatchFlaggingService {
  /**
   * Get all matches with manual changes from a tournament
   */
  static async getSuspiciousMatches(
    tournamentId?: string,
    leagueId?: string
  ): Promise<SuspiciousMatchAnalysis[]> {
    await connectMongo();

    const query: any = {
      manualOverride: true,
    };

    if (tournamentId) {
      const tournament = await TournamentModel.findOne({ tournamentId });
      if (tournament) {
        query.tournamentRef = tournament._id;
      }
    } else if (leagueId) {
      // Get all tournaments in the league
      const league = await LeagueModel.findById(leagueId);
      if (league && league.attachedTournaments) {
        query.tournamentRef = { $in: league.attachedTournaments };
      }
    }

    const matches = await MatchModel.find(query)
      .populate('player1.playerId', 'name')
      .populate('player2.playerId', 'name')
      .populate('tournamentRef', 'tournamentId tournamentSettings.name league')
      .sort({ overrideTimestamp: -1 });

    const analyses: SuspiciousMatchAnalysis[] = [];

    for (const match of matches) {
      if (!match.player1?.playerId || !match.player2?.playerId) continue;

      const analysis = await this.analyzeMatchFlags(match._id.toString());
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  /**
   * Analyze a specific match for suspicious patterns
   */
  static async analyzeMatchFlags(
    matchId: string
  ): Promise<SuspiciousMatchAnalysis | null> {
    await connectMongo();

    const match = await MatchModel.findById(matchId)
      .populate('player1.playerId', 'name')
      .populate('player2.playerId', 'name')
      .populate('tournamentRef', 'tournamentId tournamentSettings.name league');

    if (!match || !match.player1?.playerId || !match.player2?.playerId) {
      return null;
    }

    const tournament = match.tournamentRef as any;
    const player1Id = match.player1.playerId as any;
    const player2Id = match.player2.playerId as any;

    // Count appearances in this tournament
    const tournamentAppearances = await this.countPlayerAppearances(
      tournament._id.toString(),
      player1Id._id.toString(),
      player2Id._id.toString()
    );

    // Count appearances across league if this tournament is part of a league
    let leagueAppearances: { player1: number; player2: number } | undefined;
    if (tournament.league) {
      const league = await LeagueModel.findById(tournament.league);
      if (league && league.attachedTournaments) {
        const tournamentIds = league.attachedTournaments.map((t: LeagueDocument) => t.toString());
        leagueAppearances = await this.countPlayerAppearancesAcrossTournaments(
          tournamentIds,
          player1Id._id.toString(),
          player2Id._id.toString()
        );
      }
    }

    // Analyze suspicion
    const suspicionAnalysis = this.calculateSuspicionScore(match, tournamentAppearances);

    return {
      matchId: match._id.toString(),
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.tournamentSettings?.name || 'Unknown',
      player1: { _id: player1Id._id.toString(), name: player1Id.name },
      player2: { _id: player2Id._id.toString(), name: player2Id.name },
      manualChangeType: match.manualChangeType,
      manualChangedBy: match.manualChangedBy?.toString(),
      manualOverride: match.manualOverride,
      overrideTimestamp: match.overrideTimestamp,
      flags: {
        tournamentAppearances,
        leagueAppearances,
        ...suspicionAnalysis,
      },
    };
  }

  /**
   * Count how many times players appear in manual changes within a tournament
   */
  private static async countPlayerAppearances(
    tournamentId: string,
    player1Id: string,
    player2Id: string
  ): Promise<{ player1: number; player2: number }> {
    const tournamentObjId = new mongoose.Types.ObjectId(tournamentId);

    const player1Matches = await MatchModel.countDocuments({
      tournamentRef: tournamentObjId,
      manualOverride: true,
      $or: [
        { 'player1.playerId': new mongoose.Types.ObjectId(player1Id) },
        { 'player2.playerId': new mongoose.Types.ObjectId(player1Id) },
      ],
    });

    const player2Matches = await MatchModel.countDocuments({
      tournamentRef: tournamentObjId,
      manualOverride: true,
      $or: [
        { 'player1.playerId': new mongoose.Types.ObjectId(player2Id) },
        { 'player2.playerId': new mongoose.Types.ObjectId(player2Id) },
      ],
    });

    return {
      player1: player1Matches,
      player2: player2Matches,
    };
  }

  /**
   * Count appearances across multiple tournaments
   */
  private static async countPlayerAppearancesAcrossTournaments(
    tournamentIds: string[],
    player1Id: string,
    player2Id: string
  ): Promise<{ player1: number; player2: number }> {
    const tournamentObjIds = tournamentIds.map((id) => new mongoose.Types.ObjectId(id));

    const player1Matches = await MatchModel.countDocuments({
      tournamentRef: { $in: tournamentObjIds },
      manualOverride: true,
      $or: [
        { 'player1.playerId': new mongoose.Types.ObjectId(player1Id) },
        { 'player2.playerId': new mongoose.Types.ObjectId(player1Id) },
      ],
    });

    const player2Matches = await MatchModel.countDocuments({
      tournamentRef: { $in: tournamentObjIds },
      manualOverride: true,
      $or: [
        { 'player1.playerId': new mongoose.Types.ObjectId(player2Id) },
        { 'player2.playerId': new mongoose.Types.ObjectId(player2Id) },
      ],
    });

    return {
      player1: player1Matches,
      player2: player2Matches,
    };
  }

  /**
   * Calculate suspicion score based on various factors
   */
  private static calculateSuspicionScore(
    match: any,
    appearances: { player1: number; player2: number }
  ): { suspicionReasons: string[]; suspicionScore: number } {
    const reasons: string[] = [];
    let score = 0;

    // Base score for any manual change
    score += 10;

    // Check for winner override (highest suspicion)
    if (match.manualChangeType === 'winner_override') {
      reasons.push('Winner changed after match was finished');
      score += 40;
    }

    // Check if manual finish without legs
    if (match.manualChangeType === 'admin_finish' && (!match.legs || match.legs.length === 0)) {
      reasons.push('Match finished manually without leg data');
      score += 30;
    }

    // Check for state changes
    if (match.manualChangeType === 'admin_state_change') {
      reasons.push('Match state manually changed by admin');
      score += 20;
    }

    // Check for repeated manual involvement
    const maxAppearances = Math.max(appearances.player1, appearances.player2);
    if (maxAppearances > 3) {
      reasons.push(`Player appears in ${maxAppearances} manually changed matches in this tournament`);
      score += Math.min(30, maxAppearances * 5);
    } else if (maxAppearances > 1) {
      reasons.push(`Player appears in ${maxAppearances} manually changed matches`);
      score += maxAppearances * 10;
    }

    // Check if both players have multiple appearances
    if (appearances.player1 > 1 && appearances.player2 > 1) {
      reasons.push('Both players involved in multiple manual changes');
      score += 15;
    }

    // Cap score at 100
    score = Math.min(100, score);

    return { suspicionReasons: reasons, suspicionScore: score };
  }
}
