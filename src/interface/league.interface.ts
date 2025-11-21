import { Document, Types } from 'mongoose';
import { PlayerDocument } from './player.interface';
import { TournamentDocument } from './tournament.interface';

// Point System Type
export type PointSystemType = 'platform' | 'remiz_christmas';

// League Points Configuration Interface
export interface LeaguePointsConfig {
  // Fixed points for players eliminated in group stage
  groupDropoutPoints: number;
  
  // Base points for the lowest knockout round (e.g., first round loser)
  knockoutBasePoints: number;
  
  // Geometric multiplier for knockout progression (e.g., 1.5)
  knockoutMultiplier: number;
  
  // Extra bonus points added to winner (on top of highest geometric value)
  winnerBonus: number;
  
  // Maximum knockout rounds to consider (e.g., 5 for up to 5 rounds + winner)
  maxKnockoutRounds: number;
  
  // Alternative: Fixed rank-based points (if not using geometric progression)
  fixedRankPoints?: { [rank: number]: number }; // e.g., {1: 100, 2: 80, 3: 60, ...}
  
  // Whether to use fixed rank points or geometric progression
  useFixedRanks: boolean;
}

// League Player with Points Breakdown
export interface LeaguePlayer {
  player: string | PlayerDocument; // Reference to Player document
  totalPoints: number; // Cumulative points across all tournaments
  tournamentPoints: Array<{
    tournament: string | TournamentDocument; // Reference to Tournament
    points: number; // Points earned from this tournament
    position: number; // Final position in tournament
    eliminatedIn: string; // Stage eliminated ('group' | 'round-1' | 'round-2' | etc.)
  }>;
  manualAdjustments: Array<{
    points: number; // Positive or negative adjustment
    reason: string; // Reason for manual adjustment
    adjustedBy: string; // User ID who made the adjustment
    adjustedAt: Date;
  }>;
}

// Main League Interface
export interface League {
  _id?: string;
  name: string;
  description?: string;
  club: string | Document; // Reference to Club
  attachedTournaments: Array<string | TournamentDocument>; // Array of tournament references
  players: LeaguePlayer[]; // Array of players with their points
  removedPlayers?: Array<{
    player: string | PlayerDocument; // Reference to removed player
    totalPoints: number; // Total points when removed
    tournamentPoints: Array<{
      tournament: string | TournamentDocument;
      points: number;
      position: number;
      eliminatedIn: string;
    }>;
    manualAdjustments: Array<{
      points: number;
      reason: string;
      adjustedBy: string;
      adjustedAt: Date;
    }>;
    reason: string; // Reason for removal
    removedBy: string; // User ID who removed the player
    removedAt: Date;
  }>;
  pointsConfig: LeaguePointsConfig; // Point calculation configuration
  pointSystemType: PointSystemType; // Type of point system to use
  createdBy: string; // User ID of creator (must be moderator)
  isActive: boolean; // Whether league is currently active
  startDate?: Date; // Optional league start date
  endDate?: Date; // Optional league end date
  createdAt?: Date;
  updatedAt?: Date;
}

// Mongoose Document Interface
export interface LeagueDocument extends Document, Omit<League, '_id' | 'club' | 'attachedTournaments' | 'players' | 'removedPlayers'> {
  _id: Types.ObjectId;
  club: Types.ObjectId;
  attachedTournaments: Types.ObjectId[];
  pointSystemType: PointSystemType;
  players: Array<{
    player: Types.ObjectId;
    totalPoints: number;
    tournamentPoints: Array<{
      tournament: Types.ObjectId;
      points: number;
      position: number;
      eliminatedIn: string;
    }>;
    manualAdjustments: Array<{
      points: number;
      reason: string;
      adjustedBy: Types.ObjectId;
      adjustedAt: Date;
    }>;
  }>;
  removedPlayers?: Array<{
    player: Types.ObjectId;
    totalPoints: number;
    tournamentPoints: Array<{
      tournament: Types.ObjectId;
      points: number;
      position: number;
      eliminatedIn: string;
    }>;
    manualAdjustments: Array<{
      points: number;
      reason: string;
      adjustedBy: Types.ObjectId;
      adjustedAt: Date;
    }>;
    reason: string;
    removedBy: Types.ObjectId;
    removedAt: Date;
  }>;
  toJSON: () => League;
}

// Default Points Configuration
export const DEFAULT_LEAGUE_POINTS_CONFIG: LeaguePointsConfig = {
  groupDropoutPoints: 5,
  knockoutBasePoints: 10,
  knockoutMultiplier: 1.5,
  winnerBonus: 20,
  maxKnockoutRounds: 5,
  useFixedRanks: false,
};

// API DTOs for League Management
export interface CreateLeagueRequest {
  name: string;
  description?: string;
  pointsConfig?: Partial<LeaguePointsConfig>;
  pointSystemType?: PointSystemType;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateLeagueRequest {
  name?: string;
  description?: string;
  pointsConfig?: Partial<LeaguePointsConfig>;
  pointSystemType?: PointSystemType;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface AddPlayerToLeagueRequest {
  playerId: string;
}

export interface ManualPointsAdjustmentRequest {
  playerId: string;
  pointsAdjustment: number; // Can be positive or negative
  reason: string;
}

export interface LeagueLeaderboard {
  position: number;
  player: {
    _id: string;
    name: string;
  };
  totalPoints: number;
  tournamentsPlayed: number;
  averagePosition: number;
  bestPosition: number;
  leagueAverage?: number; // Liga átlag a hozzárendelt tornák alapján
  lastTournamentDate?: Date;
}

export interface LeagueStatsResponse {
  league: League;
  leaderboard: LeagueLeaderboard[];
  totalTournaments: number;
  totalPlayers: number;
  averagePointsPerTournament: number;
}
