import mongoose from "mongoose";

export interface TournamentHistory {
  tournamentId: string;
  tournamentName: string;
  isVerified: boolean;
  position: number;
  eliminatedIn: string;
  stats: {
    matchesWon: number;
    matchesLost: number;
    legsWon: number;
    legsLost: number;
    oneEightiesCount: number;
    highestCheckout: number;
    average: number;
    firstNineAvg?: number;
  };
  date: Date;
  verified: boolean;
  mmrChange?: number;
  oacMmrChange?: number;
}

export interface PlayerHonor {
  title: string;
  year: number;
  type: 'rank' | 'tournament' | 'special';
  description?: string;
}

export interface PlayerSeasonStats {
  year: number;
  stats: {
    tournamentsPlayed: number;
    matchesPlayed: number;
    legsWon: number;
    legsLost: number;
    avg: number;
    firstNineAvg?: number;
    oneEightiesCount: number;
    highestCheckout: number;
    averagePosition: number;
    bestPosition: number;
    totalMatchesWon: number;
    totalMatchesLost: number;
    totalLegsWon: number;
    totalLegsLost: number;
    total180s: number;
    mmr: number;
    oacMmr: number;
  };
  snapshotDate: Date;
  tournamentHistory?: TournamentHistory[];
}

export interface PlayerStatistics {
  tournamentsPlayed: number;
  bestPosition: number;
  totalMatchesWon: number;
  totalMatchesLost: number;
  totalLegsWon: number;
  totalLegsLost: number;
  total180s: number;
  highestCheckout: number;
  averagePosition: number;
  mmr: number;
  oacMmr: number;
}

export interface PlayerDocument {
  _id: mongoose.Types.ObjectId;
  userRef?: string;
  name: string;
  type?: 'individual' | 'pair' | 'team';
  members?: string[] | PlayerDocument[];
  isRegistered?: boolean;
  stats: {
    tournamentsPlayed: number;
    matchesPlayed: number;
    legsWon: number;
    legsLost: number;
    avg: number;
    firstNineAvg?: number;
    last10ClosedAvg?: number;
    oneEightiesCount: number;
    highestCheckout: number;
    averagePosition: number;
    bestPosition: number;
    totalMatchesWon: number;
    totalMatchesLost: number;
    totalLegsWon: number;
    totalLegsLost: number;
    total180s: number;
    mmr: number;
    oacMmr: number;
  };
  tournamentHistory?: TournamentHistory[];
  honors?: PlayerHonor[];
  previousSeasons?: PlayerSeasonStats[];
  profilePicture?: string;
  publicConsent?: boolean;
  country?: string;
}

export interface Player {
  _id: string;
  name: string;
  type?: 'individual' | 'pair' | 'team';
  members?: Partial<Player>[];
  stats: {
    tournamentsPlayed: number;
    matchesPlayed: number;
    legsWon: number;
    legsLost: number;
    avg: number;
    firstNineAvg?: number;
    last10ClosedAvg?: number;
    oneEightiesCount: number;
    highestCheckout: number;
    averagePosition: number;
    bestPosition: number;
    totalMatchesWon: number;
    totalMatchesLost: number;
    totalLegsWon: number;
    totalLegsLost: number;
    total180s: number;
    mmr: number;
    oacMmr: number;
  };
  tournamentHistory?: TournamentHistory[];
  statistics?: PlayerStatistics;
  honors?: PlayerHonor[];
  previousSeasons?: PlayerSeasonStats[];
  profilePicture?: string;
  publicConsent?: boolean;
  country?: string;
}
