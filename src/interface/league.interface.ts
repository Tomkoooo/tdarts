import { mongoose } from 'mongoose';

// Liga alapadatok
export interface ILeague {
  _id: string;
  name: string;
  description?: string;
  clubId: string;
  createdBy: string;
  isActive: boolean;
  
  // Pontozási rendszer
  scoringSystem: {
    groupStage: {
      eliminated: number;
    };
    knockoutStage: {
      round1: number;
      round2: number;
      round3: number;
      quarterFinal: number;
      semiFinal: number;
      finalist: number;
      winner: number;
    };
  };
  
  // Liga beállítások
  settings: {
    allowManualPoints: boolean;
    allowExistingPoints: boolean;
    autoCalculateStandings: boolean;
  };
  
  // Kapcsolódó versenyek
  tournaments: string[];
  
  createdAt: string;
  updatedAt: string;
}

// Liga állás
export interface ILeagueStanding {
  _id: string;
  leagueId: string;
  playerId: string;
  clubId: string;
  
  // Pontok és helyezés
  totalPoints: number;
  tournamentsPlayed: number;
  bestFinish: number;
  
  // Részletes pontok
  pointsBreakdown: {
    groupStage: number;
    knockoutStage: number;
    manual: number;
    existing: number;
  };
  
  // Helyezések
  finishes: {
    first: number;
    second: number;
    third: number;
    top5: number;
    top10: number;
  };
  
  // Utolsó frissítés
  lastUpdated: string;
  
  createdAt: string;
  updatedAt: string;
}

// Liga verseny
export interface ILeagueTournament {
  _id: string;
  leagueId: string;
  tournamentId: string;
  clubId: string;
  
  // Verseny állapota a ligában
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  
  // Pontok kiosztva-e
  pointsDistributed: boolean;
  pointsDistributedAt?: string;
  
  // Verseny eredmények
  results: {
    playerId: string;
    finish: number;
    points: number;
    stage: 'group' | 'knockout' | 'final';
    knockoutRound?: number;
  }[];
  
  // Meta információk
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Liga létrehozás adatok
export interface CreateLeagueData {
  name: string;
  description?: string;
  clubId: string;
  scoringSystem?: {
    groupStage?: {
      eliminated?: number;
    };
    knockoutStage?: {
      round1?: number;
      round2?: number;
      round3?: number;
      quarterFinal?: number;
      semiFinal?: number;
      finalist?: number;
      winner?: number;
    };
  };
  settings?: {
    allowManualPoints?: boolean;
    allowExistingPoints?: boolean;
    autoCalculateStandings?: boolean;
  };
}

// Liga frissítés adatok
export interface UpdateLeagueData {
  name?: string;
  description?: string;
  isActive?: boolean;
  scoringSystem?: {
    groupStage?: {
      eliminated?: number;
    };
    knockoutStage?: {
      round1?: number;
      round2?: number;
      round3?: number;
      quarterFinal?: number;
      semiFinal?: number;
      finalist?: number;
      winner?: number;
    };
  };
  settings?: {
    allowManualPoints?: boolean;
    allowExistingPoints?: boolean;
    autoCalculateStandings?: boolean;
  };
}

// Pontok hozzáadása
export interface AddPointsData {
  playerId: string;
  points: number;
  type: 'manual' | 'existing';
  notes?: string;
}

// Verseny eredmény hozzáadása
export interface AddTournamentResultData {
  tournamentId: string;
  results: {
    playerId: string;
    finish: number;
    stage: 'group' | 'knockout' | 'final';
    knockoutRound?: number;
  }[];
  notes?: string;
}
