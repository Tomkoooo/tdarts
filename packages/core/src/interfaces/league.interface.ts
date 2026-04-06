import { Document, Types } from 'mongoose';
import { PlayerDocument } from './player.interface';
import { TournamentDocument } from './tournament.interface';
import { PointSystemId } from '../lib/leaguePointSystems';

// Point System Type
export type PointSystemType = PointSystemId;

// League Points Configuration Interface
export interface LeaguePointsConfig {
  groupDropoutPoints: number;
  knockoutBasePoints: number;
  knockoutMultiplier: number;
  winnerBonus: number;
  maxKnockoutRounds: number;
  fixedRankPoints?: { [rank: number]: number };
  useFixedRanks: boolean;
}

// League Player with Points Breakdown
export interface LeaguePlayer {
  player: string | PlayerDocument;
  totalPoints: number;
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
}

// Main League Interface
export interface League {
  _id?: string;
  name: string;
  description?: string;
  club: string | Document;
  attachedTournaments: Array<string | TournamentDocument>;
  players: LeaguePlayer[];
  removedPlayers?: Array<{
    player: string | PlayerDocument;
    totalPoints: number;
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
    reason: string;
    removedBy: string;
    removedAt: Date;
  }>;
  pointsConfig: LeaguePointsConfig;
  pointSystemType: PointSystemType;
  createdBy: string;
  isActive: boolean;
  verified: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mongoose Document Interface
export interface LeagueDocument extends Omit<Document, 'toJSON'>, Omit<League, '_id' | 'club' | 'attachedTournaments' | 'players' | 'removedPlayers'> {
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
  fixedRankPoints: {
    1: 100,
    2: 80,
    3: 70,
    4: 60,
    8: 40,
    16: 20,
    32: 10,
  },
  useFixedRanks: true,
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
  pointsAdjustment: number;
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
  leagueAverage?: number;
  lastTournamentDate?: Date;
}

export interface LeagueStatsResponse {
  league: League;
  leaderboard: LeagueLeaderboard[];
  totalTournaments: number;
  totalPlayers: number;
  averagePointsPerTournament: number;
}
